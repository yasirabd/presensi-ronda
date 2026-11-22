'use client';
import {ArrowLeft, ArrowRight, CircleCheck} from 'lucide-react';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {FaceCamera} from './face';
import {whatsappNumber} from './whatsapp';

type Invitation={rt:string;room:string;name:string;phone:string;address:string|null;submitted:boolean};

export function JoinRegistration({db,code,onExit}:{db:SupabaseClient;code:string;onExit:()=>void}) {
  const [invitation,setInvitation]=useState<Invitation|null>(null);
  const [loading,setLoading]=useState(true);
  const [step,setStep]=useState<'details'|'face'|'done'>('details');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);
  const form=useRef<HTMLFormElement>(null);
  useEffect(()=>{
    let current=true;
    if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(code)){
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const {data,error}=await db.rpc('registration_invite',{code});
        if(!current)return;
        if(error)throw error;
        if(data && !data.address){
          const {data:{session}}=await db.auth.getSession();
          if(session?.user.user_metadata.ronda_join_draft){
            const response=await fetch('/api/join-draft',{method:'POST',headers:{
              'Content-Type':'application/json',Authorization:'Bearer '+session.access_token
            },body:JSON.stringify({code})});
            if(response.ok){
              void db.auth.updateUser({data:{ronda_join_draft:null}}).catch(()=>{});
              const restored=await db.rpc('registration_invite',{code});
              if(restored.error)throw restored.error;
              if(current){setInvitation(restored.data);setStep('face');}
              return;
            }
            if(response.status!==404 && response.status!==410)
              throw new Error('Data pendaftaran belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.');
          }
        }
        if(!current)return;
        setInvitation(data);
        if(data?.submitted)setStep('done');
        else if(data?.address)setStep('face');
      } catch {
        if(current)setMessage('Data pendaftaran belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.');
      } finally {
        if(current)setLoading(false);
      }
    }
    void load();
    return ()=>{current=false};
  },[db,code]);

  useEffect(()=>{
    if(!loading)heading.current?.focus();
  },[loading,step]);

  async function save(data:FormData,withoutFace=false) {
    if(busy || !invitation)return;
    setBusy(true);
    setMessage('');
    try {
      const name=String(data.get('name')).trim();
      const phone=whatsappNumber(data.get('phone'));
      const address=String(data.get('address')).trim();
      const {error}=await db.rpc('save_join_request',{code,full_name:name,phone,address,without_face:withoutFace});
      if(error)throw new Error(error.message);
      setInvitation({...invitation,name,phone,address});
      setStep(withoutFace?'done':'face');
    } catch(error) {
      setMessage(error instanceof Error?error.message:'Pengajuan belum dapat disimpan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if(busy || !window.confirm('Batalkan pengajuan dan hapus data pendaftaran ini?'))return;
    setBusy(true);
    const {error}=await db.rpc('cancel_join_request',{code});
    if(error){setMessage(error.message);setBusy(false);}
    else onExit();
  }

  function next(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(new FormData(event.currentTarget));
  }

  return <section className="join-registration">
    {invitation && <p className="join-room">{invitation.room}</p>}
    <h1 ref={heading} tabIndex={-1}>
      {step==='done'?'Pengajuan terkirim':step==='face'?'Daftarkan wajah':'Pendaftaran warga'}
    </h1>
    {loading?<p role="status">Memeriksa undangan…</p>:!invitation?<p>{message||'Undangan sudah tidak berlaku. Minta tautan baru ke pengurus atau kembali ke Ronda Pak jika Anda sudah disetujui.'}</p>:<>
      <form ref={form} onSubmit={next} hidden={step!=='details'}>
        <p>Periksa data Anda untuk bergabung dengan RT ini.</p>
        <label>Nama warga<input name="name" defaultValue={invitation.name} maxLength={120} required autoComplete="name"/></label>
        <label>Nomor WhatsApp<input name="phone" type="tel" defaultValue={'+'+invitation.phone} maxLength={24} required autoComplete="tel"/></label>
        <label>Alamat rumah<textarea name="address" defaultValue={invitation.address??''} maxLength={300} rows={2} required autoComplete="street-address"/></label>
        <button className="with-icon" disabled={busy}>{busy?'Menyimpan…':'Lanjut ke kamera'}<ArrowRight aria-hidden="true"/></button>
      </form>
      {step==='face' && <>
        <p>Gunakan kamera depan di tempat terang. Pendaftaran wajah akan dikirim bersama data Anda.</p>
        <FaceCamera db={db} rt={invitation.rt} joinInvite={code} onDone={()=>setStep('done')}/>
        <div className="join-secondary">
          <button type="button" className="text-action with-icon" onClick={()=>setStep('details')} disabled={busy}><ArrowLeft aria-hidden="true"/>Ubah data</button>
          <button type="button" className="text-action" onClick={()=>{if(form.current)void save(new FormData(form.current),true);}} disabled={busy}>Ajukan tanpa wajah</button>
        </div>
      </>}
      {step==='done' && <>
        <p className="join-success"><CircleCheck aria-hidden="true"/>Pengurus akan memeriksa identitas Anda. Setelah disetujui, Anda bisa membuka ruang RT.</p>
        <button type="button" className="text-action" disabled={busy} onClick={cancel}>Batalkan pengajuan</button>
      </>}
      <p role="status" className="manager-notice">{message}</p>
    </>}
    {(!invitation || step==='done') && !loading && <button type="button" className="text-action" onClick={onExit}>Kembali ke Ronda Pak</button>}
  </section>;
}
