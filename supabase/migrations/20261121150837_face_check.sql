create schema if not exists ronda_private;
revoke all on schema ronda_private from public,anon,authenticated;
create extension if not exists pgcrypto with schema extensions;
create table ronda_private.face_secret (id boolean primary key check(id), secret bytea not null);
insert into ronda_private.face_secret values(true,extensions.gen_random_bytes(32));
create table ronda_private.face_profiles (
 rt_id uuid not null, user_id uuid not null, approval uuid not null default gen_random_uuid(),
 ciphertext text, consent_at timestamptz, primary key(rt_id,user_id),
 foreign key(rt_id,user_id) references public.memberships on delete cascade
);
create function public.allow_face_registration(target uuid, member uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 insert into ronda_private.face_profiles(rt_id,user_id) values(target,member) on conflict do nothing;
end $$;
create function public.face_status(target uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select case when ciphertext is null then 'approved' else 'ready' end from ronda_private.face_profiles where rt_id=target and user_id=auth.uid()),'pending')
$$;
create function public.withdraw_face(target uuid) returns void language sql security definer set search_path='' as $$
 delete from ronda_private.face_profiles where rt_id=target and user_id=auth.uid()
$$;
alter table public.attendance_changes add column method text not null default 'manual' check(method in ('manual','face'));
create unique index one_face_check_per_shift on public.attendance_changes(shift_id) where method='face';

-- The verifier signs the exact payload text. The API user also needs a matching Supabase JWT.
create function public.face_operation(payload text, signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 msg jsonb:=payload::jsonb;
 profile ronda_private.face_profiles;
 duty public.shifts;
 actor uuid:=auth.uid();
 target uuid:=(msg->>'rt')::uuid;
begin
 if signature is null or actor is null or actor is distinct from (msg->>'user')::uuid or
    coalesce((msg->>'expires')::bigint,0) not between extract(epoch from now()) and extract(epoch from now())+90 or
    signature is distinct from (select encode(extensions.hmac(convert_to(payload,'UTF8'),secret,'sha256'),'hex') from ronda_private.face_secret where id)
 then raise exception 'Permintaan verifikasi tidak berlaku'; end if;
 select * into strict profile from ronda_private.face_profiles where rt_id=target and user_id=actor for update;
 if msg->>'action'='read' then return jsonb_build_object('version',profile.approval,'template',profile.ciphertext); end if;
 if profile.approval is distinct from (msg->>'version')::uuid then raise exception 'Pendaftaran wajah telah berubah'; end if;
 if msg->>'action'='enroll' and profile.ciphertext is null and length(msg->>'template') between 100 and 4096 then
   update ronda_private.face_profiles set ciphertext=msg->>'template',consent_at=now() where rt_id=target and user_id=actor;
 elsif msg->>'action'='verify' and profile.ciphertext is not null then
   select * into strict duty from public.shifts where id=(msg->>'shift')::uuid and rt_id=target and user_id=actor and starts_at<=now() and ends_at>now() for update;
   delete from public.location_checks where shift_id=duty.id and session_id=(msg->>'session')::uuid and expires_at>now();
   if not found then raise exception 'Periksa ulang lokasi Anda'; end if;
   if exists(select 1 from public.attendance_changes where shift_id=duty.id) then raise exception 'Giliran sudah dicatat. Hubungi pengurus untuk koreksi.'; end if;
   insert into public.attendance_changes(shift_id,present,reason,actor,method) values(duty.id,true,'Wajah dan lokasi terverifikasi',actor,'face');
 else raise exception 'Status pendaftaran tidak sesuai'; end if;
 return jsonb_build_object('time',now());
end $$;
revoke all on function public.face_operation(text,text),public.allow_face_registration(uuid,uuid),public.withdraw_face(uuid),public.face_status(uuid) from public,anon;
grant execute on function public.face_operation(text,text),public.allow_face_registration(uuid,uuid),public.withdraw_face(uuid),public.face_status(uuid) to authenticated;
create or replace function public.attendance_report(target uuid, period_start timestamptz, period_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
  if period_end<=period_start or period_end-period_start>interval '32 days' then raise exception 'Rentang tanggal tidak sesuai'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(rows) order by rows.starts_at,rows.id),'[]'::jsonb) from (
    select s.id,s.post,s.starts_at,s.ends_at,m.email,c.id::text as change_id,c.reason,c.recorded_at,
      case when c.method='face' then 'Hadir (wajah dan lokasi)' when c.present then 'Hadir manual' when c.present=false or s.ends_at<=now() then 'Tidak hadir' else 'Belum absen' end as status
    from public.shifts s join public.memberships m using(rt_id,user_id)
    left join lateral (select * from public.attendance_changes where shift_id=s.id order by id desc limit 1) c on true
    where s.rt_id=target and s.starts_at>=period_start and s.starts_at<period_end
  ) rows);
end $$;
