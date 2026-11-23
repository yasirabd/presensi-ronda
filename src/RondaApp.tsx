import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db, configured } from './client';
import { useWorkspace } from './store';
import { Screen, Card, Body, Button, Title, useOwl } from './ui';
import Landing from './Landing';
import Access from './Access';
import Manager, {type ManagerSection} from './Manager';
import Resident from './Resident';

export default function RondaApp({path}: {path: string}) {
  const raw = useLocalSearchParams();
  const params = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k, Array.isArray(v) ? v[0] : v || '']));
  const w = useWorkspace();
  const theme = useOwl();
  const safe = useSafeAreaInsets();
  const {height} = useWindowDimensions();
  const [options, setOptions] = useState(false);
  const [page,setPage]=useState<"Profil saya"|"Privasi"|"Pengaturan RT"|null>(null);
  const [managerTab,setManagerTab]=useState<ManagerSection>('Beranda');
  const [residentTab,setResidentTab]=useState('Presensi');
  const [personal, setPersonal] = useState(false);
  const [notice, setNotice] = useState('');
  const user = w.session?.user.id;
  useEffect(() => { if (user) void w.refresh(); }, [user, w.refresh]);
  useEffect(() => { setPersonal(false); setManagerTab('Beranda'); setResidentTab('Presensi'); setPage(null); setOptions(false); setNotice(''); }, [w.current,user]);
  const invitation = !!params.undangan || params.wa === '1' || params.gabung === '1';
  const login = () => router.replace({ pathname:'/masuk', params });
  const register = () => router.replace({ pathname:'/daftar', params });
  const done = (room?: string) => {
    useWorkspace.getState().sessionChanged(w.session,false);
    void w.refresh(room);
    router.replace('/');
  };
  const access = (mode: 'login'|'signup'|'setup'|'join'|'reset') =>
    <Access mode={mode} params={params} onLogin={login} onRegister={register} onDone={done}/>;
  if (!w.ready) return <Screen><Body>Memuat Ronda Pak…</Body></Screen>;
  if (!w.session && path==='/' && !invitation && !params['siapkan-rt'] && !params.pemulihan && !params.error)
    return <Landing onRegister={() => router.push('/daftar')} onLogin={() => router.push('/masuk')}/>;
  if (!configured) return <Screen><Title>Layanan belum terhubung</Title><Body>Konfigurasi proyek Supabase diperlukan untuk masuk.</Body></Screen>;
  if (!w.session) return access(path==='/daftar' || (invitation && path!=='/masuk') ? 'signup':'login');
  if (w.recovery || params.pemulihan==='1') return access('reset');
  if (invitation) return access('join');
  if (path==='/daftar' || params['siapkan-rt']==='1') return access('setup');
  const room = w.rooms.find(item => item.id===w.current);
  const manager = room?.role==='owner' || room?.role==='manager';
  async function logout() {
    const {error} = await db.auth.signOut();
    if(error) setNotice('Gagal keluar. Periksa koneksi dan coba lagi.');
    else { setOptions(false); router.replace('/'); }
  }
  function openPage(next:typeof page){setPage(next);setOptions(false);}
  const membership = <Card><Body>Keanggotaan</Body>
              <Button secondary icon="ticket-outline" label="Gunakan kode undangan"
                onPress={()=>{setOptions(false);router.push({pathname:'/',params:{gabung:'1'}});}}/>
              <Button secondary icon="add-circle-outline" label="Daftarkan RT lain"
                onPress={()=>{setOptions(false);router.push('/daftar');}}/>
            </Card>;
  const header = <>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <View style={{flex:1}}><Title>{room?.name || 'Ronda Pak'}</Title></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Pilihan akun dan RT" accessibilityState={{expanded:options}} aria-expanded={options}
        onPress={()=>{setNotice('');setOptions(true);}} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:theme.surface}}>
        <Image accessible={false} source={require('../public/ronda-pak-owl.png')} style={{width:32,height:32}}/>
      </Pressable>
    </View>
    <Modal visible={options} transparent animationType="slide" onRequestClose={()=>setOptions(false)}>
      <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(9,16,28,.48)'}}>
        <Pressable accessible={false} importantForAccessibility="no" tabIndex={-1}
          onPress={()=>setOptions(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
        <View accessibilityViewIsModal style={{width:'100%',maxWidth:520,alignSelf:'center',maxHeight:height*.86,
          backgroundColor:theme.bg,borderTopLeftRadius:28,borderTopRightRadius:28,overflow:'hidden'}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingTop:14,paddingBottom:8}}>
            <Title>Akun dan RT</Title>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup menu akun" onPress={()=>setOptions(false)}
              style={{width:48,height:48,justifyContent:'center',alignItems:'center',borderRadius:24,backgroundColor:theme.surface}}>
              <Ionicons name="close-outline" size={24} color={theme.text}/>
            </Pressable>
          </View>
          <ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:12,paddingHorizontal:16,paddingBottom:Math.max(20,safe.bottom+12)}}>
            <Card><Body>RT aktif</Body><Title>{room?.name || 'Belum memilih RT'}</Title>
              {w.rooms.filter(item=>item.id!==w.current).map(item=><Button key={item.id}
                icon="swap-horizontal-outline" label={'Pindah ke '+item.name} secondary
                onPress={()=>{setOptions(false);w.choose(item.id);}}/>)}
              {manager && <Button secondary icon={personal?'settings-outline':'location-outline'}
                label={personal?'Kelola RT':'Presensi saya'} onPress={()=>{setResidentTab('Presensi');setPersonal(!personal);openPage(null);}}/>}
            </Card>
            {room && <Card><Body>Akun saya</Body>
              <Button secondary icon="person-outline" label="Profil saya" onPress={()=>openPage('Profil saya')}/>
              {manager && <Button secondary icon="settings-outline" label="Pengaturan RT" onPress={()=>{setPersonal(false);openPage('Pengaturan RT');}}/>}
            </Card>}
            {!room && membership}
            {!!notice && <Body>{notice}</Body>}
            <Button secondary icon="log-out-outline" label="Keluar" onPress={logout}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
  if (!w.error && room && user && (page==='Profil saya' || page==='Privasi')) {
    return <Screen>{header}<Button quiet label={'Kembali ke '+(page==='Privasi'?'Profil saya':manager&&!personal?managerTab:residentTab)} icon="arrow-back-outline" onPress={()=>openPage(page==='Privasi'?'Profil saya':null)}/>
      <Resident section={residentTab} setSection={setResidentTab} rt={room.id} userId={user} page={page} openProfile={()=>openPage('Profil saya')}/>
      {page==='Profil saya' && <>
        <Button secondary icon="lock-closed-outline" label="Ajukan permintaan data pribadi" onPress={()=>openPage('Privasi')}/>
        {membership}
      </>}
    </Screen>;
  }
  if (!w.error && room && user && manager && !personal) {
    return <Manager section={managerTab} setSection={setManagerTab} key={room.id+user} rt={room.id} userId={user} name={room.name}
      settingsOpen={page==='Pengaturan RT'} settings={value=>openPage(value?'Pengaturan RT':null)}
      owner={room.role==='owner'} header={header}/>;
  }
  return <Screen>{header}
    {w.error ? <Card><Body>{w.error}</Body><Button label="Coba lagi" onPress={()=>void w.refresh()}/></Card>
      : room && user ? <Resident section={residentTab} setSection={setResidentTab} openProfile={()=>openPage('Profil saya')} key={room.id+user} rt={room.id} userId={user}/>
      : w.loading ? <Body>Memuat ruang RT…</Body> : <Card><Title>Mulai di Ronda Pak</Title>
        <Body>Pengurus dapat mendaftarkan RT. Untuk bergabung sebagai warga, buka undangan dari pengurus Anda.</Body>
        <Button label="Daftarkan RT" onPress={()=>router.push('/daftar')}/>
      </Card>}
  </Screen>;
}
