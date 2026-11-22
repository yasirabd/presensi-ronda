import {NightLogin} from './NightScene';
import {useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import Capture,{jpegBytes} from './Capture';
import {apiUrl, db} from './client';
import {Body,Button,Card,Field,Title} from './ui';

export const uuid=/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
export const draftMetadata='ronda_join_draft_id';
export type Profile={name:string;phone:string;address:string};
export const emptyProfile:Profile={name:'',phone:'',address:''};
export type Face=string|null;
export type SavedDraft={id:string;email:string;profile:Profile;face:Face};
type Invitation={rt:string;room:string;name:string;phone:string;address:string|null;submitted:boolean};

export function ProfileFields({profile,change}:{profile:Profile;change:(profile:Profile)=>void}){
  return <>
    <Field label="Nama warga" value={profile.name} onChangeText={name=>change({...profile,name})}/>
    <Field label="Nomor WhatsApp" keyboardType="phone-pad" value={profile.phone} onChangeText={phone=>change({...profile,phone})}/>
    <Field label="Alamat rumah" value={profile.address} onChangeText={address=>change({...profile,address})}/>
  </>;
}

export function FaceField({face,change}:{face:Face;change:(face:Face)=>void}){
  const [camera,setCamera]=useState(false);
  return <View style={{gap:10}}>
    {face ? <>
      <Body>{face==='later'?'Anda perlu merekam wajah sebelum presensi mandiri pertama.':'Wajah sudah direkam.'}</Body>
      <Button secondary label={face==='later'?'Rekam wajah sekarang':'Rekam ulang'} onPress={()=>change(null)}/>
    </> : camera ? <Capture onCancel={()=>setCamera(false)} onCapture={photo=>{change(photo);setCamera(false)}}/> : <>
      <Body>Saya setuju templat wajah terenkripsi digunakan untuk presensi di RT ini. Foto tidak disimpan.</Body>
      <Button secondary label="Setuju dan buka kamera" onPress={()=>setCamera(true)}/>
      <Button secondary label="Daftar tanpa rekam wajah" onPress={()=>change('later')}/>
    </>}
  </View>;
}

export async function stageJoin(code:string,email:string,profile:Profile,face:Face):Promise<string>{
  if(!face)throw new Error('Rekam wajah atau pilih Daftar tanpa rekam wajah.');
  const raw=profile.phone.trim();
  const phone=raw.replace(/\D/g,'').replace(/^0/,'62');
  if(!/^\+?[0-9\s().-]+$/.test(raw)||!(/^[1-9][0-9]{7,14}$/.test(phone)))
    throw new Error('Masukkan nomor WhatsApp dengan kode negara atau awalan 08.');
  if(!profile.name.trim()||profile.name.trim().length>120||!profile.address.trim()||profile.address.trim().length>300)
    throw new Error('Isi nama warga (maksimal 120 karakter) dan alamat rumah (maksimal 300 karakter).');
  // React Native cannot construct a Blob from binary data on every platform.
  // Construct the multipart body directly so captured images never enter the photo library.
  const boundary='RondaPak'+Date.now().toString(36)+Math.random().toString(36).slice(2);
  const encoder=new TextEncoder();
  const chunks:Uint8Array[]=[];
  const add=(value:string)=>chunks.push(encoder.encode(value));
  for(const [key,value] of Object.entries({...profile,phone,code,email,...(face==='later'?{}:{consent:'v1'})}))
    add('--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+'"\r\n\r\n'+value+'\r\n');
  if(face!=='later'){
    add('--'+boundary+'\r\nContent-Disposition: form-data; name="photo"; filename="kamera.jpg"\r\nContent-Type: image/jpeg\r\n\r\n');
    chunks.push(jpegBytes(face));add('\r\n');
  }
  add('--'+boundary+'--\r\n');
  const body=new Uint8Array(chunks.reduce((n,chunk)=>n+chunk.byteLength,0));
  let offset=0;
  for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
  const response=await fetch(apiUrl('/api/join-registration'),{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary='+boundary},body:body.buffer});
  const data=await response.json();
  if(!response.ok||typeof data.draft!=='string')throw new Error(data.error||'Pendaftaran belum dapat disimpan.');
  return data.draft;
}

async function submitJoin(code:string,draft:string,token:string){
  return fetch(apiUrl('/api/join-registration'),{method:'POST',headers:{
    'Content-Type':'application/json',Authorization:'Bearer '+token
  },body:JSON.stringify({code,draft})});
}

export function CodeJoin({initial,onDone}:{initial:string;onDone:()=>void}){
  const [code,setCode]=useState(initial),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [attempt,retry]=useState(0);
  useEffect(()=>{
    let current=true;
    setName('');setMessage('');
    if(uuid.test(code)){
      setMessage('Memeriksa undangan…');
      void db.rpc('preview_invite',{code}).then(({data,error})=>{
        if(current){setName(data||'');setMessage(error?'Undangan belum bisa diperiksa.':data?'':'Undangan tidak dapat digunakan. Masuk dengan email yang diundang atau minta tautan baru.')}
      });
    }
    return ()=>{current=false};
  },[code,attempt]);
  async function join(){
    if(!name||busy)return;
    setBusy(true);
    try{const {error}=await db.rpc('join_rt',{code});if(error)throw error;onDone()}
    catch(error){setMessage((error as Error).message||'Pengajuan belum berhasil.')}
    finally{setBusy(false)}
  }
  return <NightLogin><Card><Title>Gabung melalui undangan</Title>
    <Field label="Kode undangan" value={code} onChangeText={value=>{setName('');setCode(value.trim())}}/>
    {Boolean(name)&&<Body>Undangan dari {name}</Body>}
    {Boolean(message)&&<Body>{message}</Body>}
    {message==='Undangan belum bisa diperiksa.'&&<Button secondary label="Coba lagi" onPress={()=>retry(n=>n+1)}/>}
    <Button label="Gabung RT" onPress={join} disabled={!name||busy}/>
    <Button secondary label="Kembali" onPress={onDone}/>
  </Card></NightLogin>;
}

export function WhatsAppJoin({code,requested,onDone}:{code:string;requested?:string;onDone:()=>void}){
  const [invite,setInvite]=useState<Invitation|null>(null);
  const [step,setStep]=useState<'loading'|'unavailable'|'details'|'legacy'|'done'>('loading');
  const [profile,setProfile]=useState<Profile>(emptyProfile),[face,setFace]=useState<Face>(null);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[attempt,retry]=useState(0);
  const [cancel,setCancel]=useState(false),[retryable,setRetryable]=useState(false);
  const staged=useRef<SavedDraft|null>(null);
  useEffect(()=>{
    let current=true;
    async function load(){
      setStep('loading');setMessage('');setRetryable(false);
      try {
        if(!uuid.test(code)){setStep('unavailable');return}
        const first=await db.rpc('registration_invite',{code});
        if(first.error)throw first.error;
        let invitation=first.data as Invitation|null;
        if(!invitation){if(current)setStep('unavailable');return}
        const {data:{session}}=await db.auth.getSession();
        const meta=session?.user.user_metadata;
        const draft=requested??meta?.[draftMetadata];
        let next:'details'|'legacy'|'done'=invitation.submitted?'done':invitation.address?'legacy':'details';
        if(next!=='done'&&session&&typeof draft==='string'&&uuid.test(draft)){
          const response=await submitJoin(code,draft,session.access_token);
          if(response.ok)next='done';
          else if(response.status!==410||requested){
            if(current){setMessage((await response.json()).error);setRetryable(response.status>=500);setStep('unavailable')}
            return;
          }
        }
        if(next==='done' && typeof draft==='string'&&meta?.[draftMetadata]===draft){
          void db.auth.updateUser({data:{[draftMetadata]:null}}).catch(()=>{});
        }else if(next==='details'&&meta?.ronda_join_draft&&session){
          const response=await fetch(apiUrl('/api/join-draft'),{method:'POST',headers:{
            Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'
          },body:JSON.stringify({code})});
          if(response.ok){
            const restored=await db.rpc('registration_invite',{code});
            if(restored.error||!restored.data)throw new Error('Draf lama belum dapat dimuat.');
            invitation=restored.data as Invitation;
            next=invitation.submitted?'done':'legacy';
            void db.auth.updateUser({data:{ronda_join_draft:null}}).catch(()=>{});
          }else if(response.status!==404 && response.status!==410)throw new Error('Draf lama belum dapat dimuat.');
        }
        if(current){setInvite(invitation);setProfile({name:invitation.name||'',phone:invitation.phone?'+'+invitation.phone:'',address:invitation.address||''});setStep(next)}
      }catch{if(current){setMessage('Pendaftaran belum dapat dimuat.');setRetryable(true);setStep('unavailable')}}
    }
    void load();return ()=>{current=false};
  },[code,requested,attempt]);

  async function submit(){
    if(busy||!invite)return;
    setBusy(true);setMessage('');
    try{
      const {data:{session}}=await db.auth.getSession();
      if(!session?.user.email)throw new Error('Masuk kembali dengan email yang dikonfirmasi.');
      if(!face)throw new Error('Rekam wajah atau pilih Daftar tanpa rekam wajah.');
      if(step==='legacy'){
        if(face==='later'){
          const {error}=await db.rpc('save_join_request',{code,full_name:profile.name,phone:invite.phone,address:profile.address,without_face:true});
          if(error)throw error;
        }else{
          const response=await fetch(apiUrl('/api/face'),{method:'POST',headers:{
            Authorization:'Bearer '+session.access_token,'x-action':'enroll','x-rt':invite.rt,
            'x-join-invite':code,'x-consent':'v1','Content-Type':'image/jpeg'
          },body:jpegBytes(face).buffer});
          if(!response.ok)throw new Error((await response.json()).error);
        }
      }else{
        const previous=staged.current;
        const id=previous?.profile===profile && previous.face===face?previous.id:await stageJoin(code,session.user.email,profile,face);
        staged.current={id,email:session.user.email,profile,face};
        const response=await submitJoin(code,id,session.access_token);
        if(!response.ok){if(response.status===410)staged.current=null;throw new Error((await response.json()).error)}
      }
      setFace(null);staged.current=null;setStep('done');
    }catch(error){setMessage((error as Error).message||'Pengajuan belum dapat disimpan.')}
    finally{setBusy(false)}
  }
  async function cancelRequest(){
    if(busy)return;
    setBusy(true);setMessage('');
    try{const {error}=await db.rpc('cancel_join_request',{code});if(error)throw error;onDone()}
    catch(error){setMessage((error as Error).message||'Pengajuan belum dapat dibatalkan.')}
    finally{setBusy(false)}
  }
  return <NightLogin><Card>
    {invite&&<Body>{invite.room}</Body>}
    <Title>{step==='done'?'Menunggu persetujuan pengurus':step==='legacy'?'Daftarkan wajah':'Pendaftaran warga'}</Title>
    {step==='loading'&&<Body>Memeriksa pendaftaran…</Body>}
    {step==='unavailable'&&!message&&<Body>Undangan sudah tidak berlaku. Minta tautan baru ke pengurus atau kembali ke Ronda Pak jika Anda sudah disetujui.</Body>}
    {step==='details'&&<ProfileFields profile={profile} change={setProfile}/>}
    {step==='legacy'&&<><Body>Email sudah dikonfirmasi. Selesaikan pendaftaran Anda.</Body><Button secondary label="Ubah data" onPress={()=>setStep('details')}/></>}
    {(step==='legacy'||step==='details')&&<><FaceField face={face} change={setFace}/><Button disabled={busy} label={busy?'Mengirim…':'Kirim pengajuan'} onPress={submit}/></>}
    {step==='done'&&<>
      <Body>Pengajuan sudah diterima. Setelah pengurus menyetujuinya, Anda bisa membuka ruang RT.</Body>
      {cancel?<><Body>Batalkan pengajuan dan hapus data pendaftaran ini?</Body>
        <Button disabled={busy} label="Ya, batalkan pengajuan" onPress={cancelRequest}/>
        <Button secondary label="Pertahankan pengajuan" onPress={()=>setCancel(false)}/></>:<Button secondary label="Batalkan pengajuan" onPress={()=>setCancel(true)}/>}
    </>}
    {Boolean(message)&&<Body>{message}</Body>}
    {retryable&&<Button secondary label="Coba lagi" onPress={()=>retry(n=>n+1)}/>}
    {(step==='unavailable'||step==='done')&&<Button secondary label="Kembali ke Ronda Pak" onPress={onDone}/>}
  </Card></NightLogin>;
}
