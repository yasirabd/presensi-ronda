import {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Body, Button, Field} from './ui';

type Area = {id:string; name:string};
const levels = [
  {key:'province', label:'Provinsi', endpoint:'provinces'},
  {key:'regency', label:'Kabupaten atau kota', endpoint:'regencies'},
  {key:'district', label:'Kecamatan', endpoint:'districts'},
  {key:'village', label:'Kelurahan atau desa', endpoint:'villages'}
] as const;
type Level = typeof levels[number]['key'];
export type Region = {rt:string; rw:string} & Record<Level,Area>;

function AreaChoice({label,url,value,onChange}:{
  label:string; url:string; value?:Area; onChange:(value:Area)=>void
}) {
  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState('');
  const [list,setList] = useState<Area[]|null>(null);
  const [failed,setFailed] = useState(false);
  const [attempt,retry] = useState(0);
  useEffect(()=>{
    if(!open)return;
    const controller = new AbortController();
    setFailed(false);
    fetch(url,{signal:controller.signal}).then(async response=>{
      if(!response.ok)throw new Error();
      const result = await response.json();
      if(!Array.isArray(result.data))throw new Error();
      if(!controller.signal.aborted)setList(result.data.map((area:Area)=>({id:String(area.id), name:area.name})));
    }).catch(()=>{if(!controller.signal.aborted)setFailed(true)});
    return ()=>controller.abort();
  },[url,open,attempt]);
  const matches = list?.filter(area=>area.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <View style={{gap:8}}>
    <Body>{label}</Body>
    <Button secondary label={value?.name || 'Pilih '+label.toLowerCase()} onPress={()=>setOpen(!open)}/>
    {open && <>
      <Field label={'Cari '+label.toLowerCase()} value={query} onChangeText={setQuery}/>
      {failed?<Button secondary label="Muat ulang pilihan" onPress={()=>retry(n=>n+1)}/>:list===null?<Body>Memuat pilihan…</Body>:<>
        {matches?.slice(0,12).map(area=><Button secondary key={area.id} label={area.name} onPress={()=>{onChange(area);setOpen(false);setQuery('')}}/>)}
        {matches?.length===0 && <Body>Wilayah tidak ditemukan.</Body>}
        {(matches?.length??0)>12 && <Body>Ketik nama wilayah untuk mempersempit pilihan.</Body>}
      </>}
    </>}
  </View>;
}

export function RegionEditor({initial,onSave,label='Simpan wilayah RT'}:{
  initial?:Region|null; onSave:(region:Region)=>Promise<void>; label?:string
}) {
  const [rt,setRt] = useState(initial?.rt || '');
  const [rw,setRw] = useState(initial?.rw || '');
  const [areas,setAreas] = useState<Partial<Record<Level,Area>>>(initial || {});
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function save() {
    if(busy)return;
    if(!/^\d{1,3}$/.test(rt)||!/^\d{1,3}$/.test(rw)){setMessage('Isi nomor RT dan RW dengan 1 hingga 3 angka.');return}
    const {province,regency,district,village}=areas;
    if(!province||!regency||!district||!village){setMessage('Pilih wilayah hingga kelurahan atau desa.');return}
    setBusy(true);setMessage('');
    try {await onSave({rt,rw,province,regency,district,village});setMessage('Wilayah RT tersimpan.')}
    catch(error){setMessage((error as Error).message || 'Wilayah belum dapat disimpan.')}
    finally{setBusy(false)}
  }
  return <View style={{gap:14}}>
    <Field label="Nomor RT" keyboardType="numeric" value={rt} onChangeText={setRt}/>
    <Field label="Nomor RW" keyboardType="numeric" value={rw} onChangeText={setRw}/>
    {levels.map(({key,label,endpoint},index)=>{
      const parent=index>0?areas[levels[index-1].key]:undefined;
      if(index>0 && !parent)return null;
      const url='https://www.emsifa.com/api-wilayah-indonesia/v2/'+endpoint+(parent?'/'+parent.id:'')+'.json';
      return <AreaChoice key={url} label={label} value={areas[key]} url={url} onChange={area=>{
        const next={...areas};
        for(const level of levels.slice(index+1))delete next[level.key];
        setAreas({...next,[key]:area});
      }}/>;
    })}
    {Boolean(message)&&<Body>{message}</Body>}
    <Button label={busy?'Menyimpan…':label} onPress={save} disabled={busy}/>
  </View>;
}
