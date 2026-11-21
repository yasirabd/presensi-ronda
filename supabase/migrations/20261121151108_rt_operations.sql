alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add check(role in ('owner','manager','resident'));
alter table public.communities add column privacy_contact text check(length(privacy_contact)<=200);
create or replace function public.manages_rt(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal'='aal2',false) and exists(select 1 from public.memberships where rt_id=target and user_id=auth.uid() and role in ('owner','manager'))
$$;
create function public.set_rt_role(target uuid, member uuid, new_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.communities where id=target for update;
 if not public.manages_rt(target) or not exists(select 1 from public.memberships where rt_id=target and user_id=auth.uid() and role='owner') or member=auth.uid() then raise exception 'Akses ditolak'; end if;
 if new_role not in ('owner','manager','resident') or new_role is null then raise exception 'Peran tidak valid'; end if;
 update public.memberships set role=new_role where rt_id=target and user_id=member and role<>'owner';
 if not found then raise exception 'Anggota tidak ditemukan'; end if;
 if new_role='owner' then update public.memberships set role='manager' where rt_id=target and user_id=auth.uid(); end if;
end $$;
grant update(privacy_contact) on public.communities to authenticated;
create policy edit_contact on public.communities for update to authenticated using(public.manages_rt(id)) with check(public.manages_rt(id));
create policy manage_invites_read on public.invites for select to authenticated using(public.manages_rt(rt_id));
create policy manage_invites_delete on public.invites for delete to authenticated using(public.manages_rt(rt_id));
grant select,delete on public.invites to authenticated;

create table public.privacy_requests (
 id uuid primary key default gen_random_uuid(), rt_id uuid not null, user_id uuid not null default auth.uid(),
 kind text not null check(kind in ('Akses','Koreksi','Penghapusan')), details text not null check(length(trim(details)) between 1 and 500),
 created_at timestamptz not null default now(), resolution text check(length(trim(resolution)) between 1 and 500),
 resolved_at timestamptz, resolved_by uuid, foreign key(rt_id,user_id) references public.memberships on delete cascade
);
alter table public.privacy_requests enable row level security;
revoke all on public.privacy_requests from public,anon,authenticated;
grant select,insert(rt_id,kind,details) on public.privacy_requests to authenticated;
create policy privacy_request_create on public.privacy_requests for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.memberships m where m.rt_id=privacy_requests.rt_id and m.user_id=auth.uid()));
create policy privacy_request_read on public.privacy_requests for select to authenticated using(user_id=auth.uid() or public.manages_rt(rt_id));
create function public.resolve_privacy_request(target uuid, answer text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.privacy_requests set resolution=answer,resolved_at=now(),resolved_by=auth.uid()
 where id=target and resolved_at is null and public.manages_rt(rt_id) and length(trim(answer)) between 1 and 500;
 if not found then raise exception 'Permintaan tidak tersedia'; end if;
end $$;
revoke all on function public.resolve_privacy_request(uuid,text),public.set_rt_role(uuid,uuid,text) from public,anon;
grant execute on function public.resolve_privacy_request(uuid,text),public.set_rt_role(uuid,uuid,text) to authenticated;
create function ronda_private.apply_retention() returns void language plpgsql set search_path='' as $$
begin
 delete from public.location_checks where expires_at<=now();
 delete from public.invites where expires_at<=now();
 delete from public.shifts where ends_at<now()-interval '12 months';
end $$;
revoke all on function ronda_private.apply_retention() from public,anon,authenticated;
