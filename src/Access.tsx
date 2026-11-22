import {useEffect,useRef,useState} from 'react';
import {Linking,Platform} from 'react-native';
import {db,publicUrl} from './client';
import {Body,Button,Card,Field,Screen,Title} from './ui';
import {NightLogin} from './NightScene';
import {RegionEditor} from './RegionEditor';
import {CodeJoin,draftMetadata,emptyProfile,FaceField,ProfileFields,stageJoin,uuid,WhatsAppJoin,type Face,type SavedDraft} from './JoinRegistration';

type AccessProps={
  mode:'login'|'signup'|'setup'|'join'|'reset';params:Record<string,string>;
  onDone:(rt?:string)=>void;onLogin:()=>void;onRegister:()=>void
};
type AuthMode='login'|'signup'|'forgot'|'reset'|'resend';
const titles={login:'Masuk ke Ronda Pak',signup:'Buat akun pengurus RT',forgot:'Lupa kata sandi?',reset:'Buat kata sandi baru',resend:'Kirim ulang konfirmasi'};
const buttons={login:'Masuk',signup:'Buat akun',forgot:'Kirim tautan pemulihan',reset:'Simpan kata sandi baru',resend:'Kirim ulang email'};
const errors:Record<string,string>={
  invalid_credentials:'Email atau kata sandi belum cocok. Coba lagi atau pilih Lupa kata sandi.',
  email_not_confirmed:'Konfirmasi email untuk melanjutkan. Anda bisa mengirim ulang tautan konfirmasi.',
  user_already_exists:'Email sudah terdaftar. Masuk untuk melanjutkan.',
  weak_password:'Gunakan kata sandi yang lebih kuat.',
  over_email_send_rate_limit:'Batas pengiriman email tercapai. Tunggu sebelum mencoba lagi.',
  same_password:'Pilih kata sandi yang berbeda dari sebelumnya.'
};

export default function Access(props:AccessProps){
  if(props.mode==='setup')return <Screen form><Card><Title>Siapkan RT Anda</Title>
    <Body>Isi nomor RT, RW, dan wilayah untuk membuat ruang RT dan mengundang warga.</Body>
    <RegionEditor label="Buat RT" onSave={async details=>{
      const {data: room,error}=await db.rpc('create_rt_with_region',{details});
      if(error)throw error;
      props.onDone(room);
    }}/>
    <Button secondary label="Kembali" onPress={props.onDone}/>
  </Card></Screen>;
  if(props.mode==='join')return props.params.wa==='1'
    ? <WhatsAppJoin code={props.params.undangan||''} requested={props.params.pendaftaran} onDone={props.onDone}/>
    : <CodeJoin initial={props.params.undangan||''} onDone={props.onDone}/>;
  return <Auth key={props.mode+'-'+(props.params.undangan||'')} {...props} initial={props.mode}/>;
}

