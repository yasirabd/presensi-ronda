import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import { db } from './client';
import { checked, useRead, LoadState, type Member } from './manager-common';
import { Residents } from './ManagerResidents';
import { ManagerReport } from './ManagerReport';
import { ManagerSettings } from './ManagerSettings';
import { Body, Button, Card, useOwl } from './ui';
import { type } from './theme/typography';

const tabs = [
  {label:'Beranda', icon:'home-outline'},
  {label:'Warga', icon:'people-outline'},
  {label:'Rekap', icon:'calendar-outline'},
] as const;
export type ManagerSection = typeof tabs[number]['label'];
type Props = {section:ManagerSection;setSection:(section:ManagerSection)=>void;rt:string; userId:string; name:string; owner:boolean; settingsOpen:boolean;settingsReturnLabel:string;settings:(open:boolean)=>void;header:ReactNode};

export default function Manager({section,setSection,rt, userId, name, owner, header,settingsOpen,settingsReturnLabel,settings}:Props) {
  const c = useOwl();
  const safe = useSafeAreaInsets();
  const {width, fontScale} = useWindowDimensions();
  const desktop = width / Math.max(1,fontScale) >= 960;
  const scroll = useRef<ScrollView>(null);
  const [startInvite, setStartInvite] = useState(false);
  const [revision, setRevision] = useState(0);
  const changed = () => setRevision(value => value + 1);
  const load = useCallback(async () => checked(await db.from('memberships')
    .select('user_id,email,role,resident_name,home_address,whatsapp').eq('rt_id',rt)) as Member[], [rt]);
  const members = useRead(load, revision, true);
  function navigate(next:ManagerSection, invite = false) {
    settings(false);
    if (next === section && !settingsOpen) return;
    setStartInvite(invite);
    setSection(next);
    scroll.current?.scrollTo({y:0,animated:false});
  }

  const navigation = <View accessibilityRole="tablist" style={{
    flexDirection:desktop?'column':'row', gap:4,
    backgroundColor:c.surface, borderColor:c.border,
    borderRightWidth:desktop?1:0, borderTopWidth:desktop?0:1,
    width:desktop?224+safe.left:undefined,
    paddingTop:desktop?24+safe.top:6, paddingBottom:Math.max(8,safe.bottom),
    paddingLeft:(desktop?16:6)+safe.left, paddingRight:desktop?16:6+safe.right,
  }}>
    {desktop && <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:24,paddingHorizontal:8}}>
      <Image accessible={false} source={require('../public/ronda-pak-owl.png')} style={{width:34,height:34}}/>
      <Text style={[type.label,{color:c.text,fontSize:18}]}>Ronda Pak</Text>
    </View>}
    {tabs.map(({label,icon}) => {
      const selected = !settingsOpen && section===label;
      const color = selected ? c.accent : c.textSecondary;
      return <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label}
        accessibilityState={{selected}} aria-selected={selected} onPress={() => navigate(label)}
        style={({pressed}) => ({flex:desktop?undefined:1,minWidth:0,minHeight:50,
          flexDirection:desktop?'row':'column',alignItems:'center',justifyContent:desktop?'flex-start':'center',
          paddingHorizontal:desktop?12:2,paddingVertical:5,borderRadius:12,gap:desktop?12:3,
          backgroundColor:selected || pressed ? c.accentSoft : 'transparent'})}>
        <Ionicons accessible={false} name={icon} size={21} color={color}/>
        <Text style={[type.label,{color,textAlign:desktop?'left':'center',fontSize:desktop?14:11}]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
  return <View style={{flex:1,flexDirection:desktop?'row':'column',backgroundColor:c.bg}}>
    {desktop && navigation}
    <ScrollView ref={scroll} style={{flex:1,minWidth:0}} keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never" contentContainerStyle={{
        paddingTop:safe.top+(desktop?24:12),paddingBottom:24,
        paddingLeft:(desktop?32:16)+(desktop?0:safe.left),paddingRight:(desktop?32:16)+safe.right,
      }}>
      <View style={{width:'100%',maxWidth:1060,alignSelf:'center',gap:desktop?20:14}}>
        {header}
        {settingsOpen && <Button quiet icon="arrow-back-outline" label={'Kembali ke '+settingsReturnLabel} onPress={()=>settings(false)}/>}
    {!settingsOpen && section==='Beranda' ? <Overview rt={rt} name={name} count={members.data?.filter(member=>member.role==='resident').length}
      invite={() => navigate('Warga',true)} report={() => navigate('Rekap')}
      residents={() => navigate('Warga')} settings={() => settings(true)} desktop={desktop}
      firstName={members.data?.find(member=>member.user_id===userId)?.resident_name?.trim().split(/\s+/)[0]}/> :
      !settingsOpen && section==='Rekap' ? <ManagerReport rt={rt}/> :
      !members.data ? <LoadState {...members}/> :
      !settingsOpen && section==='Warga' ? <Residents rt={rt} name={name} members={members.data} revision={revision}
        changed={changed} startInvite={startInvite}/> :
      <ManagerSettings rt={rt} name={name} owner={owner && members.data.some(m=>m.user_id===userId&&m.role==='owner')}
        members={members.data} changed={changed}/>}
      </View>
    </ScrollView>
    {!desktop && navigation}
  </View>;
}

