create or replace function public.check_shift_location(shift_key uuid, lat double precision, lon double precision,
  accuracy_m double precision, sampled_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  duty public.shifts;
  pos public.post_locations;
  distance_m double precision;
  session_key uuid;
begin
  select * into duty from public.shifts where id=shift_key and user_id=auth.uid()
    and now()>=starts_at and now()<ends_at for update;
  if not found then raise exception 'Giliran Anda belum aktif atau sudah selesai.'; end if;
  delete from public.location_checks where shift_id=shift_key;
  select * into pos from public.post_locations where rt_id=duty.rt_id and post=duty.post;
  if not found then
    select locations.* into pos
    from public.post_locations locations
    join public.communities rt on rt.id=locations.rt_id and rt.name=locations.post
    where locations.rt_id=duty.rt_id;
    if not found then raise exception 'Pengurus perlu mengatur titik lokasi pos ini.'; end if;
  end if;
  if sampled_at is null or sampled_at not between now()-interval '30 seconds' and now()+interval '5 seconds'
    then raise exception 'Lokasi kedaluwarsa. Coba periksa lagi.'; end if;
  if lat is null or lat not between -90 and 90 or lon is null or lon not between -180 and 180
    or accuracy_m is null or accuracy_m not between 0.01 and 50 then
    return jsonb_build_object('status','uncertain');
  end if;
  distance_m := 12742000 * asin(sqrt(least(1.0,
    sin(radians(lat-pos.latitude)/2)^2 + cos(radians(lat))*cos(radians(pos.latitude))*sin(radians(lon-pos.longitude)/2)^2)));
  if distance_m-accuracy_m>pos.radius_m then return jsonb_build_object('status','outside'); end if;
  if distance_m+accuracy_m>pos.radius_m then return jsonb_build_object('status','uncertain'); end if;
  session_key := gen_random_uuid();
  insert into public.location_checks values(shift_key,session_key,least(duty.ends_at,now()+interval '2 minutes'));
  return jsonb_build_object('status','inside','session_id',session_key);
end $$;
