alter table public.memberships
 add column resident_name text check(resident_name=trim(resident_name) and length(resident_name) between 1 and 120),
 add column home_address text check(home_address=trim(home_address) and length(home_address) between 1 and 300);
alter table public.communities add column region jsonb;

create function public.save_resident_profile(target uuid, member uuid, full_name text, address text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or (member is distinct from auth.uid() and not public.manages_rt(target))
 then raise exception 'Akses ditolak'; end if;
 if coalesce(length(trim(full_name)),0) not between 1 and 120 or
    coalesce(length(trim(address)),0) not between 1 and 300
 then raise exception 'Isi nama dan alamat rumah.'; end if;
 update public.memberships set resident_name=trim(full_name),home_address=trim(address)
 where rt_id=target and user_id=member;
 if not found then raise exception 'Warga tidak ditemukan di RT ini.'; end if;
end $$;

create function public.save_rt_region(target uuid, details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item text;
code text;
village_code text:=details#>>'{village,id}';
cleaned jsonb:=jsonb_build_object('rt',details->>'rt','rw',details->>'rw');
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 if coalesce(details->>'rt','') !~ '^[0-9]{1,3}$' or coalesce(details->>'rw','') !~ '^[0-9]{1,3}$' or
    coalesce(village_code,'') !~ '^[0-9]{2}[.][0-9]{2}[.][0-9]{2}[.][0-9]{4}$'
 then raise exception 'Lengkapi nomor RT, RW, dan wilayah.'; end if;
 foreach item in array array['province','regency','district','village'] loop
   code:=details#>>array[item,'id'];
   if code is distinct from left(village_code, case item when 'province' then 2 when 'regency' then 5 when 'district' then 8 else 13 end)
      or coalesce(length(trim(details#>>array[item,'name'])),0) not between 1 and 120
   then raise exception 'Pilihan wilayah tidak sesuai.'; end if;
   cleaned:=cleaned || jsonb_build_object(item,jsonb_build_object('id',code,'name',trim(details#>>array[item,'name'])));
 end loop;
 update public.communities set region=cleaned where id=target;
end $$;

create function public.create_rt_with_region(details jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare room uuid;
begin
 room:=public.create_rt('RT '||(details->>'rt')||' / RW '||(details->>'rw'));
 perform public.save_rt_region(room,details);
 return room;
end $$;

create function public.resident_face_statuses(target uuid)
returns table(user_id uuid,status text) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 return query select m.user_id,case when p.ciphertext is not null then 'ready'
   when p.approval is not null then 'approved' else 'pending' end
 from public.memberships m left join ronda_private.face_profiles p using(rt_id,user_id)
 where m.rt_id=target;
end $$;

create or replace function public.allow_face_registration(target uuid, member uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 if not exists(select 1 from public.memberships where rt_id=target and user_id=member
   and resident_name is not null and home_address is not null)
 then raise exception 'Lengkapi data warga sebelum mengizinkan pendaftaran wajah.'; end if;
 insert into ronda_private.face_profiles(rt_id,user_id) values(target,member) on conflict do nothing;
end $$;

create function ronda_private.require_profile_for_face()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.ciphertext is not null and old.ciphertext is null and
    not exists(select 1 from public.memberships where rt_id=new.rt_id and user_id=new.user_id
      and resident_name is not null and home_address is not null)
 then raise exception 'Lengkapi data warga sebelum mendaftarkan wajah.'; end if;
 return new;
end $$;
create trigger require_profile_for_face before update of ciphertext on ronda_private.face_profiles
for each row execute function ronda_private.require_profile_for_face();

revoke all on function public.save_resident_profile(uuid,uuid,text,text), public.save_rt_region(uuid,jsonb),
 public.create_rt_with_region(jsonb), public.resident_face_statuses(uuid) from public,anon;
grant execute on function public.save_resident_profile(uuid,uuid,text,text), public.save_rt_region(uuid,jsonb),
 public.create_rt_with_region(jsonb), public.resident_face_statuses(uuid) to authenticated;

create or replace function public.attendance_report(target uuid, period_start timestamptz, period_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
  if period_end<=period_start or period_end-period_start>interval '32 days' then raise exception 'Rentang tanggal tidak sesuai'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(rows) order by rows.starts_at,rows.id),'[]'::jsonb) from (
    select s.id,s.post,s.starts_at,s.ends_at,m.resident_name,c.id::text as change_id,c.reason,c.recorded_at,
      case when c.method='face' then 'Hadir (wajah dan lokasi)' when c.present then 'Hadir manual' when c.present=false or s.ends_at<=now() then 'Tidak hadir' else 'Belum absen' end as status
    from public.shifts s join public.memberships m using(rt_id,user_id)
    left join lateral (select * from public.attendance_changes where shift_id=s.id order by id desc limit 1) c on true
    where (c.id is not null or (s.attendance_day is null and s.ends_at<=now())) and s.rt_id=target and s.starts_at>=period_start and s.starts_at<period_end
  ) rows);
end $$;

create or replace function public.preview_invite(code uuid) returns text language sql stable security definer set search_path='' as $$
 select concat_ws(' · ', c.name, c.region#>>'{village,name}', c.region#>>'{district,name}', c.region#>>'{regency,name}')
 from public.invites i join public.communities c on c.id=i.rt_id
 where i.token=code and i.expires_at>now() and i.email=lower(auth.jwt()->>'email')
$$;
