alter table public.invites alter column email drop not null;
alter table public.invites add column invited_name text, add column whatsapp text;
alter table public.invites add constraint invite_recipient check (
 (email is not null and invited_name is null and whatsapp is null) or
 (email is null and coalesce(length(trim(invited_name)),0) between 1 and 120 and coalesce(whatsapp,'') ~ '^[1-9][0-9]{7,14}$')
);
alter table public.memberships add column whatsapp text check(whatsapp ~ '^[1-9][0-9]{7,14}$');

create table ronda_private.join_requests (
 token uuid primary key references public.invites on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 full_name text not null,
 whatsapp text not null,
 home_address text not null,
 ciphertext text,
 consent_at timestamptz,
 submitted boolean not null default false
);
alter table ronda_private.join_requests enable row level security;

create function public.invite_by_whatsapp(target uuid, full_name text, phone text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 if coalesce(length(trim(full_name)),0) not between 1 and 120 or coalesce(phone,'') !~ '^[1-9][0-9]{7,14}$'
 then raise exception 'Periksa nama dan nomor WhatsApp.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(concat_ws(':','whatsapp-invite',target,phone),0));
 select token into result from public.invites
 where rt_id=target and whatsapp=phone and expires_at>now() order by expires_at desc limit 1;
 if result is null then
   insert into public.invites(rt_id,invited_name,whatsapp) values(target,trim(full_name),phone) returning token into result;
 end if;
 return result;
end $$;

create function public.registration_invite(code uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('rt',i.rt_id,'room',c.name,'name',coalesce(r.full_name,i.invited_name),
 'phone',coalesce(r.whatsapp,i.whatsapp),'address',r.home_address,'submitted',coalesce(r.submitted,false))
 from public.invites i join public.communities c on c.id=i.rt_id
 left join ronda_private.join_requests r on r.token=i.token
 where auth.uid() is not null and i.token=code and i.expires_at>now() and i.whatsapp is not null
 and (r.user_id is null or r.user_id=auth.uid())
$$;

create function public.save_join_request(code uuid, full_name text, phone text, address text, without_face boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare
 invitation public.invites;
begin
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 then raise exception 'Masuk dengan akun yang sudah dikonfirmasi.'; end if;
 select * into invitation from public.invites where token=code and whatsapp is not null and expires_at>now() for update;
 if not found then raise exception 'Undangan kedaluwarsa atau sudah digunakan.'; end if;
 if exists(select 1 from public.memberships where rt_id=invitation.rt_id and user_id=auth.uid())
 then raise exception 'Anda sudah menjadi anggota RT ini.'; end if;
 if coalesce(length(trim(full_name)),0) not between 1 and 120 or coalesce(phone,'') !~ '^[1-9][0-9]{7,14}$'
 or coalesce(length(trim(address)),0) not between 1 and 300
 then raise exception 'Periksa nama, nomor WhatsApp, dan alamat rumah.'; end if;
 insert into ronda_private.join_requests as r(token,user_id,full_name,whatsapp,home_address,submitted)
 values(code,auth.uid(),trim(full_name),phone,trim(address),coalesce(without_face,false))
 on conflict(token) do update set full_name=excluded.full_name,whatsapp=excluded.whatsapp,
 home_address=excluded.home_address,submitted=excluded.submitted
 where r.user_id=auth.uid() and not r.submitted;
 if not found then raise exception 'Undangan sudah digunakan untuk pengajuan lain.'; end if;
end $$;

create function public.join_face_operation(payload text, signature text) returns void
language plpgsql security definer set search_path='' as $$
declare
 msg jsonb:=payload::jsonb;
 invitation public.invites;
begin
 if signature is null or auth.uid() is null or auth.uid() is distinct from (msg->>'user')::uuid or
    coalesce((msg->>'expires')::bigint,0) not between extract(epoch from now()) and extract(epoch from now())+90 or
    signature is distinct from (select encode(extensions.hmac(convert_to(payload,'UTF8'),secret,'sha256'),'hex') from ronda_private.face_secret where id)
 then raise exception 'Permintaan verifikasi tidak berlaku.'; end if;
 select * into invitation from public.invites where token=(msg->>'invite')::uuid and rt_id=(msg->>'rt')::uuid
   and whatsapp is not null and expires_at>now() for update;
 if not found then raise exception 'Undangan kedaluwarsa atau sudah digunakan.'; end if;
 if msg->>'action'='check' and exists(select 1 from ronda_private.join_requests where token=invitation.token and user_id=auth.uid() and not submitted) then
   return;
 end if;
 if msg->>'action'='enroll' and length(msg->>'template') between 100 and 4096 then
   update ronda_private.join_requests set ciphertext=msg->>'template',consent_at=now(),submitted=true
   where token=invitation.token and user_id=auth.uid() and not submitted;
   if found then return; end if;
 end if;
 raise exception 'Pengajuan wajah tidak tersedia.';
end $$;

create function public.pending_joins(target uuid)
returns table(token uuid, full_name text, whatsapp text, home_address text, has_face boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.manages_rt(target) then raise exception 'Akses ditolak'; end if;
 return query select i.token,r.full_name,r.whatsapp,r.home_address,r.ciphertext is not null
 from public.invites i join ronda_private.join_requests r on r.token=i.token
 where i.rt_id=target and i.expires_at>now() and r.submitted order by i.expires_at desc;
end $$;

create function public.approve_join(target uuid, code uuid) returns void
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
 if request.ciphertext is not null then
   insert into ronda_private.face_profiles(rt_id,user_id,ciphertext,consent_at)
   values(target,request.user_id,request.ciphertext,request.consent_at);
 end if;
 delete from public.invites where token=code;
end $$;

create function public.cancel_join_request(code uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.invites where token=code and whatsapp is not null for update;
 delete from ronda_private.join_requests where token=code and user_id=auth.uid();
 if not found then raise exception 'Pengajuan tidak tersedia.'; end if;
 delete from public.invites where token=code;
end $$;
revoke all on function public.cancel_join_request(uuid) from public,anon;
grant execute on function public.cancel_join_request(uuid) to authenticated;

revoke all on function public.invite_by_whatsapp(uuid,text,text), public.registration_invite(uuid),
 public.save_join_request(uuid,text,text,text,boolean), public.join_face_operation(text,text),
 public.pending_joins(uuid), public.approve_join(uuid,uuid) from public,anon;
grant execute on function public.invite_by_whatsapp(uuid,text,text), public.registration_invite(uuid),
 public.save_join_request(uuid,text,text,text,boolean), public.join_face_operation(text,text),
 public.pending_joins(uuid), public.approve_join(uuid,uuid) to authenticated;
