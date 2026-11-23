import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState, type ReactNode } from 'react';
import { Image, ImageBackground, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from './client';
import { checked, useRead, LoadState, type Member } from './manager-common';
import { Residents } from './ManagerResidents';
import { ManagerReport } from './ManagerReport';
import { ManagerSettings } from './ManagerSettings';
import { Body, Button, Card, Screen, useOwl } from './ui';
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
  const [section, setSection] = useState<Section>('Beranda');
  const [startInvite, setStartInvite] = useState(false);
  const [revision, setRevision] = useState(0);
  const changed = () => setRevision(value => value + 1);
  const load = useCallback(async () => checked(await db.from('memberships')
    .select('user_id,email,role,resident_name,home_address,whatsapp').eq('rt_id',rt)) as Member[], [rt]);
  const members = useRead(load, revision, true);
  const footer = <View style={{backgroundColor:c.surface, borderTopColor:c.border, borderTopWidth:1,
    paddingBottom:Math.max(8,safe.bottom), paddingTop:8, paddingHorizontal:Math.max(8,safe.left,safe.right)}}>
    <View style={{width:'100%',maxWidth:720,alignSelf:'center',flexDirection:'row',gap:4}}>
      {tabs.map(({label,icon}) => {
        const selected = section===label;
        const color = selected ? c.accent : c.textSecondary;
        return <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label}
          accessibilityState={{selected}} aria-selected={selected} onPress={() => {
            if (selected) return;
            setStartInvite(false);
            setSection(label);
          }} style={({pressed}) => ({flex:1,minHeight:52,alignItems:'center',justifyContent:'center',
            borderRadius:12,gap:3,backgroundColor:selected || pressed ? c.accentSoft : 'transparent'})}>
          <Ionicons accessible={false} name={icon} size={21} color={color}/>
          <Text style={[type.label,{color,textAlign:'center',fontSize:12}]}>{label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
  return <Screen footer={footer}>
    {header}
    {section==='Beranda' ? <Overview rt={rt} count={members.data?.filter(member=>member.role==='resident').length}
      invite={() => {setStartInvite(true);setSection('Warga');}}/> :
      section==='Presensi' ? <ManagerReport rt={rt}/> :
      !members.data ? <LoadState {...members}/> :
      section==='Warga' ? <Residents rt={rt} name={name} members={members.data} revision={revision}
        changed={changed} startInvite={startInvite}/> :
      <ManagerSettings rt={rt} name={name} owner={owner && members.data.some(m=>m.user_id===userId&&m.role==='owner')}
        members={members.data} changed={changed}/>}
  </Screen>;
}

function Overview({rt,count,invite}:{rt:string;count?:number;invite:()=>void}) {
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
      style={{minHeight:170,justifyContent:'flex-end'}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12,padding:16,
        backgroundColor:'rgba(10,20,35,.88)',borderBottomLeftRadius:20,borderBottomRightRadius:20}}>
        <Image accessible={false} source={require('../public/ronda-pak-owl.png')} style={{width:44,height:44}}/>
        <Text accessibilityRole="header" style={[type.title,{color:'white',flex:1}]}>Ringkasan ronda</Text>
      </View>
    </ImageBackground>
    <View style={{flexDirection:'row',gap:8}}>
      <View style={{flex:1}}><Card><Body>Warga terdaftar</Body><Body>{count ?? '—'}</Body></Card></View>
      <View style={{flex:1}}><Card><Body>Presensi hari ini</Body><Body>{attendance.data ?? '—'}</Body></Card></View>
    </View>
    {attendance.error ? <LoadState {...attendance}/> : null}
    <Button label="Undang warga" icon="person-add-outline" onPress={invite}/>
  </>;
}