const localDate = new Intl.DateTimeFormat('id-ID', {
  timeZone:'Asia/Jakarta', weekday:'long', day:'numeric', month:'long', year:'numeric',
});
const dateKey = new Intl.DateTimeFormat('sv-SE', {
  timeZone:'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit',
});
const localHour = new Intl.DateTimeFormat('en-GB', {
  timeZone:'Asia/Jakarta', hour:'2-digit', hourCycle:'h23',
});

function Overview({rt,name,count,invite,report,residents,settings,desktop,firstName}:{
  rt:string; name:string; count?:number; invite:()=>void; report:()=>void; residents:()=>void; settings:()=>void;
  desktop:boolean; firstName?:string;
}) {
  const c = useOwl();
  const [now,setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  },[]);
  const day = dateKey.format(now);
  const hour = Number(localHour.format(now));
  const greeting = hour < 4 || hour >= 18 ? 'Selamat malam'
    : hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : 'Selamat sore';
  const load = useCallback(async () => {
    const start = Date.parse(day+'T00:00:00+07:00');
    const rows = checked(await db.rpc('attendance_report',{target:rt,
      period_start:new Date(start).toISOString(),period_end:new Date(start+86_400_000).toISOString()})) as {status:string}[];
    return rows.filter(row=>row.status.startsWith('Hadir')).length;
  },[rt,day]);
  const attendance = useRead(load,0);
  const loadPost = useCallback(async () => Boolean(checked(await db.from('post_locations')
    .select('latitude').eq('rt_id',rt).eq('post',name).maybeSingle())),[rt,name]);
  const loadPending = useCallback(async () =>
    (checked(await db.rpc('pending_joins',{target:rt})) as unknown[]).length,[rt]);
  const post = useRead(loadPost,0);
  const pending = useRead(loadPending,0);
  const needsLocation = post.data === false;

  return <>
    <ImageBackground source={desktop?require('../assets/manager-village-wide.webp'):require('../assets/manager-village-mobile.webp')}
      imageStyle={{width:'100%',height:'100%'}} resizeMode="cover"
      style={{minHeight:desktop?265:190,justifyContent:'flex-end',borderRadius:22,overflow:'hidden',backgroundColor:'#121e36'}}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs><LinearGradient id="manager-hero-shade" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="15%" stopColor="#0b1428" stopOpacity=".05"/>
          <Stop offset="62%" stopColor="#0b1428" stopOpacity=".62"/>
          <Stop offset="100%" stopColor="#0b1428" stopOpacity=".98"/>
        </LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#manager-hero-shade)"/>
      </Svg>
      <View style={{gap:7,padding:desktop?28:18}}>
        <Text style={[type.label,{color:'#fff1c9'}]}>{localDate.format(now)}</Text>
        <Text accessibilityRole="header" style={[type.title,{
          color:'white',fontSize:desktop?38:27,lineHeight:desktop?44:33,
        }]}>{greeting}{firstName ? ', '+firstName : ''}.</Text>
      </View>
    </ImageBackground>

    <View style={{flexDirection:desktop?'row':'column',gap:14}}>
      <View style={{flex:desktop?1.3:undefined,minWidth:0,gap:12}}>
        <Card>
          <Text accessibilityRole="header" style={[type.title,{color:c.text}]}>Kehadiran hari ini</Text>
          {attendance.data === null ? <LoadState {...attendance}/> : <View style={{flexDirection:'row',alignItems:'baseline',gap:8}}>
            <Text style={[type.title,{color:c.text,fontSize:34,lineHeight:40}]}>{attendance.data}</Text>
            <Body>kehadiran tercatat</Body>
          </View>}
          {count !== undefined && <Body>{count} warga terdaftar di RT ini</Body>}
          <Button quiet label="Buka rekap presensi" icon="arrow-forward-outline" onPress={report}/>
        </Card>
        {post.data !== null && <Button label={needsLocation?'Atur lokasi pos':pending.data?'Tinjau pendaftaran':'Undang warga'}
          icon={needsLocation?'location-outline':'person-add-outline'} onPress={needsLocation?settings:pending.data?residents:invite}/>}
      </View>

      <View style={{flex:desktop?1:undefined,minWidth:0}}>
        <Card>
          <Text accessibilityRole="header" style={[type.title,{color:c.text}]}>Perlu ditangani</Text>
          {post.error && <LoadState {...post}/>}
          {pending.error && <LoadState {...pending}/>}
          {needsLocation && <Body>Simpan titik pos agar warga bisa presensi dengan verifikasi lokasi.</Body>}
          {!!pending.data && needsLocation && <Button secondary icon="people-outline"
            label={`${pending.data} pendaftaran menunggu`} onPress={residents}/>}
          {!!pending.data && !needsLocation && <Body>{pending.data} pendaftaran menunggu persetujuan.</Body>}
          {post.data && pending.data===0 && <Body>Lokasi pos sudah siap. Semua pendaftaran warga sudah ditinjau.</Body>}
          {!post.error && !pending.error && (post.data===null || pending.data===null) && <Body>Memeriksa status RT…</Body>}
        </Card>
      </View>
    </View>
  </>;
}
