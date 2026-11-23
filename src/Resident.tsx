import {SectionMenu} from './SectionMenu';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';
import { apiUrl, db } from './client';
import Capture, { jpegBytes } from './Capture';
import { statusPresensi, checked, Choices, LoadState, useRead, useWork } from './manager-common';
import { Body, Button, Card, Field, Title } from './ui';

type Props = { rt: string; userId: string };
type Profile = { resident_name: string | null; home_address: string | null };
type Proof = { session: string; shift: string };
type HistoryRow = { id: string; starts_at: string; post: string; status: string };
type PrivacyRequest = { id: string; created_at: string; kind: string; details: string; resolution: string | null };

function displayTime(value: string, zone: string) {
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: zone });
}

async function submitFace({ rt, userId }: Props, jpeg: string, proof?: Proof) {
  const { data: { session } } = await db.auth.getSession();
  if (!session || session.user.id !== userId) throw new Error('Silakan masuk kembali.');
  const bytes = jpegBytes(jpeg);
  const response = await fetch(apiUrl('/api/face'), {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'image/jpeg', 'x-rt': rt,
      ...(proof ? { 'x-action': 'verify', 'x-shift': proof.shift, 'x-location-session': proof.session } :
        { 'x-action': 'enroll', 'x-consent': 'v1' }),
    },
    body: bytes.buffer,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.time) throw new Error(result?.error || 'Verifikasi wajah gagal. Coba lagi atau hubungi pengurus.');
  return result.time as string;
}

function Attendance({ rt, userId, zone, status }: Props & { zone: string; status: string }) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState('');
  const [recordedDay, setRecordedDay] = useState('');
  const work = useWork();
  const day = (date: Date) => date.toLocaleDateString('id-ID', { timeZone: zone });

  async function checkLocation() {
    setMessage('');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Izinkan akses lokasi di pengaturan perangkat, lalu coba lagi.');
    const position = await new Promise<Location.LocationObject>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Lokasi belum terbaca. Coba lagi di tempat terbuka.')), 15000);
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        .then(resolve, () => reject(new Error('Lokasi gagal dibaca. Periksa layanan lokasi dan coba lagi.')))
        .finally(() => clearTimeout(timer));
    });
    if (position.coords.accuracy == null) throw new Error('Akurasi lokasi belum tersedia. Coba lagi di tempat terbuka.');
    const result = checked(await db.rpc('start_attendance', {
      target: rt, lat: position.coords.latitude, lon: position.coords.longitude,
      accuracy_m: position.coords.accuracy, sampled_at: new Date(position.timestamp).toISOString(),
    }));
    switch (result.status) {
      case 'inside':
        setProof({ session: result.session_id, shift: result.shift_id });
        setMessage('Lokasi sesuai. Lanjutkan dengan kamera depan.');
        break;
      case 'already_recorded':
        setRecordedDay(day(new Date()));
        setMessage('Presensi hari ini sudah tercatat.');
        break;
      case 'outside': setMessage('Dekati pos ronda, lalu coba lagi.'); break;
      case 'uncertain': setMessage('Lokasi kurang akurat. Pindah ke tempat terbuka, lalu coba lagi.'); break;
      default: throw new Error('Gagal memeriksa lokasi. Coba lagi.');
    }
  }

  return <Card>
    <Title>Presensi ronda</Title>
    <Body>{status === 'ready' ? 'Datang ke pos ronda, lalu izinkan pemeriksaan lokasi dan wajah Anda.' :
      'Lengkapi pendaftaran wajah untuk presensi mandiri, atau minta pengurus mencatat presensi manual.'}</Body>
    {message ? <Body>{message}</Body> : null}
    {work.message ? <Body>{work.message}</Body> : null}
    {proof ? <Capture onCancel={() => { setProof(null); setMessage('Silakan periksa kembali lokasi Anda.'); }}
      onCapture={async jpeg => {
        const time = await submitFace({ rt, userId }, jpeg, proof);
        setRecordedDay(day(new Date(time))); setProof(null);
        setMessage('Hadir · ' + displayTime(time, zone));
      }} /> : status === 'ready' && recordedDay !== day(new Date()) &&
        <Button label={work.busy ? 'Memeriksa lokasi…' : 'Presensi sekarang'}
          disabled={work.busy} onPress={() => work.run(checkLocation)} />}
  </Card>;
}

