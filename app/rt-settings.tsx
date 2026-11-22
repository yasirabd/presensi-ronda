'use client';
import {useEffect,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

type Member={user_id:string;email:string;role:string};
type RequestRow={id:string;kind:string;details:string;resolution:string|null;user_id:string;created_at:string};
export function RTSettings({db,rt,manager,isOwner,members,revision,changed}:{db:SupabaseClient;rt:string;manager:boolean;isOwner:boolean;members:Member[];revision:number;changed:()=>void}){
  const [requests,setRequests]=useState<RequestRow[]>([]);
  const [zone,setZone]=useState('Asia/Jakarta');
  const [contact,setContact]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    Promise.all([db.from('privacy_requests').select('*').eq('rt_id',rt).order('created_at',{ascending:false}),
      db.from('communities').select('privacy_contact,zone').eq('id',rt).single()
    ]).then(([items,community])=>{
      if(!active)return;
      if(items.error || community.error)setMessage('Data pengaturan belum dapat dimuat.');
      setRequests(items.data||[]);setZone(community.data?.zone||'Asia/Jakarta');setContact(community.data?.privacy_contact||'');
    });
    return ()=>{active=false};
  },[db,rt,manager,revision]);
  function submit(action:(form:FormData)=>PromiseLike<{error:{message:string}|null}>) {
    return async(event:FormEvent<HTMLFormElement>)=>{
      event.preventDefault();const form=event.currentTarget;const submitter=(event.nativeEvent as SubmitEvent).submitter;
      setBusy(true);
      try{const {error}=await action(new FormData(form,submitter));if(error){setMessage(error.message);return}form.reset();setMessage('Perubahan tersimpan.');changed()}
      catch{setMessage('Gagal terhubung. Coba lagi.')}finally{setBusy(false)}
    };
  }
  return <section><h2>Privasi dan keanggotaan</h2><p role="status">{message}</p>
    <details><summary>Hubungi pengurus RT</summary><p>{contact || 'Kirim permintaan langsung kepada pengurus RT melalui formulir ini.'}</p>
    <form onSubmit={submit(f=>db.from('privacy_requests').insert({rt_id:rt,kind:f.get('kind'),details:f.get('details')}))}>
    <label>Jenis permintaan<select name="kind"><option>Akses</option><option>Koreksi</option><option>Penghapusan</option></select></label>
    <label>Permintaan Anda<input required maxLength={500} name="details"/></label><button disabled={busy}>Kirim permintaan</button></form>
    {requests.map(r=><article key={r.id}><h3>{r.kind} · {new Date(r.created_at).toLocaleDateString('id-ID')}</h3>
    {manager && <small>{members.find(m=>m.user_id===r.user_id)?.email}</small>}<p>{r.details}</p><p>{r.resolution || 'Menunggu tanggapan pengurus.'}</p>
    {manager && !r.resolution && <form onSubmit={submit(f=>db.rpc('resolve_privacy_request',{target:r.id,answer:f.get('answer')}))}><label>Keputusan setelah memeriksa identitas<input name="answer" maxLength={500} required/></label><button disabled={busy}>Selesaikan permintaan</button></form>}</article>)}</details>
    {manager && <details><summary>Kontak privasi dan zona waktu</summary><form onSubmit={submit(f=>db.from('communities').update({privacy_contact:f.get('contact'),zone:f.get('zone')}).eq('id',rt))}>
    <label>Zona waktu RT<select name="zone" key={zone} defaultValue={zone}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></label>
    <label>Kontak privasi RT<input key={contact} defaultValue={contact} maxLength={200} name="contact" required/></label><button disabled={busy}>Simpan kontak</button></form>
    </details>}
    {isOwner && <details><summary>Kelola peran anggota</summary><form onSubmit={submit(f=>{
      const role=f.get('role-action')==='transfer'?'owner':f.get('role');
      if(role==='owner' && !window.confirm('Alihkan hak menunjuk pengurus ke anggota ini? Akun Anda tetap menjadi Pengurus RT.'))return Promise.resolve({error:{message:'Pemindahan dibatalkan.'}});
      return db.rpc('set_rt_role',{target:rt,member:f.get('member'),new_role:role});
    })}><label>Anggota<select name="member" required>{members.filter(m=>m.role!=='owner').map(m=><option key={m.user_id} value={m.user_id}>{m.email}</option>)}</select></label>
    <label>Peran baru<select name="role"><option value="resident">Warga</option><option value="manager">Pengurus RT</option></select></label><button name="role-action" value="change" disabled={busy}>Ubah peran</button>
    <button type="submit" name="role-action" value="transfer" className="text-action" disabled={busy}>Alihkan hak menunjuk pengurus</button></form></details>}
  </section>;
}
