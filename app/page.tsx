'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {createClient, type Session} from '@supabase/supabase-js';
import {RTSettings} from './rt-settings';
import {FaceRegistration} from './face';
import {LocationCheck} from './location';
import {AuthForm} from './auth';
import {PostLocation} from './post-location';
import {Attendance} from './attendance';
import {ManagerNavigation, managerSections, type ManagerSection} from './manager-navigation';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const db = url && key ? createClient(url,key) : null;
type Member = {rt_id:string; user_id:string; email:string; role:string};
type RT = {id:string; name:string; zone:string};
type Shift = {id:string; user_id:string; post:string; starts_at:string; ends_at:string};


export default function Home() {
  const [session,setSession] = useState<Session|null>(null);
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [rooms,setRooms] = useState<RT[]>([]);
  const [rt,setRT] = useState('');
  const [members,setMembers] = useState<Member[]>([]);
  const [shifts,setShifts] = useState<Shift[]>([]);
  const [clock,setClock]=useState(0);
  useEffect(()=>{setClock(Date.now());const timer=setInterval(()=>setClock(Date.now()),10000);return ()=>clearInterval(timer)},[]);
  const [revision,refresh] = useState(0);
  const [invitation,setInvitation] = useState('');
  const [path,setPath]=useState<''|'join'|'create'>('');
  const [recovering,setRecovering]=useState(false);
  const [roomsLoaded,setRoomsLoaded]=useState(false);
  const [link,setLink] = useState('');
  const [managerSection,setManagerSection] = useState<ManagerSection>('jadwal');
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
    db.from('communities').select('id,name,zone').order('name').then(({data,error})=>{
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
    Promise.all([db.from('memberships').select('*').eq('rt_id',rt),db.from('shifts').select('*').eq('rt_id',rt).gt('ends_at',new Date().toISOString()).order('starts_at')]).then(([people,schedule])=>{
      if(!active)return;
      setMembers(people.data || []);setShifts(schedule.data || []);
      if(people.error || schedule.error)setNotice('Gagal memuat data RT. Silakan muat ulang.');
    });
    return ()=>{active=false};
  },[session,rt,revision]);
  const owner=members.some(m=>m.rt_id===rt && m.user_id===session?.user.id && m.role==='owner');
  const manager=owner || members.some(m=>m.rt_id===rt && m.user_id===session?.user.id && m.role==='manager');
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
  const chooseRT=<label>RT aktif<select value={rt} onChange={e=>{setRT(e.target.value);setManagerSection('jadwal');setPersonalOpen(false);setMembers([]);setShifts([]);setLink('');setNotice('')}}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>;
  const ownShifts=shifts.filter(shift=>shift.user_id===session.user.id);
  const personalSchedule=<>
    {rooms.length>0 && <section className="schedule-panel"><h2>Jadwal ronda</h2><small>Zona waktu {zone}</small>{ownShifts.length?<ul>{ownShifts.map(s=><li key={s.id}><strong>{s.post}</strong><small>{displayTime(s.starts_at)} hingga {displayTime(s.ends_at)}</small>{(!manager || (managerSection==='rekap' && personalOpen)) && s.user_id===session.user.id && Date.parse(s.starts_at)<=clock && clock<Date.parse(s.ends_at) && <LocationCheck db={db} rt={rt} shift={s.id} onAttendance={()=>refresh(n=>n+1)}/>}</li>)}</ul>:<p>Belum ada jadwal aktif atau mendatang.</p>}</section>}
    {rt && <details><summary>Riwayat presensi saya</summary>{history.length?<ul>{history.map(h=><li key={h.id}>{h.post} · {h.status}<small>{displayTime(h.starts_at)}</small></li>)}</ul>:<p>Belum ada riwayat presensi.</p>}</details>}
    {rt && (!manager || (managerSection==='rekap' && personalOpen)) && <FaceRegistration key={rt+':face:'+revision} db={db} rt={rt}/>}
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
      setMembers([]);setShifts([]);setLink('');setRT(id);setInvitation('');setPath('');const current=new URL(location.href);current.searchParams.delete('undangan');window.history.replaceState(null,'',current);return 'Berhasil bergabung.';
    })}><label>Kode undangan<input name="code" value={invitation} onChange={e=>setInvitation(e.target.value.trim())} required/></label>{inviteName && <p>Undangan dari {inviteName}</p>}<button disabled={busy||!inviteName}>Gabung RT</button></form></details>}
    {roomsLoaded && (!onboarding || intent==='create') && <details open={onboarding}><summary>Daftarkan RT</summary><form onSubmit={submit(async data=>{
      const {data:id,error}=await db.rpc('create_rt',{label:data.get('label')});if(error)throw error;
      setMembers([]);setShifts([]);setLink('');setRT(id);setPath('');return 'RT berhasil dibuat. Anda bisa mengundang warga sekarang.';
    })}>{field('Nama RT dan wilayah','label')}{button('Buat RT')}</form></details>}
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
    {personalSchedule}
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
      <div hidden={managerSection!=='jadwal'}>
        <section><h2>Jadwalkan giliran</h2>
          <div className="schedule-post"><p>Pos ronda <strong>{activeRoom?.name}</strong></p>
            <button type="button" className="text-action" onClick={()=>selectManagerSection('pengaturan')}>Atur lokasi pos</button>
          </div>
          <form onSubmit={submit(async data=>{
      const {error}=await db.from('shifts').insert({rt_id:rt,user_id:data.get('member'),post:activeRoom?.name,starts_at:new Date(String(data.get('start'))).toISOString(),ends_at:new Date(String(data.get('end'))).toISOString()});
      if(error)throw error;return 'Jadwal tersimpan.';
    })}><label>Anggota<select name="member" required>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.email}</option>)}</select></label><div className="manager-fields">{field('Mulai (waktu perangkat)','start','datetime-local')}{field('Selesai (waktu perangkat)','end','datetime-local')}</div>{button('Simpan jadwal')}</form>
        <details><summary>Ubah giliran mendatang</summary><form onSubmit={submit(async f=>{
      const {error}=await db.rpc('revise_shift',{target:rt,shift_key:f.get('shift'),member:f.get('member'),pos:shifts.find(shift=>shift.id===f.get('shift'))?.post ?? activeRoom?.name,start_time:new Date(String(f.get('start'))).toISOString(),end_time:new Date(String(f.get('end'))).toISOString()});
      if(error)throw error;return 'Jadwal diperbarui.';
    })}><label>Giliran<select name="shift" required>{shifts.filter(s=>Date.parse(s.starts_at)>clock).map(s=><option key={s.id} value={s.id}>{s.post} · {displayTime(s.starts_at)} · {members.find(m=>m.user_id===s.user_id)?.email}</option>)}</select></label>
        <label>Anggota<select name="member" required>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.email}</option>)}</select></label><div className="manager-fields">{field('Mulai baru (waktu perangkat)','start','datetime-local')}{field('Selesai baru (waktu perangkat)','end','datetime-local')}</div>{button('Perbarui giliran')}</form></details></section>
        <section className="schedule-panel">
          <h2>Giliran aktif dan mendatang</h2>
          <small>Zona waktu {zone}</small>
          {shifts.length ? <ul>{shifts.map(shift=><li key={shift.id}>
            <strong>{shift.post}</strong>
            <small>{members.find(member=>member.user_id===shift.user_id)?.email}</small>
            <small>{displayTime(shift.starts_at)} hingga {displayTime(shift.ends_at)}</small>
          </li>)}</ul> : <p>Belum ada giliran. Isi formulir di atas untuk menambahkan jadwal.</p>}
        </section>
      </div>
      <div hidden={managerSection!=='warga'}>
        <details><summary>Verifikasi identitas warga</summary><form onSubmit={submit(async data=>{
      const {error}=await db.rpc('allow_face_registration',{target:rt,member:data.get('member')});
      if(error)throw error;return 'Pendaftaran wajah warga diizinkan.';
    })}><label>Warga yang diperiksa langsung<select name="member">{members.map(m=><option key={m.user_id} value={m.user_id}>{m.email}</option>)}</select></label>{button('Konfirmasi identitas warga')}</form></details><section><h2>Undang warga</h2><form onSubmit={submit(async data=>{
      const {data:code,error}=await db.rpc('invite_resident',{target:rt,recipient:data.get('email')});if(error)throw error;
      setLink(location.origin+'/?undangan='+code);return 'Bagikan tautan ke warga yang diundang.';
    })}>{field('Email warga','email','email')}{button('Buat undangan')}{link && <output>{link}</output>}</form></section>
      </div>
      <div hidden={managerSection!=='rekap'}>
        <Attendance key={rt} db={db} rt={rt} revision={revision}/>
        <details key={rt} onToggle={event=>setPersonalOpen(event.currentTarget.open)}>
          <summary>Presensi saya</summary>
          {personalSchedule}
        </details>
      </div>
      <div hidden={managerSection!=='pengaturan'}>
        {activeRoom && <PostLocation key={rt} db={db} rt={rt} name={activeRoom.name}/>}
        {rtSettings}
        {rtMembership}
      </div>
    </div>
  </div>;
}