function ProfileForm({ rt, userId, profile, saved }: Props & { profile: Profile; saved: (value: Profile) => void }) {
  const [name, setName] = useState(profile.resident_name || '');
  const [address, setAddress] = useState(profile.home_address || '');
  const work = useWork();
  return <Card>
    <Title>Profil saya</Title>
    <Field label="Nama warga" value={name} onChangeText={setName} />
    <Field label="Alamat rumah" value={address} onChangeText={setAddress} multiline />
    <Button label={work.busy ? 'Menyimpan…' : 'Simpan data warga'} disabled={work.busy} onPress={() => work.run(async () => {
      if (!name.trim() || !address.trim() || name.trim().length > 120 || address.trim().length > 300)
        throw new Error('Isi nama hingga 120 karakter dan alamat hingga 300 karakter.');
      checked(await db.rpc('save_resident_profile', { target: rt, member: userId, full_name: name.trim(), address: address.trim() }));
      saved({ resident_name: name.trim(), home_address: address.trim() });
    }, 'Data warga tersimpan.')} />
    {work.message ? <Body>{work.message}</Body> : null}
  </Card>;
}

function Registration({ rt, userId, complete, status, changed }: Props & {
  complete: boolean; status: string; changed: (status: string) => void;
}) {
  const [camera, setCamera] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const work = useWork();
  return <Card>
    <Title>Pendaftaran wajah saya</Title>
    {status === 'ready' ? <>
      <Body>Wajah terdaftar. Anda bisa menarik persetujuan dan beralih ke presensi manual.</Body>
      {confirmWithdrawal ? <>
        <Body>Hapus templat wajah dari RT ini?</Body>
        <Button label="Hapus templat wajah" disabled={work.busy} onPress={() => work.run(async () => {
          checked(await db.rpc('withdraw_face', { target: rt }));
          changed('pending'); setConfirmWithdrawal(false);
        }, 'Templat wajah dihapus.')} />
        <Button secondary label="Batal" disabled={work.busy} onPress={() => setConfirmWithdrawal(false)} />
      </> : <Button secondary label="Tarik persetujuan" onPress={() => setConfirmWithdrawal(true)} />}
    </> : !complete ? <Body>Isi nama dan alamat di Profil saya sebelum mendaftarkan wajah.</Body> :
      status === 'approved' ? <>
        <Body>Dengan melanjutkan, Anda menyetujui penyimpanan templat wajah terenkripsi untuk presensi RT ini. Foto hanya diproses saat pemeriksaan. Anda dapat menarik persetujuan di sini.</Body>
        {camera ? <Capture onCancel={() => setCamera(false)} onCapture={async jpeg => {
          await submitFace({ rt, userId }, jpeg); setCamera(false); changed('ready');
        }} /> : <Button label="Saya setuju, buka kamera" onPress={() => setCamera(true)} />}
      </> : <Body>Minta pengurus memeriksa identitas Anda sebelum mendaftarkan wajah. Anda juga dapat menggunakan presensi manual.</Body>}
    {work.message ? <Body>{work.message}</Body> : null}
  </Card>;
}

function History({ rt, zone }: { rt: string; zone: string }) {
  const read = useRead(useCallback(async () => checked(await db.rpc('my_schedule', { target: rt })) as HistoryRow[], [rt]), 0);
  return <Card><Title>Riwayat presensi saya</Title>
    {!read.data ? <LoadState {...read} /> : read.data.length === 0 ? <Body>Belum ada riwayat presensi.</Body> :
      read.data.map(row => <View key={row.id}><Body>{row.post} · {statusPresensi(row.status)}</Body><Body>{displayTime(row.starts_at, zone)}</Body></View>)}
  </Card>;
}

