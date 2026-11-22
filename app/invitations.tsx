'use client';
import {Copy, Link2, MessageCircle, UserPlus, X} from 'lucide-react';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {whatsappNumber} from './whatsapp';
import type {SupabaseClient} from '@supabase/supabase-js';

type Invite={email:string|null;invited_name:string|null;whatsapp:string|null;token:string;expires_at:string};
type Pending={token:string;full_name:string;whatsapp:string;home_address:string;has_face:boolean};
const inviteColumns='email,invited_name,whatsapp,token,expires_at';
const recipient=(invite:Invite)=>invite.invited_name??invite.email;

export function Invitations({db,rt,name,revision,changed}:{db:SupabaseClient;rt:string;name:string;revision:number;changed:()=>void}) {
  const [formOpen,setFormOpen]=useState(false);
  const [pending,setPending]=useState<Pending[]>([]);
  const [invites,setInvites]=useState<Invite[]>([]);
  const [selected,setSelected]=useState<Invite|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [refresh,setRefresh]=useState(0);
  const shareHeading=useRef<HTMLHeadingElement>(null);
  const selectedToken=selected?.token;
  useEffect(()=>{
    if(selectedToken)shareHeading.current?.focus();
  },[selectedToken]);
  useEffect(()=>{
    let active=true;
    setLoading(true);
    Promise.all([
      db.from('invites').select(inviteColumns).eq('rt_id',rt).gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:false}),
      db.rpc('pending_joins',{target:rt})
    ]).then(([{data,error},requests])=>{
        if(!active)return;
        setLoading(false);
        if(!requests.error)setPending(requests.data??[]);
        if(error||requests.error)setMessage('Undangan aktif belum dapat dimuat. Coba muat ulang halaman.');
        else {
          setInvites(data??[]);
          setSelected(previous=>previous ? (data??[]).find(invite=>invite.token===previous.token)??null : null);
        }
      });
    return ()=>{active=false};
  },[db,rt,refresh,revision]);

  async function create(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget;
    const fields=new FormData(form);
    setBusy(true);
    setMessage('');
    try {
      const {data,error}=await db.rpc('invite_by_whatsapp',{target:rt,full_name:fields.get('name'),phone:whatsappNumber(fields.get('phone'))});
      if(error)throw new Error(error.message);
      const {data:invite,error:readError}=await db.from('invites').select(inviteColumns)
        .eq('rt_id',rt).eq('token',data).single();
      if(readError)throw new Error('Tautan belum bisa ditampilkan. Coba buka Undangan aktif.');
      setSelected(invite);
      setFormOpen(false);
      setMessage('Tautan siap dibagikan.');
    } catch(error) {
      setMessage(error instanceof Error?error.message:'Undangan gagal dibuat. Coba lagi.');
    } finally {
      setBusy(false);
      setRefresh(n=>n+1);
    }
  }

  async function revoke(invite:Invite) {
    if(busy || !window.confirm(`Cabut undangan untuk ${recipient(invite)}?`))return;
    setBusy(true);
    try {
      const {error}=await db.from('invites').delete().eq('rt_id',rt).eq('token',invite.token);
      if(error)throw error;
      setSelected(previous=>previous?.token===invite.token?null:previous);
      setMessage('Undangan sudah dicabut.');
    } catch {
      setMessage('Undangan belum dapat dicabut. Coba lagi.');
    } finally {
      setBusy(false);
      setRefresh(n=>n+1);
    }
  }

  async function approve(request:Pending) {
    if(busy)return;
    setBusy(true);
    try {
      const {error}=await db.rpc('approve_join',{target:rt,code:request.token});
      if(error)throw new Error(error.message);
      setMessage(`${request.full_name} sudah bergabung.`);
      changed();
    } catch(error) {
      setMessage(error instanceof Error?error.message:'Pengajuan belum dapat disetujui.');
    } finally {
      setBusy(false);
      setRefresh(n=>n+1);
    }
  }
  const link=selected ? (selected.whatsapp
    ? `${location.origin}/daftar?undangan=${selected.token}&wa=1`
    : `${location.origin}/?undangan=${selected.token}`) : '';
  const whatsapp=selected ? `https://wa.me/${selected.whatsapp??''}?text=`+encodeURIComponent(
    selected.whatsapp
      ? `Halo ${selected.invited_name}, Anda diundang bergabung ke ${name} di Ronda Pak. Buka tautan ini untuk mendaftar: ${link}`
      : `Halo, Anda diundang bergabung ke ${name} di Ronda Pak. Buka ${link} lalu masuk atau daftar dengan email ${selected.email}.`
  ) : '';
  const activeInvites=invites.filter(invite=>!pending.some(request=>request.token===invite.token));
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Tautan disalin.');
    } catch {
      setMessage('Penyalinan otomatis gagal. Salin alamat dari kolom Tautan undangan.');
    }
  }

  return <section className="invitation-panel" aria-labelledby="invitation-title">
    <div className="invitation-heading">
      <h2 id="invitation-title">Undangan warga</h2>
      <button type="button" className="with-icon" aria-expanded={formOpen} aria-controls="create-invitation" onClick={()=>setFormOpen(open=>!open)}>
        {formOpen?<X aria-hidden="true"/>:<UserPlus aria-hidden="true"/>}
        {formOpen?'Tutup formulir':'Undang warga'}
      </button>
    </div>
    <div id="create-invitation" hidden={!formOpen}>
      <form onSubmit={create}>
        <label>Nama warga<input name="name" required maxLength={120}/></label>
        <label>Nomor WhatsApp<input type="tel" name="phone" required maxLength={24} placeholder="08… atau +62…"/></label>
        <small>Tautan pribadi berlaku 2 hari. Warga bisa memeriksa namanya dan mengisi alamat saat mendaftar.</small>
        <button className="with-icon" disabled={busy}><Link2 aria-hidden="true"/>{busy?'Menyiapkan…':'Buat tautan'}</button>
      </form>
    </div>
    {selected && <div className="invitation-share">
      <h3 ref={shareHeading} tabIndex={-1}>Bagikan ke {recipient(selected)}</h3>
      <p>Kirim lewat chat pribadi ke warga yang diundang.</p>
      <label>Tautan undangan<input readOnly value={link} onFocus={event=>event.currentTarget.select()}/></label>
      <div className="invitation-actions">
        <a className="with-icon" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true"/>Kirim lewat WhatsApp</a>
        <button type="button" className="secondary with-icon" onClick={copy}><Copy aria-hidden="true"/>Salin tautan</button>
      </div>
    </div>}
    <p role="status" className="manager-notice">{message}</p>
    {pending.length>0 && <details open>
      <summary>Menunggu konfirmasi ({pending.length})</summary>
      <ul className="invitation-list">{pending.map(request=><li key={request.token}>
        <strong>{request.full_name}</strong>
        <small>WhatsApp +{request.whatsapp}</small>
        <p>{request.home_address}</p>
        <p>{request.has_face?'Wajah sudah didaftarkan.':'Pengajuan tanpa wajah.'} Periksa identitas warga sebelum menyetujui.</p>
        <button type="button" onClick={()=>approve(request)} disabled={busy}>Konfirmasi identitas</button>
        <button type="button" className="text-action" disabled={busy} onClick={()=>{
          const invite=invites.find(item=>item.token===request.token);
          if(invite)void revoke(invite);
        }}>Cabut undangan</button>
      </li>)}</ul>
    </details>}
    <details>
      <summary>Undangan aktif{loading?'':` (${activeInvites.length})`}</summary>
      {loading?<p>Memuat undangan…</p>:activeInvites.length?<ul className="invitation-list">{activeInvites.map(invite=><li key={invite.token}>
        <strong>{recipient(invite)}</strong>
        <small>Berlaku sampai {new Date(invite.expires_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</small>
        <div className="invitation-actions">
          <button type="button" className="text-action" onClick={()=>{setSelected(invite);setMessage('');}}>Lihat tautan</button>
          <button type="button" className="text-action" disabled={busy} onClick={()=>revoke(invite)}>Cabut undangan</button>
        </div>
      </li>)}</ul>:<p>Belum ada undangan aktif.</p>}
    </details>
  </section>;
}
