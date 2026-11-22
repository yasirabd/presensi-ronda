import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, useOwl } from './ui';

import { type } from './theme/typography';

const owl = require('../public/ronda-pak-owl.png');
const gathering = require('../public/ronda-bersama.webp');

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
  const c = useOwl();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width / Math.max(1, fontScale) >= 820;
  const [openGuide, setOpenGuide] = useState<number | null>(null);
  return <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1, backgroundColor: c.bg }}
    contentContainerStyle={[s.page, { paddingLeft: (wide ? 48 : 16) + insets.left,
      paddingRight: (wide ? 48 : 16) + insets.right, paddingTop: insets.top, paddingBottom: 56 + insets.bottom }]}>
    <View style={s.canvas}>
      <View style={[s.masthead, { borderBottomColor: c.border }]}>
        <Image source={owl} accessible={false} style={s.owl} />
        <Text style={[s.brand, { color: c.accent }]}>Ronda Pak</Text>
      </View>
      <View style={[s.hero, wide && s.heroWide]}>
        <View style={[s.copy, wide && s.column]}>
          <Text accessibilityRole="header" style={[s.headline, { color: c.text }]}>Kelola ronda RT dengan mudah.</Text>
          <Body>Undang warga lewat WhatsApp, atur lokasi pos ronda, dan lihat rekap kehadiran dalam satu tempat.</Body>
          <View style={s.actions}>
            <Button label="Daftarkan RT" onPress={onRegister} />
            <Button label="Masuk" onPress={onLogin} secondary />
          </View>
          <Text style={[s.note, { color: c.textSecondary }]}>Warga baru? Buka tautan undangan dari pengurus RT.</Text>
        </View>
        <View style={[wide && s.column, s.art, { backgroundColor: c.highlightSoft }]}>
          <Image source={gathering} accessibilityLabel="Warga berkumpul di pos ronda, ditemani burung hantu di atas atap."
            accessible resizeMode="contain" style={s.scene} />
        </View>
      </View>
      <View style={[s.guide, { borderColor: c.border }]}>
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
                <View style={s.column}><Body>{step}</Body></View>
              </View>)}</View>}
          </View>;
        })}</View>
      </View>
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { alignItems: 'center', paddingBottom: 56 },
  canvas: { width: '100%', maxWidth: 1120 },
  masthead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 17, borderBottomWidth: 1 },
  owl: { width: 42, height: 42 },
  brand: type.wordmark,
  hero: { gap: 24, paddingVertical: 32 },
  heroWide: { flexDirection: 'row', alignItems: 'center', gap: 48, paddingVertical: 56 },
  copy: { gap: 18 },
  column: { flex: 1, minWidth: 0 },
  headline: type.hero,
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingTop: 4 },
  note: type.label,
  art: { borderRadius: 24, justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 6, paddingTop: 14 },
  scene: { width: '100%', height: undefined, aspectRatio: 4 / 3 },
  guide: { paddingTop: 24, borderTopWidth: 1, gap: 12 },
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
