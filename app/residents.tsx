'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

export type Member = {
  rt_id:string; user_id:string; email:string; role:string;
  resident_name:string|null; home_address:string|null;
};

export function ResidentProfileForm({db,rt,member,changed}:{
  db:SupabaseClient;rt:string;member:Member;changed:()=>void;
}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    setBusy(true);
    setMessage('');
    try {
      const {error}=await db.rpc('save_resident_profile',{
        target:rt,member:member.user_id,full_name:form.get('resident-name'),address:form.get('home-address')
      });
      if(error)throw error;
      setMessage('Data warga tersimpan.');
      changed();
    } catch {
      setMessage('Data gagal disimpan. Periksa nama dan alamat, lalu coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={save}>
    <label>Nama warga<input name="resident-name" required maxLength={120} defaultValue={member.resident_name??''}/></label>
    <label>Alamat rumah<textarea name="home-address" required maxLength={300} rows={2} defaultValue={member.home_address??''} placeholder="Jalan atau gang, blok, dan nomor rumah"/></label>
    <button disabled={busy}>{busy?'Menyimpan…':'Simpan data warga'}</button>
    <p role="status" className="manager-notice">{message}</p>
  </form>;
}

export function ResidentTable({db,rt,members,revision,changed}:{
  db:SupabaseClient;rt:string;members:Member[];revision:number;changed:()=>void;
}) {
  const [term,setTerm]=useState('');
  const editor=useRef<HTMLDialogElement>(null);
  const [editing,setEditing]=useState<string|null>(null);
  const [statuses,setStatuses]=useState<Record<string,string>>({});
  const [statusUnavailable,setStatusUnavailable]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let active=true;
    db.rpc('resident_face_statuses',{target:rt}).then(({data,error})=>{
      if(!active)return;
      setStatusUnavailable(Boolean(error));
      if(!error)setStatuses(Object.fromEntries(data.map((item:{user_id:string;status:string})=>[item.user_id,item.status])));
    });
    return ()=>{active=false};
  },[db,rt,revision]);

  const query=term.trim().toLocaleLowerCase('id');
  const rows=[...members]
    .sort((a,b)=>(a.resident_name||a.email).localeCompare(b.resident_name||b.email,'id'))
    .filter(member=>[member.resident_name,member.home_address,member.email].some(value=>value?.toLocaleLowerCase('id').includes(query)));
  const selected=members.find(member=>member.user_id===editing);
  useEffect(()=>{
    if(selected && !editor.current?.open)editor.current?.showModal();
  },[selected]);
  async function approve(member:Member) {
    setBusy(true);
    setMessage('');
    try {
      const {error}=await db.rpc('allow_face_registration',{target:rt,member:member.user_id});
      if(error)throw error;
      setMessage('Pendaftaran wajah diizinkan.');
      changed();
    } catch {
      setMessage('Pendaftaran wajah belum dapat diizinkan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  return <section>
    <h2>Daftar warga</h2>
    <label>Cari nama, alamat, atau email<input type="search" value={term} onChange={event=>setTerm(event.target.value)}/></label>
    <p role="status" className="manager-notice">{message || (statusUnavailable?'Status wajah gagal dimuat.':'')}</p>
    {rows.length ? <div className="resident-table-wrap" tabIndex={0} role="region" aria-label="Tabel data warga">
      <table className="resident-table">
        <thead><tr><th scope="col">Nama warga</th><th className="resident-expanded" scope="col">Alamat rumah</th><th className="resident-expanded" scope="col">Email</th><th scope="col">Status wajah</th><th scope="col">Tindakan</th></tr></thead>
        <tbody>{rows.map(member=>{
          const complete=Boolean(member.resident_name&&member.home_address);
          const status=statuses[member.user_id];
          return <tr key={member.user_id}>
            <th scope="row">{member.resident_name||'Data belum lengkap'}<small>{member.role==='owner'?'Pemilik RT':member.role==='manager'?'Pengurus':'Warga'}</small></th>
            <td className="resident-expanded">{member.home_address||'Belum diisi'}</td>
            <td className="resident-expanded">{member.email}</td>
            <td>{status==='ready'?'Terdaftar':!complete?'Data belum lengkap':status==='approved'?'Boleh daftar':status==='pending'?'Belum disetujui':'—'}</td>
            <td><button type="button" className="text-action" onClick={()=>setEditing(member.user_id)} aria-expanded={editing===member.user_id} aria-controls={editing===member.user_id?'edit-resident':undefined}>Detail</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div> : <p>{query?'Warga tidak ditemukan.':'Belum ada warga.'}</p>}
    <dialog ref={editor} id="edit-resident" className="welcome-guide resident-editor"
      aria-labelledby="edit-resident-title" onClose={()=>setEditing(null)}>
      {selected && <>
      <h2 id="edit-resident-title">{selected.resident_name||selected.email}</h2>
      {selected.resident_name && <p>{selected.email}</p>}
      <ResidentProfileForm key={selected.user_id} db={db} rt={rt} member={selected} changed={changed}/>
      {selected.resident_name && selected.home_address && statuses[selected.user_id]==='pending' && <>
        <p>Periksa identitas warga sebelum mengizinkan pendaftaran wajah.</p>
        <button type="button" disabled={busy} onClick={()=>approve(selected)}>Konfirmasi identitas warga</button>
      </>}
      <button type="button" className="text-action" onClick={()=>editor.current?.close()}>Tutup detail</button>
      </>}
    </dialog>
  </section>;
}