function Privacy({ rt, userId, contact, zone }: Props & { contact: string; zone: string }) {
  const [kind, setKind] = useState('Akses');
  const [details, setDetails] = useState('');
  const work = useWork();
  const requests = useRead(useCallback(async () => checked(await db.from('privacy_requests')
    .select('id,kind,details,resolution,created_at').eq('rt_id', rt).eq('user_id', userId)
    .order('created_at', { ascending: false })) as PrivacyRequest[], [rt, userId]), 0);
  return <Card><Title>Hubungi pengurus RT</Title>
    <Body>{contact || 'Kirim permintaan terkait data pribadi Anda kepada pengurus RT.'}</Body>
    <Body>Jenis permintaan</Body><Choices items={['Akses', 'Koreksi', 'Penghapusan']} value={kind} select={setKind} />
    <Field label="Permintaan Anda" value={details} onChangeText={setDetails} multiline />
    <Button label={work.busy ? 'Mengirim…' : 'Kirim permintaan'} disabled={work.busy} onPress={() => work.run(async () => {
      if (!details.trim() || details.trim().length > 500) throw new Error('Isi permintaan hingga 500 karakter.');
      checked(await db.from('privacy_requests').insert({ rt_id: rt, kind, details: details.trim() }));
      setDetails(''); requests.reload();
    }, 'Permintaan terkirim.')} />
    {work.message ? <Body>{work.message}</Body> : null}
    {!requests.data ? <LoadState {...requests} /> : requests.data.map(item => <View key={item.id}>
      <Body>{item.kind} · {displayTime(item.created_at, zone)}</Body>
      <Body>{item.details}</Body><Body>{item.resolution || 'Menunggu tanggapan pengurus.'}</Body>
    </View>)}
  </Card>;
}

type SpaceProps = Props & {section:string;setSection:(section:string)=>void;page?:'Profil saya'|'Privasi';openProfile:()=>void};
function ResidentSpace({ rt, userId, page, openProfile, section, setSection }: SpaceProps) {
  const read = useRead(useCallback(async () => {
    const [profile, face, community] = await Promise.all([
      db.from('memberships').select('resident_name, home_address').eq('rt_id', rt).eq('user_id', userId).single(),
      db.rpc('face_status', { target: rt }),
      db.from('communities').select('zone, privacy_contact').eq('id', rt).single(),
    ]);
    return { profile: checked(profile) as Profile, face: checked(face) as string,
      community: checked(community) as { zone: string; privacy_contact: string | null } };
  }, [rt, userId]), 0);
  const [updatedProfile, setProfile] = useState<Profile | null>(null);
  const [updatedFace, setFace] = useState<string | null>(null);
  if (!read.data) return <Card><LoadState {...read} /></Card>;
  const profile = updatedProfile || read.data.profile;
  const face = updatedFace || read.data.face;
  const { zone, privacy_contact } = read.data.community;
  return <View style={{ gap: 16 }}>
    {!page && <SectionMenu items={['Presensi', 'Riwayat']} value={section} select={setSection} />}
    {!page && section === 'Presensi' ? <><Attendance rt={rt} userId={userId} status={face} zone={zone} />
        {face!=='ready' && <Button label="Lengkapi pendaftaran wajah" onPress={openProfile}/>}</> :
      !page && section === 'Riwayat' ? <History rt={rt} zone={zone} /> :
      page === 'Privasi' ? <Privacy rt={rt} userId={userId} contact={privacy_contact || ''} zone={zone} /> : <>
        <ProfileForm rt={rt} userId={userId} profile={profile} saved={setProfile} />
        <Registration rt={rt} userId={userId} complete={!!(profile.resident_name && profile.home_address)} status={face} changed={setFace} />
      </>}
  </View>;
}

export default function Resident(props: SpaceProps) {
  return <ResidentSpace key={props.rt + '/' + props.userId} {...props} />;
}