function Auth({initial,params,onDone,onRegister,onLogin}:AccessProps&{initial:'login'|'signup'|'reset'}){
  const [mode,switchMode]=useState<AuthMode>(initial);
  const [invalid,setInvalid]=useState<'email'|'password'|null>(null);
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [profile,setProfile]=useState(emptyProfile),[face,setFace]=useState<Face>(null);
  const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[resend,setResend]=useState(false);
  const [message,setMessage]=useState(params.error?'Tautan konfirmasi belum berhasil diproses. Masuk kembali atau kirim ulang email.':'');
  const [google,setGoogle]=useState(false);
  const staged=useRef<SavedDraft|null>(null);
  const code=params.undangan||'',wa=params.wa==='1';
  const [status,setStatus]=useState<'loading'|'active'|'invalid'|'error'>('loading'),[attempt,retry]=useState(0);
  const manager=!code&&!wa&&(initial==='signup'||params['siapkan-rt']==='1');
  const combined=wa&&mode==='signup';
  useEffect(()=>{
    if(!wa||initial==='reset')return;
    let current=true;
    setStatus('loading');
    if(!uuid.test(code))setStatus('invalid');
    else void db.rpc('whatsapp_invite_available',{code}).then(({data,error})=>{
      if(current)setStatus(error?'error':data===true?'active':'invalid');
    });
    return ()=>{current=false};
  },[wa,initial,code,attempt]);
  useEffect(()=>{
    if(wa)return;
    const controller=new AbortController();
    fetch(process.env.EXPO_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{headers:{
      apikey:process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||''
    },signal:controller.signal}).then(r=>r.ok?r.json():null).then(settings=>{
      if(!controller.signal.aborted)setGoogle(settings?.external?.google===true);
    }).catch(()=>{});
    return ()=>controller.abort();
  },[wa]);
  function change(next:AuthMode){
    setInvalid(null);setPassword('');setSent(false);setMessage('');setResend(false);switchMode(next);
  }
  function returnUrl(native=false){
    const url=new URL(native?'rondapak://masuk':publicUrl('/'));
    if(code)url.searchParams.set('undangan',code);
    if(wa){url.searchParams.set('wa','1');if(params.pendaftaran)url.searchParams.set('pendaftaran',params.pendaftaran)}
    if(manager)url.searchParams.set('siapkan-rt','1');
    return url;
  }
  async function googleLogin(){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const native=Platform.OS!=='web';
      const {data,error}=await db.auth.signInWithOAuth({provider:'google',options:{
        redirectTo:returnUrl(native).href,skipBrowserRedirect:native,queryParams:{prompt:'select_account'}
      }});
      if(error)throw error;
      if(native&&data.url)await Linking.openURL(data.url);
    }catch{setMessage('Google belum bisa dibuka. Coba lagi atau masuk dengan email.')}
    finally{setBusy(false)}
  }
  async function submit(){
    if(busy)return;
    setInvalid(null);
    const address=email.trim();
    if(mode!=='reset'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setInvalid('email');setMessage('Masukkan alamat email yang valid.');return}
    if((mode==='signup'||mode==='reset')&&password.length<8){setInvalid('password');setMessage('Gunakan kata sandi minimal 8 karakter.');return}
    if(mode==='login'&&!password){setInvalid('password');setMessage('Masukkan kata sandi Anda.');return}
    setBusy(true);setMessage('');setResend(false);
    try{
      if(mode==='login'){
        const {error}=await db.auth.signInWithPassword({email:address,password});if(error)throw error;
      }else if(mode==='reset'){
        const {error}=await db.auth.updateUser({password});if(error)throw error;
        setPassword('');onDone();
      }else if(mode==='forgot'){
        const url=returnUrl();url.searchParams.set('pemulihan','1');
        const {error}=await db.auth.resetPasswordForEmail(address,{redirectTo:url.href});if(error)throw error;
        setMessage('Jika email terdaftar, tautan pemulihan akan dikirim ke '+address+'. Periksa juga folder Spam.');setSent(true);
      }else if(mode==='resend'){
        const url=returnUrl();
        if(wa&&staged.current?.email===address.toLowerCase())url.searchParams.set('pendaftaran',staged.current.id);
        const {error}=await db.auth.resend({type:'signup',email:address,options:{emailRedirectTo:url.href}});if(error)throw error;
        setMessage('Jika akun masih menunggu konfirmasi, tautan akan dikirim ke '+address+'. Periksa juga folder Spam.');setSent(true);
      }else{
        const url=returnUrl();
        let draft:string|undefined;
        if(combined){
          const previous=staged.current,normalized=address.toLowerCase();
          draft=previous?.profile===profile&&previous.face===face&&previous.email===normalized?previous.id:await stageJoin(code,normalized,profile,face);
          staged.current={id:draft,profile,face,email:normalized};url.searchParams.set('pendaftaran',draft);
        }
        const {data,error}=await db.auth.signUp({email:address,password,options:{
          emailRedirectTo:url.href,...(draft?{data:{[draftMetadata]:draft}}:{})
        }});
        if(error)throw error;
        setPassword('');setFace(null);
        if(staged.current)staged.current.face=null;
        if(!data.session){
          setMessage('Buka tautan konfirmasi yang dikirim ke '+address+(manager?' untuk melanjutkan penyiapan RT.':combined?' agar pengurus menerima pengajuan Anda.':'.')+' Periksa juga folder Spam.');setSent(true);
        }
      }
    }catch(error){
      const authCode=(error as {code?:string}).code;
      setResend(authCode==='email_not_confirmed'||(mode==='signup'&&authCode==='over_email_send_rate_limit'));
      setMessage(authCode?errors[authCode]||'Permintaan belum berhasil. Periksa koneksi dan coba lagi.':(error as Error).message||'Permintaan belum berhasil.');
    }finally{setBusy(false)}
  }
  if(wa&&mode!=='reset'&&status!=='active')return <NightLogin><Card><Title>{status==='loading'?'Memeriksa undangan…':status==='error'?'Tautan belum bisa diperiksa':'Undangan sudah tidak berlaku'}</Title>
    {status==='invalid'&&<Body>Minta tautan baru dari pengurus RT.</Body>}
    {status==='error'&&<Button label="Coba lagi" onPress={()=>retry(n=>n+1)}/>}
    {status!=='loading'&&<Button secondary label="Kembali ke Ronda Pak" onPress={onDone}/>}
  </Card></NightLogin>;
  const form = <Card>
    <Title>{sent?'Periksa email Anda':mode==='signup'&&(code||wa)?'Pendaftaran warga':titles[mode]}</Title>
    {combined&&!sent&&<Body>Tahap 1 dari 2. Isi data warga, lalu konfirmasi alamat email Anda.</Body>}
    {combined&&!sent&&<Button secondary label="Sudah punya akun? Masuk" disabled={busy} onPress={()=>change('login')}/>}
    {wa&&sent&&mode!=='forgot'&&<Body>Tahap 2 dari 2</Body>}
    {manager&&mode==='signup'&&!sent&&<Body>Setelah konfirmasi email, isi nomor RT, RW, dan wilayah Anda.</Body>}
    {code&&!wa&&(mode==='signup'||mode==='login')&&!sent&&<Body>Gunakan alamat email yang diundang pengurus.</Body>}
    {mode==='forgot'&&!sent&&<Body>Masukkan email akun Anda untuk menerima tautan penggantian kata sandi.</Body>}
    {!sent&&<>
      {google&&(!manager||mode==='login')&&(mode==='login'||mode==='signup')&&<Button secondary disabled={busy} label="Lanjutkan dengan Google" onPress={googleLogin}/>}
      {combined&&<ProfileFields profile={profile} change={setProfile}/>}
      {mode!=='reset'&&<Field label="Alamat email" value={email} autoComplete="email" error={invalid==='email'?message:undefined} onChangeText={value=>{setEmail(value);if(invalid==='email'){setInvalid(null);setMessage('')}}} keyboardType="email-address"/>}
      {mode!=='resend'&&mode!=='forgot'&&<Field label={mode==='reset'?'Kata sandi baru':'Kata sandi'} secureTextEntry value={password} autoComplete={mode==='login'?'current-password':'new-password'} error={invalid==='password'?message:undefined} onChangeText={value=>{setPassword(value);if(invalid==='password'){setInvalid(null);setMessage('')}}}/>}
      {(mode==='reset'||mode==='signup')&&<Body>Gunakan minimal 8 karakter.</Body>}
      {combined&&<FaceField face={face} change={setFace}/>}
    </>}
    {Boolean(message)&&!invalid&&<Body>{message}</Body>}
    {!sent&&<Button disabled={busy} label={busy?'Mohon tunggu…':combined?'Daftar sebagai warga':buttons[mode]} onPress={submit}/>}
    {(resend||(sent&&(mode==='signup'||mode==='resend'))||(wa&&mode==='login'))&&<Button secondary disabled={busy} label="Kirim ulang konfirmasi" onPress={()=>change('resend')}/>}
    {mode==='login'?<>
      <Button quiet disabled={busy} label="Lupa kata sandi?" onPress={()=>change('forgot')}/>
      <Button secondary disabled={busy} label={code?'Daftar sebagai warga':'Daftarkan RT'} onPress={code||manager?()=>change('signup'):onRegister}/>
    </>:mode!=='reset'&&(!combined||sent)&&<Button quiet disabled={busy} label="Kembali ke halaman masuk" onPress={()=>{if(!manager&&!code&&mode==='signup')onLogin();else change('login')}}/>}
  </Card>;
  return <NightLogin>{form}</NightLogin>;
}
