create table public.attendance_changes (
  id bigint generated always as identity primary key,
  shift_id uuid not null references public.shifts on delete cascade,
  present boolean not null,
  reason text not null check (length(trim(reason)) between 1 and 500),
  actor uuid not null,
  recorded_at timestamptz not null default clock_timestamp()
);
create index attendance_latest on public.attendance_changes (shift_id, id desc);
alter table public.attendance_changes enable row level security;
revoke all on public.attendance_changes from public, anon, authenticated;

create function public.record_attendance(target uuid, shift_key uuid, attended boolean, explanation text, previous_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare last_change public.attendance_changes;
begin
  if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
  perform 1 from public.shifts where rt_id=target and id=shift_key and starts_at<=now()
    and (attended or ends_at<=now()) for update;
  if not found then raise exception 'Giliran belum dapat dicatat atau tidak ditemukan'; end if;
  select * into last_change from public.attendance_changes where shift_id=shift_key order by id desc limit 1;
  if last_change.present=attended and last_change.reason=trim(explanation) and last_change.actor=auth.uid() then return; end if;
  if last_change.id is distinct from previous_id then raise exception 'Catatan sudah berubah. Muat ulang rekap.'; end if;
  insert into public.attendance_changes(shift_id,present,reason,actor)
  values(shift_key,attended,trim(explanation),auth.uid());
end $$;

create function public.attendance_report(target uuid, period_start timestamptz, period_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
  if period_end<=period_start or period_end-period_start>interval '32 days' then raise exception 'Rentang tanggal tidak sesuai'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(rows) order by rows.starts_at,rows.id),'[]'::jsonb) from (
    select s.id,s.post,s.starts_at,s.ends_at,m.email,c.id::text as change_id,c.reason,c.recorded_at,
      case when c.present then 'Hadir manual' when c.present=false or s.ends_at<=now() then 'Tidak hadir' else 'Belum absen' end as status
    from public.shifts s join public.memberships m using(rt_id,user_id)
    left join lateral (select * from public.attendance_changes where shift_id=s.id order by id desc limit 1) c on true
    where s.rt_id=target and s.starts_at>=period_start and s.starts_at<period_end
  ) rows);
end $$;
revoke all on function public.record_attendance(uuid,uuid,boolean,text,bigint), public.attendance_report(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.record_attendance(uuid,uuid,boolean,text,bigint), public.attendance_report(uuid,timestamptz,timestamptz) to authenticated;
