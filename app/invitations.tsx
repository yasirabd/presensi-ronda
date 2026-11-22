'use client';
import {Copy, Link2, MessageCircle, UserPlus, X} from 'lucide-react';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

type Invite={email:string;token:string;expires_at:string};

export function Invitations({db,rt,name,revision}:{db:SupabaseClient;rt:string;name:string;revision:number}) {
  const [formOpen,setFormOpen]=useState(false);
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
    db.from('invites').select('email,token,expires_at').eq('rt_id',rt)
      .gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:false}).then(({data,error})=>{
        if(!active)return;
        setLoading(false);
        if(error)setMessage('Undangan aktif belum dapat dimuat. Coba muat ulang halaman.');
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
    const email=String(new FormData(form).get('email')).trim().toLowerCase();
    setBusy(true);
    setMessage('');
    try {
      const {data,error}=await db.rpc('invite_resident',{target:rt,recipient:email});
      if(error)throw new Error(error.message);
      const {data:invite,error:readError}=await db.from('invites').select('email,token,expires_at')
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
    if(busy || !window.confirm(`Cabut undangan untuk ${invite.email}?`))return;
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

  const link=selected ? `${location.origin}/?undangan=${selected.token}` : '';
  const whatsapp=selected ? 'https://wa.me/?text='+encodeURIComponent(
    `Halo, Anda diundang bergabung ke ${name} di Ronda Pak. Buka ${link} lalu masuk atau daftar dengan email ${selected.email}.`
  ) : '';
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
        <label>Email warga<input type="email" name="email" required maxLength={254} autoComplete="off"/></label>
        <small>Warga perlu masuk atau daftar dengan email ini. Tautan berlaku 2 hari.</small>
        <button className="with-icon" disabled={busy}><Link2 aria-hidden="true"/>{busy?'Menyiapkan…':'Buat tautan'}</button>
      </form>
    </div>
    {selected && <div className="invitation-share">
      <h3 ref={shareHeading} tabIndex={-1}>Bagikan ke {selected.email}</h3>
      <p>Kirim lewat chat pribadi ke warga yang diundang.</p>
      <label>Tautan undangan<input readOnly value={link} onFocus={event=>event.currentTarget.select()}/></label>
      <div className="invitation-actions">
        <a className="with-icon" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true"/>Bagikan lewat WhatsApp</a>
        <button type="button" className="secondary with-icon" onClick={copy}><Copy aria-hidden="true"/>Salin tautan</button>
      </div>
    </div>}
    <p role="status" className="manager-notice">{message}</p>
    <details>
      <summary>Undangan aktif{loading?'':` (${invites.length})`}</summary>
      {loading?<p>Memuat undangan…</p>:invites.length?<ul className="invitation-list">{invites.map(invite=><li key={invite.token}>
        <strong>{invite.email}</strong>
        <small>Berlaku sampai {new Date(invite.expires_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</small>
        <div className="invitation-actions">
          <button type="button" className="text-action" onClick={()=>{setSelected(invite);setMessage('');}}>Lihat tautan</button>
          <button type="button" className="text-action" disabled={busy} onClick={()=>revoke(invite)}>Cabut undangan</button>
        </div>
      </li>)}</ul>:<p>Belum ada undangan aktif.</p>}
    </details>
  </section>;
}
