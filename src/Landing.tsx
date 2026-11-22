import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './ui';

import { nightGround, VillageStage } from './NightScene';
import { type } from './theme/typography';




const guides = [
  { title: 'Cara absen sebagai warga', steps: [
    'Buka tautan undangan WhatsApp dari pengurus. Isi data diri dan rekam wajah. Jika sudah punya akun, masuk dulu.',
    'Konfirmasi email, lalu tunggu persetujuan pengurus. Jika tadi melewati kamera, daftarkan wajah sebelum presensi pertama.',
    'Di pos ronda, pilih Absen sekarang. Izinkan akses lokasi dan kamera depan, lalu pilih Verifikasi kehadiran. Status Hadir berarti presensi sudah tercatat.',
  ] },
  { title: 'Cara menyiapkan RT', steps: [
    'Pilih Daftarkan RT, buat akun, dan konfirmasi email. Isi nomor RT, RW, serta wilayah.',
    'Di menu Undang warga, isi nama dan nomor WhatsApp penerima. Kirim tautan lewat chat pribadi dan periksa pengajuan yang masuk.',
    'Saat berada di pos ronda, buka Pengaturan RT dan simpan lokasi pos. Periksa kehadiran warga di Rekap presensi.',
  ] },
];

export default function Landing({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  const c = {bg:nightGround,text:'#f2f3f7',border:'#324051',accent:'#bdcafa'};
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width / Math.max(1, fontScale) >= 820;
  const [openGuide, setOpenGuide] = useState<number | null>(null);
  return <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: c.bg }}
    contentContainerStyle={{paddingBottom:48+insets.bottom}}>
    <VillageStage actions={depart=><View style={{gap:12,marginTop:20}}>
      <View style={s.actions}>
        <Button label="Daftarkan RT" onPress={()=>depart(onRegister)}/>
        <Button label="Masuk" secondary onPress={()=>depart(onLogin)}/>
      </View>
      <Text style={[s.note,{color:'#e4e9f2'}]}>Warga baru? Buka tautan undangan dari pengurus RT.</Text>
    </View>}>
      <Text accessibilityRole="header" style={[s.headline,{color:'white',fontSize:wide?52:34,lineHeight:wide?56:40}]}>Kelola ronda RT dengan mudah.</Text>
      <Text style={[type.body,{color:'#f3f5fa',marginTop:12}]}>Undang warga lewat WhatsApp, atur lokasi pos ronda, dan lihat rekap kehadiran dalam satu tempat.</Text>
    </VillageStage>
    <View style={[s.canvas,{alignSelf:'center',paddingHorizontal:wide?48:16}]}>
      <View style={s.guide}>
        <Text accessibilityRole="header" style={[s.guideTitle, { color: c.text }]}>Panduan ronda</Text>
        <View style={s.questions}>{guides.map((guide, index) => {
          const expanded = openGuide === index;
          return <View key={guide.title} style={[s.question, { borderBottomColor: c.border }]}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
              onPress={() => setOpenGuide(expanded ? null : index)}
              style={({ pressed }) => [s.trigger, { opacity: pressed ? 0.65 : 1 }]}>
              <Text style={[s.triggerText, { color: c.text }]}>{guide.title}</Text>
              <Text accessible={false} style={[s.symbol, { color: c.accent }]}>{expanded ? '−' : '+'}</Text>
            </Pressable>
            {expanded && <View style={s.steps}>{guide.steps.map((step, i) =>
              <View key={step} style={s.step}>
                <Text style={[s.number, { color: c.accent }]}>{i + 1}.</Text>
                <View style={s.column}><Text style={[type.body,{color:'#d5dce6'}]}>{step}</Text></View>
              </View>)}</View>}
          </View>;
        })}</View>
      </View>
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  canvas: { width: '100%', maxWidth: 1120 },
  column: { flex: 1, minWidth: 0 },
  headline: type.hero,
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingTop: 4 },
  note: type.label,
  guide: { paddingTop: 24, gap: 12 },
  guideTitle: type.display,
  questions: { width: '100%', maxWidth: 720 },
  question: { borderBottomWidth: 1 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between',
    minHeight: 52, paddingVertical: 10 },
  triggerText: { ...type.headline, flex: 1 },
  symbol: { fontSize: 24 },
  steps: { gap: 12, paddingBottom: 18 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  number: type.bodyStrong,
});
