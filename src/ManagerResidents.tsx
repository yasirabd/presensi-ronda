import { fonts } from './theme/typography';
import { useOwl } from './ui';
import {useCallback,useState} from 'react';
import {Linking,Platform,Share,Text,View} from 'react-native';
import {db,publicUrl} from './client';
import {Body,Button,Card,Field,Title} from './ui';
import {checked,LoadState,useRead,useWork,type Member} from './manager-common';

type Invite={email:string|null;invited_name:string|null;whatsapp:string|null;token:string;expires_at:string};
type Pending={token:string;full_name:string;whatsapp:string;home_address:string;has_face:boolean};
type Props={rt:string;name:string;members:Member[];revision:number;changed:()=>void};
const inviteColumns='email,invited_name,whatsapp,token,expires_at';
function recipient(invite:Invite){return invite.invited_name||invite.email||'Warga'}
function phoneNumber(input:string){
  if(!/^\+?[0-9\s().-]+$/.test(input.trim()))throw new Error('Masukkan nomor WhatsApp yang valid.');
  const digits=input.replace(/\D/g,'').replace(/^0/,'62');
  if(!/^[1-9]\d{7,14}$/.test(digits))throw new Error('Masukkan nomor WhatsApp dengan kode negara atau awalan 08.');
  return digits;
}

function Invitations({rt,name,revision,changed}:Omit<Props,'members'>) {
  const theme = useOwl();
  const load=useCallback(async()=>{
    const [invites,pending]=await Promise.all([
      db.from('invites').select(inviteColumns).eq('rt_id',rt).gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:false}),
      db.rpc('pending_joins',{target:rt}),
    ]);
    return {invites:checked(invites) as Invite[],pending:checked(pending) as Pending[]};
  },[rt]);
  const state=useRead(load,revision);
  const work=useWork();
  const [form,setForm]=useState(false);
  const [activeList,setActiveList]=useState(false);
  const [fullName,setFullName]=useState('');
  const [phone,setPhone]=useState('');
  const [selected,setSelected]=useState<Invite|null>(null);
  const [revoking,setRevoking]=useState('');
  const link=selected?publicUrl(selected.whatsapp?'/daftar?undangan='+selected.token+'&wa=1':'/?undangan='+selected.token):'';
  const invitation=selected&&('Halo '+recipient(selected)+', Anda diundang bergabung ke '+name+' di Ronda Pak. Buka '+link+
    (selected.whatsapp?' untuk mendaftar.':' lalu masuk dengan email '+selected.email+'.'));
  function create(){void work.run(async()=>{
    const token=checked(await db.rpc('invite_by_whatsapp',{target:rt,full_name:fullName.trim(),phone:phoneNumber(phone)}));
    const invite=checked(await db.from('invites').select(inviteColumns).eq('rt_id',rt).eq('token',token).single());
    setSelected(invite);setForm(false);setFullName('');setPhone('');state.reload();
  },'Tautan siap dibagikan.')}
  function revoke(token:string) {
    return revoking===token?<View style={{gap:6}}>
      <Body>Cabut undangan ini? Tautan akan berhenti berlaku.</Body>
      <Button label="Ya, cabut undangan" disabled={work.busy} onPress={()=>work.run(async()=>{
        checked(await db.from('invites').delete().eq('rt_id',rt).eq('token',token));
        if(selected?.token===token)setSelected(null);
        setRevoking('');state.reload();
      },'Undangan sudah dicabut.')}/>
      <Button label="Batal" secondary onPress={()=>setRevoking('')}/>
    </View>:<Button label="Cabut undangan" secondary onPress={()=>setRevoking(token)}/>;
  }
  const active=state.data?.invites.filter(i=>!state.data?.pending.some(p=>p.token===i.token))??[];
  return <Card>
    <Title>Undangan warga</Title>
    <Button label={form?'Tutup formulir':'Undang warga'} onPress={()=>setForm(!form)}/>
    {form&&<>
      <Field label="Nama warga" value={fullName} onChangeText={setFullName}/>
      <Field label="Nomor WhatsApp" keyboardType="phone-pad" value={phone} onChangeText={setPhone}/>
      <Body>Tautan pribadi berlaku 2 hari. Kirim ke warga melalui chat pribadi.</Body>
      <Button label="Buat tautan" disabled={work.busy||!fullName.trim()||!phone} onPress={create}/>
    </>}
    {selected&&<>
      <Title>Bagikan ke {recipient(selected)}</Title>
      <Text style={{color:theme.accent, fontFamily: fonts.regular}} selectable accessibilityLabel="Tautan undangan">{link}</Text>
      <Button label="Kirim lewat WhatsApp" onPress={()=>work.run(async()=>{
        await Linking.openURL('https://wa.me/'+(selected.whatsapp||'')+'?text='+encodeURIComponent(invitation||link));
      })}/>
      <Button secondary label={Platform.OS==='web'?'Salin tautan':'Bagikan tautan'} onPress={()=>work.run(async()=>{
        if(Platform.OS==='web'){
          if(!navigator.clipboard)throw new Error('Pilih alamat undangan untuk menyalinnya.');
          await navigator.clipboard.writeText(link);
        }else await Share.share({message:link});
      },Platform.OS==='web'?'Tautan disalin.':'')}/>
    </>}
    {work.message&&<Body>{work.message}</Body>}
    {!state.data?<LoadState {...state}/>:<>
      {state.data.pending.length>0&&<Title>Menunggu konfirmasi ({state.data.pending.length})</Title>}
      {state.data.pending.map(request=><View key={request.token} style={{gap:8}}>
        <Body>{request.full_name} · +{request.whatsapp}</Body><Body>{request.home_address}</Body>
        <Body>{request.has_face?'Wajah sudah didaftarkan.':'Pengajuan tanpa wajah.'} Periksa identitas warga sebelum menyetujui.</Body>
        <Button label="Konfirmasi identitas" disabled={work.busy} onPress={()=>work.run(async()=>{
          checked(await db.rpc('approve_join',{target:rt,code:request.token}));
          if(selected?.token===request.token)setSelected(null);
          changed();
        },request.full_name+' sudah bergabung.')}/>
        {revoke(request.token)}
      </View>)}
      <Button secondary label={'Undangan aktif ('+active.length+')'} onPress={()=>setActiveList(!activeList)}/>
      {activeList&&(!active.length?<Body>Belum ada undangan aktif.</Body>:active.map(i=><View key={i.token} style={{gap:6}}>
        <Body>{recipient(i)} · Berlaku sampai {new Date(i.expires_at).toLocaleString('id-ID')}</Body>
        <Button secondary label="Lihat tautan" onPress={()=>setSelected(i)}/>{revoke(i.token)}
      </View>))}
    </>}
  </Card>;
}

