import {useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Body,Button} from './ui';

export type Member = {
  user_id:string; email:string; role:string; resident_name:string|null;
  home_address:string|null; whatsapp:string|null;
};
type Result<T>={data:T;error:{message:string}|null};

export function checked<T>(result:Result<T>):T {
  if(result.error)throw new Error(result.error.message);
  return result.data;
}

function errorText(error:unknown) {
  return error instanceof Error ? error.message : 'Gagal terhubung. Coba lagi.';
}

// The caller memoizes load with the RT and other server-side filters.
export function useRead<T>(load:()=>Promise<T>,revision:number,keepPrevious=false) {
  const [data,setData]=useState<T|null>(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;
    if(!keepPrevious)setData(null);
    setError('');
    load().then(value=>{if(active)setData(value)}).catch(reason=>{if(active)setError(errorText(reason))});
    return ()=>{active=false};
  },[load,revision,retry,keepPrevious]);
  return {data,error,reload:()=>setRetry(n=>n+1)};
}

export function LoadState({error,reload}:{error:string;reload:()=>void}) {
  return error ? <><Body>{error}</Body><Button label="Coba lagi" secondary onPress={reload}/></> : <Body>Memuat…</Body>;
}

export function useWork() {
  const locked=useRef(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function run(task:()=>Promise<void>,success='') {
    if(locked.current)return;
    locked.current=true;
    setBusy(true);
    setMessage('');
    try {await task();setMessage(success)}
    catch (error) {setMessage(errorText(error))}
    finally {locked.current=false;setBusy(false)}
  }
  return {busy,message,run};
}

export function Choices<T extends string>({items,value,select}:{items:readonly T[];value:T;select:(item:T)=>void}) {
  return <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{items.map(item=>
    <Button key={item} label={item} secondary={value!==item} onPress={()=>select(item)}/>)}</View>;
}

// Older report and history RPCs return a legacy label for pending attendance.
export function statusPresensi(status:string) {
  return status === 'Belum absen' ? 'Belum presensi' : status;
}
