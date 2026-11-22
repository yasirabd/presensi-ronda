'use client';
import {useEffect, useState, type FormEvent} from 'react';
import {usePathname} from 'next/navigation';
import {whatsappNumber} from './whatsapp';
import {Introduction} from './introduction';
import type {SupabaseClient} from '@supabase/supabase-js';

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'resend';
const titles = {login:'Masuk ke Ronda Pak', signup:'Daftar akun', forgot:'Lupa kata sandi?', reset:'Buat kata sandi baru', resend:'Kirim ulang konfirmasi'};
const actions = {login:'Masuk', signup:'Daftar', forgot:'Kirim tautan pemulihan', reset:'Simpan kata sandi baru', resend:'Kirim ulang email'};

export function AuthForm({db, invited, whatsappInvite, recovering, onReset}:{
  db:SupabaseClient; invited:boolean; whatsappInvite:boolean; recovering:boolean; onReset:()=>void;
}) {
  const pathname=usePathname();
  const [choice,setChoice]=useState<Mode>(pathname==='/daftar'?'signup':'login');
  const [profile,setProfile]=useState({name:'',phone:'',address:''});
  const [authLink,setAuthLink]=useState(false);
  const mode=recovering?'reset':choice;
  const combined=whatsappInvite && mode==='signup';
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [sent,setSent]=useState(false);
  const [needsConfirmation,setNeedsConfirmation]=useState(false);
  const [googleEnabled,setGoogleEnabled]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{
      headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!},signal:controller.signal
    }).then(r=>r.ok?r.json():null).then(settings=>{
      if(!controller.signal.aborted)setGoogleEnabled(settings?.external?.google===true);
    }).catch(()=>{});
    const params=new URLSearchParams(location.hash.slice(1));
    const query=new URLSearchParams(location.search);
    setAuthLink(['undangan','pemulihan','code','error'].some(k=>query.has(k)) || ['access_token','error','type'].some(k=>params.has(k)));
    if(params.has('error') || new URLSearchParams(location.search).has('error')){
      setMessage('Proses masuk belum selesai. Silakan coba lagi.');
    }
    return ()=>controller.abort();
  },[]);
  function returnUrl() {
    const redirect=new URL('/',location.origin);
    const invite=new URLSearchParams(location.search).get('undangan');
    if(invite)redirect.searchParams.set('undangan',invite);
    if(invite && whatsappInvite)redirect.searchParams.set('wa','1');
    return redirect;
  }
  async function googleLogin(){
    setBusy(true);setMessage('');
    try {
      const {error}=await db.auth.signInWithOAuth({provider:'google',options:{
        redirectTo:returnUrl().href,queryParams:{prompt:'select_account'}
      }});
      if(error)throw error;
    } catch {
      setBusy(false);setMessage('Google belum bisa dibuka. Coba lagi atau masuk dengan email.');
    }
  }
  function switchTo(next:Mode) {
    setChoice(next);setPassword('');setMessage('');setSent(false);setNeedsConfirmation(false);
  }
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(busy)return;
    setBusy(true);setMessage('');
    setNeedsConfirmation(false);
    const address=email.trim();
    const redirect=returnUrl();
    try {
      if(mode==='resend'){
        const {error}=await db.auth.resend({type:'signup',email:address,options:{emailRedirectTo:redirect.href}});
        if(error)throw error;
        setSent(true);
        setMessage('Jika akun masih menunggu konfirmasi, tautan akan dikirim ke '+address+'. Periksa kotak masuk dan folder Spam.');
      } else if(mode==='forgot'){
        redirect.searchParams.set('pemulihan','1');
        const {error}=await db.auth.resetPasswordForEmail(address,{redirectTo:redirect.href});
        if(error)throw error;
        setSent(true);setMessage('Jika email terdaftar, tautan pemulihan akan dikirim ke '+address+'. Periksa juga folder spam.');
      } else if(mode==='reset'){
        const {error}=await db.auth.updateUser({password});
        if(error)throw error;
        switchTo('login');onReset();
      } else if(mode==='signup'){
        let draft:string|undefined;
        if(combined){
          const phone=whatsappNumber(profile.phone);
          const response=await fetch('/api/join-draft',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({code:redirect.searchParams.get('undangan'),email:address,...profile,phone})});
          const result=await response.json();
          if(!response.ok){setMessage(result.error);return;}
          draft=result.draft;
        }
        const {data,error}=await db.auth.signUp({email:address,password,options:{
          emailRedirectTo:redirect.href,...(draft?{data:{ronda_join_draft:draft}}:{})
        }});
        if(error)throw error;
        if(!data.session){setPassword('');setSent(true);setMessage(combined?'Buka tautan yang dikirim ke '+address+' untuk langsung lanjut ke kamera. Data yang sudah diisi akan terbawa.':'Buka tautan konfirmasi yang dikirim ke '+address+'. Jika belum tiba, periksa Spam atau minta tautan baru.');}
      } else {
        const {error}=await db.auth.signInWithPassword({email:address,password});
        if(error)throw error;
      }
    } catch(err) {
      const code=(err as {code?:string}).code;
      if(combined && err instanceof Error && err.message.startsWith('Masukkan nomor WhatsApp')){setMessage(err.message);return;}
      setNeedsConfirmation(code==='email_not_confirmed' || (mode==='signup' && code==='over_email_send_rate_limit'));
      const errors:Record<string,string>={
        invalid_credentials:'Email atau kata sandi belum cocok. Coba lagi atau pilih Lupa kata sandi.',
        email_not_confirmed:'Konfirmasi email untuk melanjutkan. Jika tautan belum tiba atau kedaluwarsa, pilih Kirim ulang konfirmasi.',
        weak_password:'Gunakan kata sandi yang lebih kuat dan coba lagi.',
        over_email_send_rate_limit:'Batas pengiriman email tercapai. Tunggu sebelum mencoba lagi.',
        same_password:'Pilih kata sandi yang berbeda dari sebelumnya.'
      };
      setMessage(errors[code||''] || 'Permintaan belum berhasil. Periksa koneksi dan coba lagi.');
    } finally {setBusy(false);}
  }
  if(pathname==='/' && !invited && !recovering && !authLink)return <Introduction/>;
  return <div className={whatsappInvite?'auth-layout join-auth':'auth-layout'}>{!whatsappInvite && <aside className="auth-art" aria-label="Ilustrasi ronda malam">
    <div className="art-heading">Presensi<br/>ronda RT<span aria-hidden="true">.</span></div>
    <img src="/ronda-bersama.webp" width="1200" height="900" alt="Tiga bapak berkumpul di pos ronda kompleks perumahan."/>
  </aside>}<section className={whatsappInvite?'auth-card join-registration':'auth-card'}><h1>{sent?'Periksa email Anda':combined?'Pendaftaran warga':titles[mode]}</h1>
    {combined && !sent && <p>Isi data dan buat akun. Setelah email dikonfirmasi, lanjutkan ke kamera untuk mendaftarkan wajah.</p>}
    {invited && !combined && !sent && mode!=='reset' && <p>{whatsappInvite?'Gunakan email Anda untuk melanjutkan pendaftaran warga.':'Masuk atau daftar dengan alamat email yang diundang pengurus.'}</p>}
    {mode==='forgot' && !sent && <p>Masukkan alamat email akun Anda. Kami akan mengirim tautan untuk mengganti kata sandi.</p>}
    <p role="status">{message}</p>
    {googleEnabled && !whatsappInvite && !sent && (mode==='login'||mode==='signup') && <>
      <button className="google-action" disabled={busy} onClick={googleLogin}>Lanjutkan dengan Google</button>
      <div className="email-divider">atau dengan email</div>
    </>}
    {!sent && <form onSubmit={submit}>
      {combined && <>
        <label>Nama warga<input required maxLength={120} autoComplete="name" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
        <label>Nomor WhatsApp<input type="tel" required maxLength={24} autoComplete="tel" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label>
        <label>Alamat rumah<textarea required rows={2} maxLength={300} autoComplete="street-address" value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})}/></label>
      </>}
      {mode!=='reset' && <label>Alamat email<input type="email" autoComplete="email" required value={email} onChange={e=>{setEmail(e.target.value);if(needsConfirmation){setNeedsConfirmation(false);setMessage('');}}}/></label>}
      {mode!=='forgot' && mode!=='resend' && <label>{mode==='reset'?'Kata sandi baru':'Kata sandi'}<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?undefined:8} required value={password} onChange={e=>setPassword(e.target.value)}/>
        {mode!=='login' && <small>Gunakan minimal 8 karakter.</small>}</label>}
      <button disabled={busy}>{busy?'Mohon tunggu…':combined?'Buat akun dan lanjut':actions[mode]}</button>
    </form>}
    {(needsConfirmation || (sent && (mode==='signup'||mode==='resend'))) && <button className="text-action" disabled={busy} onClick={()=>switchTo('resend')}>Kirim ulang konfirmasi</button>}
    {mode==='login' && <><button className="text-action" disabled={busy} onClick={()=>switchTo('forgot')}>Lupa kata sandi?</button>
      <button className="signup-action" disabled={busy} onClick={()=>switchTo('signup')}>Daftar akun baru</button></>}
    {mode!=='login' && mode!=='reset' && <button className="text-action" disabled={busy} onClick={()=>switchTo('login')}>{combined&&!sent?'Sudah punya akun? Masuk':'Kembali ke halaman masuk'}</button>}
  </section></div>;
}
