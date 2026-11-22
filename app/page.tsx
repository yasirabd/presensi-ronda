'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {createClient, type Session} from '@supabase/supabase-js';
import {RTSettings} from './rt-settings';
import {FaceRegistration} from './face';
import {LocationCheck} from './location';
import {AuthForm} from './auth';
import {PostLocation} from './post-location';
import {ResidentProfileForm, ResidentTable, type Member} from './residents';
import {RegionFields, regionFromForm, type Region} from './region-fields';
import {Attendance} from './attendance';
import {ManagerNavigation, managerSections, type ManagerSection} from './manager-navigation';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const db = url && key ? createClient(url,key) : null;
type RT = {id:string; name:string; zone:string; region:Region|null};


export default function Home() {
  const [session,setSession] = useState<Session|null>(null);
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [rooms,setRooms] = useState<RT[]>([]);
  const [rt,setRT] = useState('');
  const [members,setMembers] = useState<Member[]>([]);
  const [revision,refresh] = useState(0);
  const [invitation,setInvitation] = useState('');
  const [path,setPath]=useState<''|'join'|'create'>('');
  const [recovering,setRecovering]=useState(false);
  const [roomsLoaded,setRoomsLoaded]=useState(false);
  const [link,setLink] = useState('');
  const [managerSection,setManagerSection] = useState<ManagerSection>('warga');
  const [personalOpen,setPersonalOpen]=useState(false);
  const managerHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    const incomingInvitation=new URLSearchParams(location.search).get('undangan');
    setInvitation(incomingInvitation || '');
    if(incomingInvitation)setManagerSection('pengaturan');

    const sub=db?.auth.onAuthStateChange((event,s)=>{
      if(event==='PASSWORD_RECOVERY')setRecovering(true);
      setSession(s);
    });
    return ()=>sub?.data.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if (!db || !session) return;
    let active=true;
    db.from('communities').select('id,name,zone,region').order('name').then(({data,error})=>{
      if(!active) return;
      if(error) return setNotice(error.message);
      setRooms(data || []);setRoomsLoaded(true);
      setRT(old=>data?.some(r=>r.id===old)?old:data?.[0]?.id || '');
    });
    return ()=>{active=false};
  },[session,revision]);
  useEffect(()=>{
    if(!db || !rt || !session) return;
    let active=true;
    db.from('memberships').select('*').eq('rt_id',rt).then(({data,error})=>{
      if(!active)return;
      setMembers(data || []);
      if(error)setNotice('Gagal memuat data RT. Silakan muat ulang.');
    });
    return ()=>{active=false};
  },[session,rt,revision]);
  const owner=members.some(m=>m.rt_id===rt && m.user_id===session?.user.id && m.role==='owner');
  const manager=owner || members.some(m=>m.rt_id===rt && m.user_id===session?.user.id && m.role==='manager');
  const ownMember=members.find(member=>member.rt_id===rt && member.user_id===session?.user.id);
  const activeRoom=rooms.find(room=>room.id===rt);
  const zone=activeRoom?.zone || 'Asia/Jakarta';
  const displayTime=(value:string)=>new Date(value).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:zone});
  const [inviteName,setInviteName]=useState('');
  const [history,setHistory]=useState<{id:string;post:string;starts_at:string;status:string}[]>([]);
  useEffect(()=>{
    let active=true;setInviteName('');
    if(db && session && /^[0-9a-f-]{36}$/i.test(invitation))db.rpc('preview_invite',{code:invitation}).then(({data})=>{if(active)setInviteName(data||'')});
    return ()=>{active=false};
  },[session,invitation]);
  useEffect(()=>{
    let active=true;setHistory([]);
    if(db && session && rt)db.rpc('my_schedule',{target:rt}).then(({data})=>{if(active)setHistory(data||[])});
    return ()=>{active=false};
  },[rt,session,revision]);
  function submit(action:(data:FormData)=>Promise<string>) {
    return async (event:FormEvent<HTMLFormElement>)=>{
      event.preventDefault();
      if(busy)return;
      const data=new FormData(event.currentTarget);
      setBusy(true);setNotice('');
      try {setNotice(await action(data));refresh(n=>n+1)}
      catch(error){setNotice((error as Error).message || 'Terjadi kendala. Coba lagi.')}
      finally{setBusy(false)}
    }
  }
  function field(label:string,name:string,type='text',value='') {
    return <label>{label}<input required name={name} type={type} defaultValue={value}/></label>;
  }
  const button=(label:string)=><button disabled={busy}>{label}</button>;
  if(!db)return <p>Layanan RT belum terhubung. Hubungi pengurus.</p>;
  if(!session || recovering)return <>

    <AuthForm db={db} invited={Boolean(invitation)} recovering={Boolean(session)&&recovering} onReset={()=>{
      const current=new URL(location.href);current.searchParams.delete('pemulihan');current.hash='';
      window.history.replaceState(null,'',current);setRecovering(false);setNotice('Kata sandi baru tersimpan.');
    }}/>
  </>;
  const onboarding=roomsLoaded && !rooms.length;
  const intent=invitation?'join':path;
  const chooseRT=<label>RT aktif<select value={rt} onChange={e=>{setRT(e.target.value);setManagerSection('warga');setPersonalOpen(false);setMembers([]);setLink('');setNotice('')}}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>;
  const personalAttendance=<>
    {ownMember && <details key={rt} open={!ownMember.resident_name || !ownMember.home_address}>
      <summary>Data warga saya</summary>
      <ResidentProfileForm key={ownMember.user_id} db={db} rt={rt} member={ownMember} changed={()=>refresh(n=>n+1)}/>
    </details>}
    {rt && (!manager || (managerSection==='rekap' && personalOpen)) && <section className="schedule-panel">
      <h2>Presensi ronda</h2>
      <p>Untuk absen, datang ke pos ronda. Kami akan memeriksa lokasi dan wajah Anda.</p>
      <LocationCheck key={rt} db={db} rt={rt} onAttendance={()=>refresh(n=>n+1)}/>
    </section>}
    {rt && <details><summary>Riwayat presensi saya</summary>{history.length?<ul>{history.map(h=><li key={h.id}>{h.post} · {h.status}<small>{displayTime(h.starts_at)}</small></li>)}</ul>:<p>Belum ada riwayat presensi.</p>}</details>}
    {rt && (!manager || (managerSection==='rekap' && personalOpen)) && <FaceRegistration key={rt+':face:'+revision} db={db} rt={rt} profileComplete={Boolean(ownMember?.resident_name&&ownMember.home_address)}/>}
  </>;
  const rtMembership=<>
    {onboarding && !intent && <section className="role-picker"><h2>Pilih cara bergabung</h2>
      <button onClick={()=>setPath('join')}><strong>Gabung RT saya</strong><span>Saya punya undangan dari pengurus</span></button>
      <button className="secondary" onClick={()=>setPath('create')}><strong>Daftarkan RT baru</strong><span>Saya akan mengelola ronda warga</span></button>
    </section>}
    {onboarding && intent && <button className="text-action" onClick={()=>{
      setInvitation('');setPath('');setNotice('');const current=new URL(location.href);
      current.searchParams.delete('undangan');window.history.replaceState(null,'',current);
    }}>Kembali ke pilihan RT</button>}
    {roomsLoaded && (!onboarding || intent==='join') && <details open={Boolean(invitation) || onboarding}><summary>Gabung melalui undangan</summary><form onSubmit={submit(async data=>{
      const {data:id,error}=await db.rpc('join_rt',{code:data.get('code')});if(error)throw error;
      setMembers([]);setLink('');setRT(id);setInvitation('');setPath('');const current=new URL(location.href);current.searchParams.delete('undangan');window.history.replaceState(null,'',current);return 'Berhasil bergabung.';
    })}><label>Kode undangan<input name="code" value={invitation} onChange={e=>setInvitation(e.target.value.trim())} required/></label>{inviteName && <p>Undangan dari {inviteName}</p>}<button disabled={busy||!inviteName}>Gabung RT</button></form></details>}
    {roomsLoaded && (!onboarding || intent==='create') && <details open={onboarding}><summary>Daftarkan RT</summary><form onSubmit={submit(async data=>{
      const {data:id,error}=await db.rpc('create_rt_with_region',{details:regionFromForm(data)});if(error)throw error;
      setMembers([]);setLink('');setRT(id);setPath('');return 'RT berhasil dibuat. Anda bisa mengundang warga sekarang.';
    })}><RegionFields/>{button('Buat RT')}</form></details>}
  </>;
  const rtSettings=rt && <RTSettings key={rt} db={db} rt={rt} members={members} manager={manager} isOwner={owner} revision={revision} changed={()=>refresh(n=>n+1)}/>;
  async function signOut() {
    if(!db)return;
    const {error}=await db.auth.signOut();
    if(error)setNotice(error.message);
    else location.reload();
  }

  if(!manager)return <>
    <h1>{onboarding?'Mulai di Ronda Pak':'Ruang ronda'}</h1>
    <p role="status">{notice}</p>
    {rooms.length>0 && chooseRT}
    {personalAttendance}
    {rtMembership}
    {rtSettings}
    <button onClick={signOut}>Keluar</button>
  </>;

  function selectManagerSection(section:ManagerSection) {
      setManagerSection(section);
      setNotice('');
      requestAnimationFrame(()=>{
        managerHeading.current?.focus({preventScroll:true});
        window.scrollTo(0,0);
      });
  }

  return <div className="manager-layout">
    <ManagerNavigation current={managerSection} onLogout={signOut} onSelect={selectManagerSection}/>
    <div className="manager-content">
      <div className="manager-heading">
        <h1 ref={managerHeading} tabIndex={-1}>{managerSections.find(section=>section.id===managerSection)?.label}</h1>
        {chooseRT}
      </div>
      <p role="status" className="manager-notice">{notice}</p>
      <div hidden={managerSection!=='warga'}>
        <ResidentTable key={rt} db={db} rt={rt} members={members} revision={revision} changed={()=>refresh(n=>n+1)}/>
        <section><h2>Undang warga</h2><form onSubmit={submit(async data=>{
      const {data:code,error}=await db.rpc('invite_resident',{target:rt,recipient:data.get('email')});if(error)throw error;
      setLink(location.origin+'/?undangan='+code);return 'Bagikan tautan ke warga yang diundang.';
    })}>{field('Email warga','email','email')}{button('Buat undangan')}{link && <output>{link}</output>}</form></section>
      </div>
      <div hidden={managerSection!=='rekap'}>
        <Attendance key={rt} db={db} rt={rt} revision={revision}/>
        <details key={rt} onToggle={event=>setPersonalOpen(event.currentTarget.open)}>
          <summary>Presensi saya</summary>
          {personalAttendance}
        </details>
      </div>
      <div hidden={managerSection!=='pengaturan'}>
        {activeRoom && <PostLocation key={rt} db={db} rt={rt} name={activeRoom.name}/>}
        {activeRoom && <details key={rt}><summary>Wilayah RT</summary>
          <form onSubmit={submit(async data=>{
            const {error}=await db.rpc('save_rt_region',{target:rt,details:regionFromForm(data)});
            if(error)throw error;
            return 'Wilayah RT tersimpan.';
          })}><RegionFields initial={activeRoom.region}/>{button('Simpan wilayah RT')}</form>
        </details>}
        {rtSettings}
        {rtMembership}
      </div>
    </div>
  </div>;
}
