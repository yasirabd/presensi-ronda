'use client';
import {useEffect,useState} from 'react';

type Area={id:string;name:string};
const levels=[
  {key:'province',label:'Provinsi',endpoint:'provinces'},
  {key:'regency',label:'Kabupaten atau kota',endpoint:'regencies'},
  {key:'district',label:'Kecamatan',endpoint:'districts'},
  {key:'village',label:'Kelurahan atau desa',endpoint:'villages'}
] as const;
type Level=(typeof levels)[number]['key'];
export type Region={rt:string;rw:string}&Record<Level,Area>;
const api='https://www.emsifa.com/api-wilayah-indonesia/v2';

function AreaSelect({label,url,value,onChange}:{label:string;url:string;value?:Area;onChange:(area:Area|undefined)=>void}) {
  const [choices,setChoices]=useState<Area[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [attempt,retry]=useState(0);
  useEffect(()=>{
    const abort=new AbortController();
    setState('loading');
    fetch(url,{signal:abort.signal}).then(async response=>{
      if(!response.ok)throw new Error('Gagal memuat wilayah');
      const payload=await response.json();
      if(!Array.isArray(payload.data))throw new Error('Data wilayah tidak tersedia');
      if(!abort.signal.aborted){setChoices(payload.data.map(({id,name}:Area)=>({id,name})));setState('ready');}
    }).catch(()=>{if(!abort.signal.aborted)setState('error');});
    return ()=>abort.abort();
  },[url,attempt]);
  return <div>
    <label>{label}
      <select required value={value?.id??''} onChange={e=>onChange(choices.find(area=>area.id===e.target.value))}>
        <option value="">{state==='loading'?'Memuat pilihan…':`Pilih ${label.toLowerCase()}`}</option>
        {value && !choices.some(item=>item.id===value.id) && <option value={value.id}>{value.name}</option>}
        {state==='ready' && choices.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}
      </select>
    </label>
    {state==='error' && <button type="button" className="text-action" onClick={()=>retry(n=>n+1)}>Muat ulang pilihan {label.toLowerCase()}</button>}
  </div>;
}

export function RegionFields({initial}:{initial?:Region|null}) {
  const [selected,setSelected]=useState<Partial<Record<Level,Area>>>(initial??{});
  return <>
    <div className="manager-fields">
      <label>Nomor RT<input name="rt-number" required inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} defaultValue={initial?.rt}/></label>
      <label>Nomor RW<input name="rw-number" required inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} defaultValue={initial?.rw}/></label>
    </div>
    {levels.map(({key,label,endpoint},index)=>{
      const parent=index ? selected[levels[index-1].key] : undefined;
      if(index && !parent)return null;
      const url=parent?`${api}/${endpoint}/${parent.id}.json`:`${api}/provinces.json`;
      return <AreaSelect key={url} label={label} url={url} value={selected[key]} onChange={area=>{
        const next={...selected};
        for(const level of levels.slice(index))delete next[level.key];
        if(area)next[key]=area;
        setSelected(next);
      }}/>;
    })}
    <input type="hidden" name="region" value={JSON.stringify(selected)}/>
  </>;
}

export function regionFromForm(form:FormData):Region {
  const {province,regency,district,village}=JSON.parse(String(form.get('region')));
  if(!province||!regency||!district||!village)throw new Error('Pilih wilayah hingga kelurahan atau desa.');
  return {rt:String(form.get('rt-number')),rw:String(form.get('rw-number')),province,regency,district,village};
}
