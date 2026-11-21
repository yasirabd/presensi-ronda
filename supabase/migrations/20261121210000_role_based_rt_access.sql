create or replace function public.manages_rt(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
   select 1 from public.memberships
   where rt_id=target and user_id=auth.uid() and role in ('owner','manager')
 )
$$;
