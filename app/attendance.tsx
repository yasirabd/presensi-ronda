'use client';
import {Download} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

type Row = {id:string; post:string; starts_at:string; ends_at:string; resident_name:string|null; change_id:string|null; reason:string|null; status:string};
const today = new Date();
const currentMonth = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0')].join('-');

function csvCell(value:string) {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'"+value : value;
  return '"'+safe.replaceAll('"','""')+'"';
}

export function Attendance({db,rt,revision}:{db:SupabaseClient;rt:string;revision:number}) {
  const [month,setMonth]=useState(currentMonth);
  const [query,setQuery]=useState('');
  const [rows,setRows]=useState<Row[]>([]);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let active=true;
    setLoading(true); setRows([]);
    if (!month) return;
    const [year,m]=month.split('-').map(Number);
    db.rpc('attendance_report',{target:rt,period_start:new Date(year,m-1,1).toISOString(),period_end:new Date(year,m,1).toISOString()}).then(({data,error})=>{
      if(!active) return;
      setLoading(false);
      if(error) setMessage(error.message);
      else setRows(data);
    });
    return ()=>{active=false};
  },[db,rt,month,refresh,revision]);
  const visible=rows.filter(row=>(row.resident_name||'Nama belum diisi').toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id')));
  function download() {
    const lines=[['Warga','Pos','Mulai (UTC)','Selesai (UTC)','Status'],...visible.map(r=>[(r.resident_name||'Nama belum diisi'),r.post,new Date(r.starts_at).toISOString(),new Date(r.ends_at).toISOString(),r.status])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='ronda-'+rt+'-'+month+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function save(event:FormEvent<HTMLFormElement>,row:Row) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    setSaving(true);
    try {
      const {error}=await db.rpc('record_attendance',{target:rt,shift_key:row.id,attended:form.get('status')==='present',explanation:form.get('reason'),previous_id:row.change_id});
      setMessage(error?.message || 'Catatan presensi tersimpan.');
    } finally {setSaving(false);setRefresh(n=>n+1)}
  }
  return <section><h2>Rekap presensi</h2>
    <label>Bulan presensi<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
    <label>Cari nama warga<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <p role="status">{message}</p>
    {loading?<p>Memuat rekap…</p>:visible.length===0?<p>Belum ada presensi pada periode ini.</p>:<>
      <button className="with-icon" onClick={download}><Download aria-hidden="true"/>Unduh rekap CSV</button>
      {visible.map(row=><details key={row.id}><summary>{row.resident_name||'Nama belum diisi'} · {row.status}<small>{row.post} · {new Date(row.starts_at).toLocaleString('id-ID')}</small></summary>
        {row.reason && <p>Alasan terakhir: {row.reason}</p>}
        {Date.parse(row.starts_at)<=Date.now() && <form onSubmit={e=>save(e,row)}>
          <label>Status<select name="status" defaultValue={row.status==='Tidak hadir'?'absent':'present'}><option value="present">Hadir manual</option><option value="absent" disabled={Date.parse(row.ends_at)>Date.now()}>Tidak hadir</option></select></label>
          <label>Alasan pencatatan atau koreksi<input name="reason" required maxLength={500}/></label>
          <button disabled={saving}>Simpan presensi</button>
        </form>}</details>)}</>}
  </section>;
}
