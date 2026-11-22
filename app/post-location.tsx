'use client';
import {useEffect, useState, type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {readPosition} from './location';

type Point = {latitude:number; longitude:number; radius_m:number};

export function PostLocation({db,rt,name}:{db:SupabaseClient;rt:string;name:string}) {
  const [point,setPoint]=useState<Point|null>(null);
  const [saved,setSaved]=useState(false);
  const [accuracy,setAccuracy]=useState<number|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState<'load'|'gps'|'save'|null>('load');

  useEffect(()=>{
    let active=true;
    db.from('post_locations').select('latitude,longitude,radius_m').eq('rt_id',rt).eq('post',name).maybeSingle().then(({data,error})=>{
      if(!active)return;
      if(error)setMessage('Lokasi tersimpan gagal dimuat. Muat ulang halaman untuk mencoba lagi.');
      else {
        setPoint(data);
        setSaved(Boolean(data));
        setBusy(null);
      }
    });
    return ()=>{active=false};
  },[db,rt,name]);

  async function capture() {
    setBusy('gps');
    setMessage('Mencari lokasi perangkat…');
    try {
      const {coords}=await readPosition();
      const meters=Math.ceil(coords.accuracy);
      if(meters>50){
        setMessage(`Akurasi sekitar ${meters} meter. Pindah ke tempat terbuka dekat pos, lalu coba lagi.`);
        return;
      }
      setPoint(previous=>({latitude:coords.latitude,longitude:coords.longitude,radius_m:previous?.radius_m??75}));
      setSaved(false);
      setAccuracy(meters);
      setMessage('Periksa titik yang terbaca, lalu simpan lokasi pos.');
    } catch(error) {
      setMessage(error instanceof Error?error.message:'Lokasi gagal dibaca. Coba lagi.');
    } finally {
      setBusy(null);
    }
  }

  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!point || busy)return;
    const radius_m=Number(new FormData(event.currentTarget).get('radius'));
    setBusy('save');
    try {
      const {error}=await db.from('post_locations').upsert({rt_id:rt,post:name,...point,radius_m});
      if(error)throw error;
      setPoint({...point,radius_m});
      setSaved(true);
      setMessage('Lokasi pos tersimpan.');
    } catch {
      setMessage('Lokasi gagal disimpan. Coba lagi.');
    } finally {
      setBusy(null);
    }
  }

  return <section>
    <h2>Lokasi pos ronda</h2>
    <p>Pos <strong>{name}</strong>. Ambil titik saat Anda berada di pos ronda.</p>
    <button type="button" className="location-capture" disabled={Boolean(busy)} onClick={capture}>Gunakan lokasi sekarang</button>
    <p role="status">{message || (busy==='load'?'Memuat lokasi pos…':saved?'Lokasi pos sudah tersimpan.':'Lokasi pos belum diatur.')}</p>
    {point && <form onSubmit={save}>
      <p className="location-coordinates">
        <strong>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</strong>
        {accuracy!==null && <small>Akurasi perangkat ±{accuracy} m</small>}
      </p>
      <details><summary>Atur radius presensi</summary>
        <label>Radius dalam meter<input type="number" min="10" max="500" required disabled={Boolean(busy)}
          key={point.radius_m} defaultValue={point.radius_m} name="radius" /></label>
      </details>
      <button disabled={Boolean(busy)}>{busy==='save'?'Menyimpan…':'Simpan lokasi pos'}</button>
    </form>}
  </section>;
}
