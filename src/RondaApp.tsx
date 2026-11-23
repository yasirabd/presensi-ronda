import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, configured } from './client';
import { useWorkspace } from './store';
import { Screen, Card, Body, Button, Title, useOwl } from './ui';
import Landing from './Landing';
import Access from './Access';
import Manager from './Manager';
import Resident from './Resident';

export default function RondaApp({path}: {path: string}) {
  const raw = useLocalSearchParams();
  const params = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k, Array.isArray(v) ? v[0] : v || '']));
  const w = useWorkspace();
  const theme = useOwl();
  const [options, setOptions] = useState(false);
  const [personal, setPersonal] = useState(false);
  const [notice, setNotice] = useState('');
  const user = w.session?.user.id;
  useEffect(() => { if (user) void w.refresh(); }, [user, w.refresh]);
  useEffect(() => { setPersonal(false); setOptions(false); setNotice(''); }, [w.current,user]);
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
    else router.replace('/');
  }
  const header = <>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <View style={{flex:1}}><Title>{room?.name || 'Ronda Pak'}</Title></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Pilihan akun dan RT" accessibilityState={{expanded:options}}
        onPress={()=>setOptions(!options)} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:theme.surface}}>
        <Ionicons name={options ? "close-outline" : "person-circle-outline"} size={24} color={theme.text}/>
      </Pressable>
    </View>
    {options && <Card>
      {w.rooms.length>1 && <><Body>Pilih RT aktif</Body>{w.rooms.map(item=><Button key={item.id} icon={item.id===w.current?'checkmark-circle-outline':'home-outline'} label={item.name} secondary={item.id!==w.current} onPress={()=>w.choose(item.id)}/>)}</>}
      {manager && <Button secondary icon={personal?'settings-outline':'location-outline'} label={personal?'Kelola RT':'Presensi saya'} onPress={()=>{setPersonal(!personal);setOptions(false);}}/>}
      <Button secondary icon="ticket-outline" label="Gunakan kode undangan" onPress={()=>router.push({pathname:'/',params:{gabung:'1'}})}/>
      <Button secondary icon="add-circle-outline" label="Daftarkan RT lain" onPress={()=>router.push('/daftar')}/>
      <Button secondary icon="log-out-outline" label="Keluar" onPress={logout}/>
    </Card>}
    {!!notice && <Body>{notice}</Body>}
  </>;
  if (!w.error && room && user && manager && !personal) {
    return <Manager key={room.id+user} rt={room.id} userId={user} name={room.name}
      owner={room.role==='owner'} header={header}/>;
  }
  return <Screen>{header}
    {w.error ? <Card><Body>{w.error}</Body><Button label="Coba lagi" onPress={()=>void w.refresh()}/></Card>
      : room && user ? <Resident key={room.id+user} rt={room.id} userId={user}/>
      : w.loading ? <Body>Memuat ruang RT…</Body> : <Card><Title>Mulai di Ronda Pak</Title>
        <Body>Pengurus dapat mendaftarkan RT. Untuk bergabung sebagai warga, buka undangan dari pengurus Anda.</Body>
        <Button label="Daftarkan RT" onPress={()=>router.push('/daftar')}/>
      </Card>}
  </Screen>;
}
