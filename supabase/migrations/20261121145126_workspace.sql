create table public.communities (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120)
);
create table public.memberships (
 rt_id uuid references public.communities on delete cascade, user_id uuid references auth.users on delete cascade,
 email text not null, role text not null check(role in ('owner','resident')), primary key(rt_id,user_id)
);
create table public.invites (
 token uuid primary key default gen_random_uuid(), rt_id uuid not null references public.communities on delete cascade,
 email text not null, expires_at timestamptz not null default now()+interval '2 days'
);
create table public.shifts (
 id uuid primary key default gen_random_uuid(), rt_id uuid not null, user_id uuid not null,
 post text not null check(length(trim(post)) between 1 and 120), starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 foreign key(rt_id,user_id) references public.memberships on delete cascade
);
alter table public.communities enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.shifts enable row level security;
create function public.manages_rt(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal'='aal2',false) and exists(select 1 from public.memberships where rt_id=target and user_id=auth.uid() and role='owner')
$$;
create policy member_read on public.memberships for select to authenticated using(user_id=auth.uid() or public.manages_rt(rt_id));
create policy rt_read on public.communities for select to authenticated using(exists(select 1 from public.memberships where rt_id=id and user_id=auth.uid()));
create policy shift_read on public.shifts for select to authenticated using(user_id=auth.uid() or public.manages_rt(rt_id));
create policy shift_create on public.shifts for insert to authenticated with check(public.manages_rt(rt_id));
create function public.create_rt(label text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or (auth.jwt()->>'aal') is distinct from 'aal2' then raise exception 'Aktifkan 2FA dahulu'; end if;
 insert into public.communities(name) values(trim(label)) returning id into result;
 insert into public.memberships values(result,auth.uid(),auth.jwt()->>'email','owner');
 return result;
end $$;
create function public.invite_resident(target uuid, recipient text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 insert into public.invites(rt_id,email) values(target,lower(trim(recipient))) returning token into result;
 return result;
end $$;
create function public.join_rt(code uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.invites;
begin
 delete from public.invites where token=code and expires_at>now() and email=lower(auth.jwt()->>'email') returning * into invitation;
 if not found then raise exception 'Undangan tidak berlaku untuk akun ini'; end if;
 insert into public.memberships values(invitation.rt_id,auth.uid(),invitation.email,'resident') on conflict do nothing;
 return invitation.rt_id;
end $$;
revoke all on public.communities,public.memberships,public.invites,public.shifts from anon,authenticated;
grant select on public.communities,public.memberships,public.shifts to authenticated;
grant insert on public.shifts to authenticated;
