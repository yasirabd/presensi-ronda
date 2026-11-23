import {useCallback,useState} from 'react';
import {View} from 'react-native';
import * as Location from 'expo-location';
import {db} from './client';
import {Body,Button,Card,Field,Title} from './ui';
import {checked,Choices,LoadState,useRead,useWork,type Member} from './manager-common';
import {RegionEditor,type Region} from './RegionEditor';

type Point={latitude:number;longitude:number;radius_m:number};
type Community={privacy_contact:string|null;zone:string;region:Region|null};
type PrivacyRequest={id:string;kind:string;details:string;resolution:string|null;user_id:string;created_at:string};
type Props={rt:string;name:string;owner:boolean;members:Member[];changed:()=>void};

function PostEditor({rt,name,initial}:{rt:string;name:string;initial:Point|null}){
  const [point,setPoint]=useState(initial);
  const [radius,setRadius]=useState(String(initial?.radius_m??75));
  const [accuracy,setAccuracy]=useState<number|null>(null);
  const work=useWork();
  async function capture(){
    const {granted}=await Location.requestForegroundPermissionsAsync();
    if(!granted)throw new Error('Izinkan akses lokasi saat berada di pos ronda.');
    const {coords}=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
    if(coords.accuracy===null || !Number.isFinite(coords.accuracy)||coords.accuracy<0||coords.accuracy>50){
      throw new Error('Akurasi lokasi belum mencukupi. Pindah ke tempat terbuka dekat pos, lalu coba lagi.');
    }
    setPoint({latitude:coords.latitude,longitude:coords.longitude,radius_m:Number(radius)});
    setAccuracy(Math.ceil(coords.accuracy));
  }
  return <>
    <Body>Pos {name}. Ambil titik saat Anda berada di pos ronda.</Body>
    <Button label="Gunakan lokasi sekarang" disabled={work.busy} onPress={()=>work.run(capture,'Periksa titik yang terbaca, lalu simpan lokasi pos.')}/>
    {point?<>
      <Body>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}{accuracy!==null?' · Akurasi ±'+accuracy+' m':''}</Body>
      <Field label="Radius presensi (10–500 meter)" keyboardType="numeric" value={radius} onChangeText={setRadius}/>
      <Button label="Simpan lokasi pos" disabled={work.busy} onPress={()=>work.run(async()=>{
        const meters=Number(radius);
        if(!Number.isInteger(meters)||meters<10||meters>500)throw new Error('Masukkan radius 10 sampai 500 meter.');
        checked(await db.from('post_locations').upsert({rt_id:rt,post:name,...point,radius_m:meters}));
      },'Lokasi pos tersimpan.')}/>
    </>:<Body>Lokasi pos belum diatur.</Body>}
    {work.message&&<Body>{work.message}</Body>}
  </>;
}
function PostLocation({rt,name}:Pick<Props,'rt'|'name'>){
  const load=useCallback(async()=>({point:checked(await db.from('post_locations').select('latitude,longitude,radius_m')
    .eq('rt_id',rt).eq('post',name).maybeSingle()) as Point|null}),[rt,name]);
  const state=useRead(load,0);
  return <Card><Title>Lokasi pos ronda</Title>
    {state.data?<PostEditor rt={rt} name={name} initial={state.data.point}/>:<LoadState {...state}/>}
  </Card>;
}

function CommunityEditor({rt,community}:{rt:string;community:Community}){
  const [zone,setZone]=useState(community.zone||'Asia/Jakarta');
  const [contact,setContact]=useState(community.privacy_contact||'');
  const work=useWork();
  return <>
    <Card><Title>Wilayah RT</Title>
      <RegionEditor initial={community.region} label="Simpan wilayah RT" onSave={async region=>{
        checked(await db.rpc('save_rt_region',{target:rt,details:region}));
      }}/>
    </Card>
    <Card><Title>Kontak privasi dan zona waktu</Title>
      <Body>Zona waktu RT</Body><Choices items={['Asia/Jakarta','Asia/Makassar','Asia/Jayapura']} value={zone} select={setZone}/>
      <Field label="Kontak privasi RT" value={contact} onChangeText={setContact}/>
      <Button label="Simpan kontak" disabled={work.busy||!contact.trim()||contact.trim().length>200} onPress={()=>work.run(async()=>{
        checked(await db.from('communities').update({privacy_contact:contact.trim(),zone}).eq('id',rt));
      },'Perubahan tersimpan.')}/>
      {work.message&&<Body>{work.message}</Body>}
    </Card>
  </>;
}

