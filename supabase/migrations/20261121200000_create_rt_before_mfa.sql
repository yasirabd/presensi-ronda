create or replace function public.create_rt(label text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Silakan masuk terlebih dahulu'; end if;
 insert into public.communities(name) values(trim(label)) returning id into result;
 insert into public.memberships(rt_id,user_id,email,role) values(result,auth.uid(),auth.jwt()->>'email','owner');
 return result;
end $$;
