create table ronda_private.join_drafts (
 id uuid primary key,
 token uuid not null references public.invites on delete cascade,
 email text not null,
 full_name text not null,
 whatsapp text not null,
 home_address text not null,
 ciphertext text,
 consent_at timestamptz,
 expires_at timestamptz not null
);
create index join_drafts_token on ronda_private.join_drafts(token);
create index join_drafts_expiry on ronda_private.join_drafts(expires_at);
alter table ronda_private.join_drafts enable row level security;

create table ronda_private.join_draft_limits (
 scope text not null,
 identifier text not null,
 bucket timestamptz not null,
 attempts int not null,
 primary key(scope,identifier,bucket)
);
alter table ronda_private.join_draft_limits enable row level security;

create function ronda_private.clean_join_drafts() returns void
language sql set search_path='' as $$
 delete from ronda_private.join_drafts where expires_at<=now();
 delete from ronda_private.join_draft_limits where bucket<now()-interval '30 minutes';
$$;
revoke all on function ronda_private.clean_join_drafts() from public,anon,authenticated;

-- Only the application server can stage or promote a draft. Promotion also requires a
-- Supabase session for the confirmed email, independently of the server signature.
create function public.join_draft_operation(payload text, signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 msg jsonb:=payload::jsonb;
 operation text:=msg->>'action';
 invitation public.invites;
 draft ronda_private.join_drafts;
 actor uuid:=auth.uid();
 confirmed_email text;
 attempts int;
 bucket_start timestamptz:=date_bin(interval '15 minutes',now(),timestamptz '2000-01-01');
 template text:=msg->>'template';
 draft_id uuid:=(msg->>'draft')::uuid;
 invitation_id uuid:=(msg->>'invite')::uuid;
begin
 if signature is null or
    coalesce((msg->>'expires')::bigint,0) not between extract(epoch from now()) and extract(epoch from now())+90 or
    signature is distinct from (select encode(extensions.hmac(convert_to(payload,'UTF8'),secret,'sha256'),'hex')
      from ronda_private.face_secret where id)
 then raise exception 'Permintaan pendaftaran tidak berlaku.'; end if;

 if operation='prepare' then
   insert into ronda_private.join_draft_limits as counters values('ip',msg->>'ip',bucket_start,1)
   on conflict(scope,identifier,bucket) do update set attempts=least(counters.attempts+1,31)
   returning counters.attempts into attempts;
   if attempts>30 then return jsonb_build_object('status','limited'); end if;
 end if;

 select * into invitation from public.invites
 where token=invitation_id and whatsapp is not null and expires_at>now() for update;
 if not found then return jsonb_build_object('status','unavailable'); end if;

 if operation='prepare' then
   if exists(select 1 from ronda_private.join_requests where token=invitation.token and submitted)
   then return jsonb_build_object('status','unavailable'); end if;
   insert into ronda_private.join_draft_limits as counters values('invite',invitation.token::text,bucket_start,1)
   on conflict(scope,identifier,bucket) do update set attempts=least(counters.attempts+1,9)
   returning counters.attempts into attempts;
   return jsonb_build_object('status',case when attempts>8 then 'limited' else 'ready' end);
 end if;

 if operation='store' then
   if exists(select 1 from ronda_private.join_requests where token=invitation.token and submitted)
   then return jsonb_build_object('status','unavailable'); end if;
   insert into ronda_private.join_drafts(id,token,email,full_name,whatsapp,home_address,ciphertext,consent_at,expires_at)
   values(draft_id,invitation.token,msg->>'email',msg->>'name',msg->>'phone',msg->>'address',template,
     case when template is not null then now() end,least(invitation.expires_at,now()+interval '2 days'));
   return jsonb_build_object('status','stored');
 end if;

 select lower(trim(email)) into confirmed_email from auth.users where id=actor and email_confirmed_at is not null;
 if confirmed_email is null or actor is distinct from (msg->>'user')::uuid
 then return jsonb_build_object('status','unauthorized'); end if;

 if exists(select 1 from ronda_private.join_requests where token=invitation.token and user_id=actor and submitted)
 then return jsonb_build_object('status','submitted'); end if;
 if exists(select 1 from ronda_private.join_requests where token=invitation.token and user_id<>actor)
    or exists(select 1 from public.memberships where rt_id=invitation.rt_id and user_id=actor)
 then return jsonb_build_object('status','unavailable'); end if;

 select * into draft from ronda_private.join_drafts
 where id=draft_id and token=invitation.token and email=confirmed_email and expires_at>now();
 if not found then return jsonb_build_object('status','unavailable'); end if;

 if operation='read' then
   return jsonb_build_object('status','ready','rt',invitation.rt_id,'template',draft.ciphertext);
 end if;

 if operation='submit' and (template is null)=(draft.ciphertext is null) then
   insert into ronda_private.join_requests as existing(token,user_id,full_name,whatsapp,home_address,ciphertext,consent_at,submitted)
   values(invitation.token,actor,draft.full_name,draft.whatsapp,draft.home_address,template,draft.consent_at,true)
   on conflict(token) do update set full_name=excluded.full_name,whatsapp=excluded.whatsapp,home_address=excluded.home_address,
     ciphertext=excluded.ciphertext,consent_at=excluded.consent_at,submitted=true
   where existing.user_id=actor and not existing.submitted;
   if not found then return jsonb_build_object('status','unavailable'); end if;
   delete from ronda_private.join_drafts where token=invitation.token;
   return jsonb_build_object('status','submitted');
 end if;
 raise exception 'Permintaan pendaftaran tidak berlaku.';
end $$;
revoke all on function public.join_draft_operation(text,text) from public,anon,authenticated;
grant execute on function public.join_draft_operation(text,text) to anon,authenticated;

create or replace function public.approve_join(target uuid, code uuid) returns void
language plpgsql security definer set search_path='' as $$
declare
 request ronda_private.join_requests;
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 perform 1 from public.invites where token=code and rt_id=target and expires_at>now() and whatsapp is not null for update;
 if not found then raise exception 'Undangan sudah tidak berlaku.'; end if;
 select * into request from ronda_private.join_requests where token=code and submitted;
 if not found then raise exception 'Pengajuan belum lengkap.'; end if;
 insert into public.memberships(rt_id,user_id,email,role,resident_name,home_address,whatsapp)
 select target,id,email,'resident',request.full_name,request.home_address,request.whatsapp
 from auth.users where id=request.user_id and email_confirmed_at is not null
 on conflict(rt_id,user_id) do nothing;
 if not found then raise exception 'Akun warga belum dikonfirmasi atau sudah bergabung.'; end if;
 insert into ronda_private.face_profiles(rt_id,user_id,ciphertext,consent_at)
 values(target,request.user_id,request.ciphertext,request.consent_at);
 delete from public.invites where token=code;
end $$;
