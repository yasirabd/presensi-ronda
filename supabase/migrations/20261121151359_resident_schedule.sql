alter table public.communities add column zone text not null default 'Asia/Jakarta'
 check(zone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura'));
grant update(zone) on public.communities to authenticated;

create function public.preview_invite(code uuid) returns text language sql stable security definer set search_path='' as $$
 select c.name from public.invites i join public.communities c on c.id=i.rt_id
 where i.token=code and i.expires_at>now() and i.email=lower(auth.jwt()->>'email')
$$;
create function public.my_schedule(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by starts_at desc),'[]'::jsonb) from (
 select s.id,s.post,s.starts_at,s.ends_at,c.recorded_at,
 case when c.method='face' then 'Hadir (wajah dan lokasi)' when c.present then 'Hadir manual'
      when c.present=false or ends_at<=now() then 'Tidak hadir' else 'Belum absen' end as status
 from public.shifts s left join lateral (select * from public.attendance_changes where shift_id=s.id order by id desc limit 1)c on true
 where s.rt_id=target and s.user_id=auth.uid() and s.starts_at<=now() order by starts_at desc limit 100
 )r
$$;
create function public.revise_shift(target uuid, shift_key uuid, member uuid, pos text, start_time timestamptz, end_time timestamptz) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 update public.shifts set user_id=member,post=trim(pos),starts_at=start_time,ends_at=end_time
 where rt_id=target and id=shift_key and starts_at>now() and start_time>now();
 if not found then raise exception 'Hanya jadwal mendatang yang bisa diubah'; end if;
end $$;
revoke all on function public.preview_invite(uuid),public.my_schedule(uuid),public.revise_shift(uuid,uuid,uuid,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.preview_invite(uuid),public.my_schedule(uuid),public.revise_shift(uuid,uuid,uuid,text,timestamptz,timestamptz) to authenticated;
