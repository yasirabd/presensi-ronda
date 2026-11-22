-- The public registration screen only needs a yes/no answer. Recipient details
-- stay in the authenticated invitation flow.
create function public.whatsapp_invite_available(code uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from public.invites
   where token=code and whatsapp is not null and expires_at>now()
 );
$$;
revoke all on function public.whatsapp_invite_available(uuid) from public,anon,authenticated;
grant execute on function public.whatsapp_invite_available(uuid) to anon,authenticated;