function Roles({rt,members,changed}:Pick<Props,'rt'|'members'|'changed'>){
  const candidates=members.filter(m=>m.role!=='owner');
  const [memberId,setMemberId]=useState('');
  const [search,setSearch]=useState('');
  const [picking,setPicking]=useState(false);
  const [role,setRole]=useState('Warga');
  const [confirm,setConfirm]=useState(false);
  const work=useWork();
  const selected=candidates.find(m=>m.user_id===memberId);
  function save(newRole:string){
    if(!selected)return;
    void work.run(async()=>{
      checked(await db.rpc('set_rt_role',{target:rt,member:selected.user_id,new_role:newRole}));
      setConfirm(false);changed();
    },'Peran anggota tersimpan.');
  }
  return <Card><Title>Kelola peran anggota</Title>
    {!candidates.length?<Body>Belum ada anggota lain di RT ini.</Body>:<>
      <Button secondary label={selected?(selected.resident_name||selected.email):'Pilih anggota'} onPress={()=>{setPicking(!picking);setConfirm(false)}}/>
      {picking&&<>
        <Field label="Cari anggota" value={search} onChangeText={setSearch}/>
        {candidates.filter(m=>[m.email,m.resident_name].some(value=>value?.toLowerCase().includes(search.trim().toLowerCase()))).map(m=>
          <Button key={m.user_id} secondary label={(m.resident_name?m.resident_name+' · ':'')+m.email} onPress={()=>{
            setMemberId(m.user_id);setRole(m.role==='manager'?'Pengurus RT':'Warga');setPicking(false);setConfirm(false);
          }}/>)}
      </>}
      {selected&&<>
        <Body>Peran baru</Body><Choices items={['Warga','Pengurus RT']} value={role} select={setRole}/>
        <Button label="Ubah peran" disabled={work.busy} onPress={()=>save(role==='Warga'?'resident':'manager')}/>
        {confirm?<>
          <Body>Alihkan hak menunjuk pengurus ke {selected.email}? Akun Anda tetap menjadi Pengurus RT.</Body>
          <Button label="Ya, alihkan hak" disabled={work.busy} onPress={()=>save('owner')}/>
          <Button secondary label="Batal" onPress={()=>setConfirm(false)}/>
        </>:<Button secondary label="Alihkan hak menunjuk pengurus" onPress={()=>setConfirm(true)}/>}
      </>}
    </>}
    {work.message&&<Body>{work.message}</Body>}
  </Card>;
}

function RequestRow({item,member,changed}:{item:PrivacyRequest;member?:Member;changed:()=>void}){
  const [answer,setAnswer]=useState('');
  const work=useWork();
  return <View style={{gap:8}}>
    <Title>{item.kind}</Title>
    <Body>{member?.email} · {new Date(item.created_at).toLocaleDateString('id-ID')}</Body>
    <Body>{item.details}</Body>
    {item.resolution?<Body>{item.resolution}</Body>:<>
      <Field label="Keputusan setelah memeriksa identitas" multiline value={answer} onChangeText={setAnswer}/>
      <Button label="Selesaikan permintaan" disabled={work.busy||!answer.trim()||answer.trim().length>500} onPress={()=>work.run(async()=>{
        checked(await db.rpc('resolve_privacy_request',{target:item.id,answer:answer.trim()}));changed();
      },'Keputusan tersimpan.')}/>
    </>}
    {work.message&&<Body>{work.message}</Body>}
  </View>;
}

function Requests({rt,members}:Pick<Props,'rt'|'members'>){
  const [revision,setRevision]=useState(0);
  const changed=()=>setRevision(n=>n+1);
  const load=useCallback(async()=>checked(await db.from('privacy_requests').select('id,kind,details,resolution,user_id,created_at')
    .eq('rt_id',rt).order('created_at',{ascending:false})) as PrivacyRequest[],[rt]);
  const state=useRead(load,revision,true);
  return <Card><Title>Permintaan privasi</Title>
    {state.error||!state.data?<LoadState {...state}/>:!state.data.length?<Body>Belum ada permintaan.</Body>:state.data.map(item=>
      <RequestRow key={item.id} item={item} member={members.find(m=>m.user_id===item.user_id)} changed={changed}/>)}
  </Card>;
}

export function ManagerSettings({rt,name,owner,members,changed}:Props) {
  const load=useCallback(async()=>checked(await db.from('communities').select('privacy_contact,zone,region').eq('id',rt).single()) as Community,[rt]);
  const community=useRead(load,0);
  return <><PostLocation rt={rt} name={name}/>
    {community.data?<CommunityEditor rt={rt} community={community.data}/>:<LoadState {...community}/>}
    <Requests rt={rt} members={members}/>
    {owner&&<Roles rt={rt} members={members} changed={changed}/>}
  </>;
}