function ResidentDetail({rt,member,status,changed,close}:{rt:string;member:Member;status?:string;changed:()=>void;close:()=>void}){
  const [name,setName]=useState(member.resident_name??'');
  const [address,setAddress]=useState(member.home_address??'');
  const work=useWork();
  return <View style={{gap:8}}>
    {member.whatsapp&&<Body>WhatsApp +{member.whatsapp}</Body>}
    <Field label="Nama warga" value={name} onChangeText={setName}/>
    <Field label="Alamat rumah" multiline value={address} onChangeText={setAddress}/>
    <Button label="Simpan data warga" disabled={work.busy||!name.trim()||!address.trim()} onPress={()=>work.run(async()=>{
      checked(await db.rpc('save_resident_profile',{target:rt,member:member.user_id,full_name:name.trim(),address:address.trim()}));changed();
    },'Data warga tersimpan.')}/>
    {member.resident_name&&member.home_address&&status==='pending'&&<>
      <Body>Periksa identitas warga sebelum mengizinkan pendaftaran wajah.</Body>
      <Button secondary label="Konfirmasi identitas warga" disabled={work.busy} onPress={()=>work.run(async()=>{
        checked(await db.rpc('allow_face_registration',{target:rt,member:member.user_id}));changed();
      },'Pendaftaran wajah diizinkan.')}/>
    </>}
    {work.message&&<Body>{work.message}</Body>}
    <Button secondary label="Tutup detail" onPress={close}/>
  </View>;
}

export function Residents(props:Props) {
  const theme = useOwl();
  const {rt,members,revision,changed}=props;
  const [query,setQuery]=useState('');
  const [editing,setEditing]=useState('');
  const load=useCallback(async()=>{
    const data=checked(await db.rpc('resident_face_statuses',{target:rt})) as {user_id:string;status:string}[];
    return Object.fromEntries(data.map(s=>[s.user_id,s.status])) as Record<string,string>;
  },[rt]);
  const statuses=useRead(load,revision);
  const search=query.trim().toLocaleLowerCase('id');
  const rows=members.filter(m=>[m.resident_name,m.email,m.home_address].some(s=>s?.toLocaleLowerCase('id').includes(search)))
    .sort((a,b)=>(a.resident_name||a.email).localeCompare(b.resident_name||b.email,'id'));
  return <><Invitations {...props}/><Card><Title>Daftar warga</Title>
    <Field label="Cari nama, alamat, atau email" value={query} onChangeText={setQuery}/>
    {statuses.error&&<LoadState {...statuses}/>}
    {!rows.length&&<Body>{search?'Warga tidak ditemukan.':'Belum ada warga.'}</Body>}
    {rows.map(m=>{
      const status=statuses.data?.[m.user_id];
      const label=status==='ready'?'Terdaftar':!m.resident_name||!m.home_address?'Data belum lengkap':
        status==='approved'?'Boleh daftar':status==='pending'?'Belum disetujui':'—';
      return <View key={m.user_id} style={{gap:6,paddingVertical:8,borderTopWidth:1,borderTopColor:theme.border}}>
        <Title>{m.resident_name||'Data belum lengkap'}</Title>
        <Body>{m.role==='resident'?'Warga':'Pengurus RT'} · {m.email}</Body><Body>{m.home_address||'Alamat belum diisi'}</Body>
        <Body>Status wajah · {label}</Body>
        {editing===m.user_id?<ResidentDetail rt={rt} member={m} status={status} changed={changed} close={()=>setEditing('')}/>:
          <Button secondary label="Detail" onPress={()=>setEditing(m.user_id)}/>}
      </View>;
    })}
  </Card></>;
}
