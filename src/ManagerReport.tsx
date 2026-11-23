import { useOwl } from './ui';
import {useCallback,useState} from 'react';
import {Platform,View} from 'react-native';
import {db} from './client';
import {Body,Button,Card,Field,Title} from './ui';
import {statusPresensi,checked,Choices,LoadState,useRead,useWork} from './manager-common';

type Row={id:string;post:string;starts_at:string;ends_at:string;resident_name:string|null;change_id:string|null;reason:string|null;status:string};
const resident=(row:Row)=>row.resident_name||'Nama belum diisi';
function monthKey(date:Date) {
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
}

function csvCell(value:string) {
  const safe=/^\s*[=+@-]|^[\t\r\n]/.test(value)?"'"+value:value;
  return '"'+safe.replace(/"/g,'""')+'"';
}

async function exportReport(rows:Row[],filename:string){
  const lines=[['Warga','Pos','Mulai (UTC)','Selesai (UTC)','Status'],
    ...rows.map(r=>[resident(r),r.post,new Date(r.starts_at).toISOString(),new Date(r.ends_at).toISOString(),statusPresensi(r.status)])];
  const csv='\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n');
  if(Platform.OS==='web'){
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download=filename;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    return;
  }
  const [fs,sharing]=await Promise.all([import('expo-file-system/legacy'),import('expo-sharing')]);
  if(!fs.cacheDirectory||!(await sharing.isAvailableAsync()))throw new Error('Berbagi berkas belum tersedia pada perangkat ini.');
  const uri=fs.cacheDirectory+filename;
  await fs.writeAsStringAsync(uri,csv);
  try {await sharing.shareAsync(uri,{mimeType:'text/csv',UTI:'public.comma-separated-values-text',dialogTitle:'Bagikan rekap presensi'})}
  finally {await fs.deleteAsync(uri,{idempotent:true})}
}

function RecordRow({rt,row,changed}:{rt:string;row:Row;changed:()=>void}) {
  const theme = useOwl();
  const [open,setOpen]=useState(false);
  const [status,setStatus]=useState(row.status==='Tidak hadir'?'Tidak hadir':'Hadir manual');
  const [reason,setReason]=useState('');
  const work=useWork();
  return <View style={{gap:8,paddingVertical:8,borderTopWidth:1,borderTopColor:theme.border}}>
    <Title>{resident(row)}</Title><Body>{statusPresensi(row.status)} · {row.post} · {new Date(row.starts_at).toLocaleString('id-ID')}</Body>
    <Button secondary label={open?'Tutup catatan':'Lihat catatan'} onPress={()=>setOpen(!open)}/>
    {open&&<>
      {row.reason&&<Body>Alasan terakhir · {row.reason}</Body>}
      {Date.parse(row.starts_at)<=Date.now()&&<>
        <Choices items={Date.parse(row.ends_at)<=Date.now()?['Hadir manual','Tidak hadir']:['Hadir manual']} value={status} select={setStatus}/>
        <Field label="Alasan pencatatan atau koreksi" value={reason} onChangeText={setReason}/>
        <Button label="Simpan presensi" disabled={work.busy||!reason.trim()||reason.trim().length>500} onPress={()=>work.run(async()=>{
          checked(await db.rpc('record_attendance',{target:rt,shift_key:row.id,attended:status==='Hadir manual',explanation:reason.trim(),previous_id:row.change_id}));
          setReason('');changed();
        },'Catatan presensi tersimpan.')}/>
      </>}
    </>}
    {work.message&&<Body>{work.message}</Body>}
  </View>;
}

function ReportPeriod({rt,month,search}:{rt:string;month:string;search:string}){
  const [revision,setRevision]=useState(0);
  const load=useCallback(async()=>{
    const [year,m]=month.split('-').map(Number);
    return checked(await db.rpc('attendance_report',{target:rt,period_start:new Date(year,m-1,1).toISOString(),period_end:new Date(year,m,1).toISOString()})) as Row[];
  },[rt,month]);
  const state=useRead(load,revision,true);
  const work=useWork();
  if(state.error||!state.data)return <LoadState {...state}/>;
  const visible=state.data.filter(r=>resident(r).toLocaleLowerCase('id').includes(search.trim().toLocaleLowerCase('id')));
  if(!visible.length)return <Body>Belum ada presensi yang sesuai pada periode ini.</Body>;
  return <>
    <Button secondary label={Platform.OS==='web'?'Unduh rekap CSV':'Bagikan rekap CSV'} disabled={work.busy} onPress={()=>work.run(()=>exportReport(visible,'ronda-'+rt+'-'+month+'.csv'))}/>
    {work.message&&<Body>{work.message}</Body>}
    <Button secondary label="Muat ulang rekap" onPress={()=>setRevision(n=>n+1)}/>
    {visible.map(row=><RecordRow key={row.id} rt={rt} row={row} changed={()=>setRevision(n=>n+1)}/>)}
  </>;
}

export function ManagerReport({rt}:{rt:string}){
  const [month,setMonth]=useState(()=>monthKey(new Date()));
  const [search,setSearch]=useState('');
  const valid=/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month);
  function move(offset:number){
    const [year,m]=month.split('-').map(Number);
    setMonth(monthKey(new Date(year,m-1+offset,1)));
  }
  return <Card><Title>Rekap presensi</Title>
    <Field label="Bulan presensi (YYYY-MM)" value={month} onChangeText={setMonth}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      <Button secondary label="Bulan sebelumnya" disabled={!valid} onPress={()=>move(-1)}/>
      <Button secondary label="Bulan berikutnya" disabled={!valid} onPress={()=>move(1)}/>
    </View>
    <Field label="Cari nama warga" value={search} onChangeText={setSearch}/>
    {valid?<ReportPeriod key={month} rt={rt} month={month} search={search}/>:<Body>Isi tahun dan bulan, misalnya 2026-11.</Body>}
  </Card>;
}
