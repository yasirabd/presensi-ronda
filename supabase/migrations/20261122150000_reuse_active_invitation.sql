create or replace function public.invite_resident(target uuid, recipient text) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 result uuid;
 address text:=lower(trim(recipient));
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 then raise exception 'Masukkan alamat email warga yang valid.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws(':','invitation',target,address),0));
 if exists(select 1 from public.memberships where rt_id=target and lower(email)=address)
 then raise exception 'Warga dengan email ini sudah bergabung.'; end if;
 select token into result from public.invites
 where rt_id=target and email=address and expires_at>now()
 order by expires_at desc,token limit 1;
 if result is null then
   insert into public.invites(rt_id,email) values(target,address) returning token into result;
 end if;
 return result;
end $$;
