import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from './client';
import { checked, useRead, LoadState, type Member } from './manager-common';
import { Residents } from './ManagerResidents';
import { ManagerReport } from './ManagerReport';
import { ManagerSettings } from './ManagerSettings';
import { Button, useOwl } from './ui';
import { type } from './theme/typography';

const tabs = [
  {label:'Beranda', icon:'home-outline'},
  {label:'Warga', icon:'people-outline'},
  {label:'Presensi', icon:'calendar-outline'},
  {label:'Pengaturan', icon:'settings-outline'},
] as const;
type Section = typeof tabs[number]['label'];
type Props = {rt:string; userId:string; name:string; owner:boolean; header:ReactNode};

export default function Manager({rt, userId, name, owner, header}:Props) {
  const c = useOwl();
  const safe = useSafeAreaInsets();
  const {width, fontScale} = useWindowDimensions();
  const desktop = width / Math.max(1,fontScale) >= 960;
  const scroll = useRef<ScrollView>(null);
  const [section, setSection] = useState<Section>('Beranda');
  const [startInvite, setStartInvite] = useState(false);
  const [revision, setRevision] = useState(0);
  const changed = () => setRevision(value => value + 1);
  const load = useCallback(async () => checked(await db.from('memberships')
    .select('user_id,email,role,resident_name,home_address,whatsapp').eq('rt_id',rt)) as Member[], [rt]);
  const members = useRead(load, revision, true);
  function navigate(next:Section, invite = false) {
    if (next === section) return;
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
      const selected = section===label;
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
    {section==='Beranda' ? <Overview rt={rt} count={members.data?.filter(member=>member.role==='resident').length}
      invite={() => navigate('Warga',true)} desktop={desktop}/> :
      section==='Presensi' ? <ManagerReport rt={rt}/> :
      !members.data ? <LoadState {...members}/> :
      section==='Warga' ? <Residents rt={rt} name={name} members={members.data} revision={revision}
        changed={changed} startInvite={startInvite}/> :
      <ManagerSettings rt={rt} name={name} owner={owner && members.data.some(m=>m.user_id===userId&&m.role==='owner')}
        members={members.data} changed={changed}/>}
      </View>
    </ScrollView>
    {!desktop && navigation}
  </View>;
}

function Overview({rt,count,invite,desktop}:{rt:string;count?:number;invite:()=>void;desktop:boolean}) {
  const c = useOwl();
  const load = useCallback(async () => {
    const day = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const start = Date.parse(day+'T00:00:00+07:00');
    const rows = checked(await db.rpc('attendance_report',{target:rt,
      period_start:new Date(start).toISOString(),period_end:new Date(start+86_400_000).toISOString()})) as {status:string}[];
    return rows.filter(row=>row.status.startsWith('Hadir')).length;
  },[rt]);
  const attendance = useRead(load,0);
  return <>
    <ImageBackground source={require('../assets/village-night.webp')} imageStyle={{borderRadius:20}}
      style={{height:desktop?280:158,justifyContent:'flex-end'}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12,padding:16,
        backgroundColor:'rgba(10,20,35,.88)',borderBottomLeftRadius:20,borderBottomRightRadius:20}}>
        <Image accessible={false} source={require('../public/ronda-pak-owl.png')} style={{width:44,height:44}}/>
        <Text accessibilityRole="header" style={[type.title,{color:'white',flex:1}]}>Ringkasan ronda</Text>
      </View>
    </ImageBackground>
    <View style={{flexDirection:'row',gap:10}}>
      {[{label:'Warga terdaftar',value:count},{label:'Presensi hari ini',value:attendance.data}].map(metric =>
        <View key={metric.label} style={{flex:1,minWidth:0,gap:6,padding:14,borderRadius:16,borderWidth:1,
          borderColor:c.border,backgroundColor:c.surface}}>
          <Text style={[type.label,{color:c.textSecondary}]}>{metric.label}</Text>
          <Text style={[type.title,{color:c.text,fontVariant:['tabular-nums']}]}>{metric.value ?? '—'}</Text>
        </View>)}
    </View>
    {attendance.error ? <LoadState {...attendance}/> : null}
    <View style={{alignSelf:desktop?'flex-start':'stretch',minWidth:desktop?220:undefined}}>
      <Button label="Undang warga" icon="person-add-outline" onPress={invite}/>
    </View>
  </>;
}
