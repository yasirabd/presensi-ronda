alter table public.shifts add column attendance_day date;
create unique index shifts_walk_in_day on public.shifts(rt_id,user_id,attendance_day)
where attendance_day is not null;

create function public.start_attendance(target uuid, lat double precision, lon double precision,
  accuracy_m double precision, sampled_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid();
  room public.communities;
  day_key date;
  duty_id uuid;
  result jsonb;
begin
  select c.* into room from public.communities c
  join public.memberships m on m.rt_id=c.id
  where c.id=target and m.user_id=actor;
  if not found then raise exception 'Anda bukan anggota RT ini.'; end if;
  if not exists(select 1 from ronda_private.face_profiles where rt_id=target and user_id=actor and ciphertext is not null)
    then raise exception 'Daftarkan wajah Anda terlebih dahulu.'; end if;

  day_key:=(now() at time zone room.zone)::date;
  perform pg_advisory_xact_lock(hashtextextended(target::text || ':' || actor::text,0));
  select id into duty_id from public.shifts
    where rt_id=target and user_id=actor and attendance_day=day_key for update;
  if found then
    if exists(select 1 from public.attendance_changes where shift_id=duty_id) then
      return jsonb_build_object('status','already_recorded');
    end if;
    update public.shifts set post=room.name,starts_at=now(),ends_at=now()+interval '2 minutes'
      where id=duty_id;
  else
    insert into public.shifts(rt_id,user_id,post,starts_at,ends_at,attendance_day)
    values(target,actor,room.name,now(),now()+interval '2 minutes',day_key)
    returning id into duty_id;
  end if;
  result:=public.check_shift_location(duty_id,lat,lon,accuracy_m,sampled_at);
  if result->>'status'<>'inside' then
    delete from public.shifts where id=duty_id;
    return result;
  end if;
  return result || jsonb_build_object('shift_id',duty_id);
end $$;
revoke all on function public.start_attendance(uuid,double precision,double precision,double precision,timestamptz) from public,anon;
grant execute on function public.start_attendance(uuid,double precision,double precision,double precision,timestamptz) to authenticated;

-- Keep scheduled history and real check-ins, while omitting attempts without attendance.
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
    where (c.id is not null or (s.attendance_day is null and s.ends_at<=now())) and s.rt_id=target and s.starts_at>=period_start and s.starts_at<period_end
  ) rows);
end $$;
create or replace function public.my_schedule(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by starts_at desc),'[]'::jsonb) from (
 select s.id,s.post,s.starts_at,s.ends_at,c.recorded_at,
 case when c.method='face' then 'Hadir (wajah dan lokasi)' when c.present then 'Hadir manual'
      when c.present=false or ends_at<=now() then 'Tidak hadir' else 'Belum absen' end as status
 from public.shifts s left join lateral (select * from public.attendance_changes where shift_id=s.id order by id desc limit 1)c on true
 where (c.id is not null or (s.attendance_day is null and s.ends_at<=now())) and s.rt_id=target and s.user_id=auth.uid() and s.starts_at<=now() order by starts_at desc limit 100
 )r
$$;
