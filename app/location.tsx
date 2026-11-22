'use client';
import {MapPinCheck} from 'lucide-react';
import {FaceCamera} from './face';
import {useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

export function readPosition() {
  return new Promise<GeolocationPosition>((resolve,reject)=>{
    if (!navigator.geolocation) return reject(new Error('Lokasi tidak tersedia di browser ini.'));
    navigator.geolocation.getCurrentPosition(resolve,error=>{
      const message = error.code===1
        ? 'Izinkan akses lokasi di pengaturan browser, lalu coba lagi.'
        : 'Lokasi belum terbaca. Coba lagi di tempat terbuka.';
      reject(new Error(message));
    },{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  });
}

export function LocationCheck({db,rt,onAttendance}:{db:SupabaseClient;rt:string;onAttendance:()=>void}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [proof,setProof]=useState<{shift:string;session:string}|null>(null);
  const [recorded,setRecorded]=useState(false);
  async function check() {
    setProof(null);setBusy(true);setMessage('Memeriksa lokasi…');
    try {
      const position=await readPosition();
      const {latitude,longitude,accuracy}=position.coords;
      const {data,error}=await db.rpc('start_attendance',{target:rt,lat:latitude,lon:longitude,accuracy_m:accuracy,sampled_at:new Date(position.timestamp).toISOString()});
      if(error) throw new Error(error.message);
      if(data.status==='inside')setProof({shift:data.shift_id,session:data.session_id});
      if(data.status==='already_recorded')setRecorded(true);
      const responses:Record<string,string>={
        already_recorded:'Presensi hari ini sudah tercatat.',
        inside:'Lokasi sesuai. Lanjutkan dengan kamera depan.',
        outside:'Dekati pos ronda, lalu coba lagi.',
        uncertain:'Lokasi kurang akurat. Pindah ke tempat terbuka, lalu coba lagi.'
      };
      setMessage(responses[data.status] || 'Gagal memeriksa lokasi. Coba lagi.');
    } catch(error) {setMessage(error instanceof Error?error.message:'Gagal memeriksa lokasi.')}
    finally {setBusy(false)}
  }
  return <>
    {!proof && !recorded && <>
      <small>Izinkan lokasi untuk memeriksa jarak ke pos ronda.</small>
      <button className="with-icon" disabled={busy} onClick={check}><MapPinCheck aria-hidden="true"/>{busy?'Memeriksa lokasi…':'Absen sekarang'}</button>
    </>}
    <p role="status">{message}</p>
    {proof && <>
      <FaceCamera key={proof.session} db={db} rt={rt} shift={proof.shift} locationSession={proof.session} onDone={time=>{
        setRecorded(true);setProof(null);setMessage('Hadir · '+new Date(time).toLocaleString('id-ID'));onAttendance();
      }}/>
      <button className="text-action" onClick={()=>{setProof(null);setMessage('Silakan periksa kembali lokasi Anda.')}}>Ulangi pemeriksaan lokasi</button>
    </>}
  </>;
}
