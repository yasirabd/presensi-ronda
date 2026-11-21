'use client';
import {useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

type Props={db:SupabaseClient;rt:string;shift?:string;locationSession?:string;onDone:(time:string)=>void};
export function FaceCamera({db,rt,shift,locationSession,onDone}:Props){
  const video=useRef<HTMLVideoElement>(null);
  const stream=useRef<MediaStream|null>(null);
  const mounted=useRef(false);
  const [active,setActive]=useState(false);
  const [busy,setBusy]=useState(false);
  const [consent,setConsent]=useState(false);
  const [message,setMessage]=useState('');
  function stop(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setActive(false)}
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;stream.current?.getTracks().forEach(t=>t.stop())}},[]);
  async function open(){
    setBusy(true);
    try{
      const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640}},audio:false});
      if(!mounted.current){media.getTracks().forEach(t=>t.stop());return}
      stream.current=media;video.current!.srcObject=media;await video.current!.play();setActive(true);setMessage('');
    }catch{stop();setMessage('Izinkan kamera di browser atau minta bantuan pengurus.')}finally{setBusy(false)}
  }
  async function capture(){
    setBusy(true);setMessage('Memeriksa wajah…');
    try{
      const source=video.current!;
      const scale=Math.min(1,640/Math.max(source.videoWidth,source.videoHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.round(source.videoWidth*scale);canvas.height=Math.round(source.videoHeight*scale);
      canvas.getContext('2d')!.drawImage(source,0,0,canvas.width,canvas.height);
      const frame=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88));
      if(!frame)throw new Error('Gambar kamera belum siap.');
      const {data:{session}}=await db.auth.getSession();
      if(!session)throw new Error('Silakan masuk kembali.');
      const response=await fetch('/api/face',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'x-rt':rt,'x-action':shift?'verify':'enroll','x-location-session':locationSession||'','x-shift':shift||'','x-consent':consent?'v1':''},body:frame});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      stop();onDone(result.time);
    }catch(e){setMessage(e instanceof Error?e.message:'Verifikasi gagal.')}finally{setBusy(false)}
  }
  return <div>{!shift && <label><input type="checkbox" checked={consent} disabled={active} onChange={e=>setConsent(e.target.checked)}/>Saya setuju mendaftarkan templat wajah terenkripsi untuk presensi RT ini. Foto hanya diproses selama pemeriksaan. Saya dapat menarik persetujuan di sini.</label>}
    <video hidden={!active} ref={video} playsInline muted style={{width:'100%'}}/>
    {active?<><button disabled={busy} onClick={capture}>{shift?'Verifikasi kehadiran':'Simpan pendaftaran wajah'}</button><button disabled={busy} onClick={stop}>Tutup kamera</button></>:<button disabled={busy||(!shift&&!consent)} onClick={open}>Buka kamera depan</button>}
    <p role="status">{message}</p></div>;
}

export function FaceRegistration({db,rt}:{db:SupabaseClient;rt:string}){
  const [status,setStatus]=useState('loading'),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;db.rpc('face_status',{target:rt}).then(({data,error})=>{
    if(active)setStatus(error?'error':data)
  });return ()=>{active=false}},[db,rt]);
  return <details><summary>Pendaftaran wajah saya</summary>
    {status==='approved' && <FaceCamera db={db} rt={rt} onDone={()=>{setStatus('ready');setMessage('Wajah terdaftar.')}}/>}
    {status==='pending' && <p>Minta pengurus memeriksa identitas Anda sebelum mendaftar. Anda juga bisa menggunakan presensi manual.</p>}
    {status==='ready' && <><p>Siap absen mandiri. Anda bisa menghapus templat wajah dan beralih ke presensi manual.</p><button onClick={async()=>{
      const {error}=await db.rpc('withdraw_face',{target:rt});if(error)setMessage(error.message);else{setStatus('pending');setMessage('Templat dihapus.')}
    }}>Tarik persetujuan dan hapus templat</button></>}
    {status==='error' && <p>Gagal memuat status. Muat ulang halaman.</p>}<p role="status">{message}</p></details>;
}
