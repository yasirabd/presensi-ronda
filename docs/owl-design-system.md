# Ronda Pak — Design System (Expo React Native)

Dokumen ini adalah satu-satunya sumber aturan visual aplikasi. Semua layar dan komponen wajib memakai token di sini. Jangan menulis warna hex, ukuran font, atau angka spacing langsung di komponen.

Stack: Expo + Expo Router + React Native `StyleSheet`. Tanpa library UI pihak ketiga.

---

## 1. Prinsip

1. **Konten dulu.** Chrome (bar, border, bayangan) seminimal mungkin.
2. **Permukaan netral dan satu aksen nila.** Gunakan putih dan abu sejuk untuk ruang kerja, grafit untuk mode gelap, serta nila untuk tindakan utama dan pilihan aktif. Warna hangat hadir melalui maskot dan ilustrasi.
3. **Hierarki lewat teks.** Bedakan tingkat dengan ukuran dan ketebalan, bukan dengan menambah kotak dan garis.
4. **Light dan dark sejak awal.** Setiap warna punya pasangan di kedua mode.
5. **Nyaman disentuh.** Target sentuh minimal 44×44. Hormati safe area.

---

## 2. Instalasi

```bash
npx expo install @expo-google-fonts/inter @expo-google-fonts/outfit expo-font expo-splash-screen expo-haptics react-native-safe-area-context @expo/vector-icons
```

Struktur folder:

```
theme/
  colors.ts
  typography.ts
  layout.ts
  index.ts
components/
  Text.tsx
  Button.tsx
  Card.tsx
  Screen.tsx
```

---

## 3. Token

### 3.1 Warna — `theme/colors.ts`

Warna diambil dari maskot burung hantu Ronda Pak:

| Sumber di maskot | Hex | Peran |
|---|---|---|
| Selempang (hijau hutan) | `#35511C` | Selempang pada maskot |
| Sayap (hijau sage) | `#899D6E` | Sayap pada ilustrasi |
| Bulu (emas) | `#E6B75D` | Sorotan merek: badge, streak, highlight |
| Wajah (krem hangat) | `#FDEDC9` | Wajah maskot |
| Latar kertas | `#FCF7E5` | Kertas pada ilustrasi |
| Bulan (kuning) | `#F6D55C` | Ikon mode malam / status ronda aktif |
| Paruh dan kaki (jingga) | `#F2A93B` | Aksen kecil di ilustrasi saja |

Emas, sage, kuning, dan jingga tidak cukup kontras untuk teks di atas krem. Pakai sebagai latar atau ilustrasi, dengan teks `text` atau `accent` di atasnya.

```ts
export const brand = {
  forest: '#35511C',
  sage: '#899D6E',
  gold: '#E6B75D',
  goldLight: '#EDCB82',
  cream: '#FDEDC9',
  paper: '#FCF7E5',
  moon: '#F6D55C',
  beak: '#F2A93B',
} as const;

export const palette = {
  light: {
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceRaised: '#FAFAFC',
    border: '#DDE0E6',
    controlBorder: '#858B96',
    text: '#191C24',
    textSecondary: '#535B69',
    textTertiary: '#646B78',
    accent: '#364C97',
    onAccent: '#FFFFFF',
    accentSoft: '#E9EDFA',
    highlight: '#E6B75D',
    onHighlight: '#302615',
    highlightSoft: '#F9F1E1',
    success: '#256247',
    successSoft: '#E5F3EA',
    danger: '#A43541',
    dangerSoft: '#FAEAEC',
    warning: '#80550D',
    warningSoft: '#FBF0D9',
    track: '#E8EAEE',
    overlay: 'rgba(20,23,32,0.36)',
    tabBar: 'rgba(255,255,255,0.94)',
  },
  dark: {
    bg: '#111318',
    surface: '#1B1E25',
    surfaceRaised: '#252932',
    border: '#363B46',
    controlBorder: '#787F8D',
    text: '#F2F3F7',
    textSecondary: '#B6BBC7',
    textTertiary: '#A3A9B6',
    accent: '#B7C6FF',
    onAccent: '#172348',
    accentSoft: '#2A334E',
    highlight: '#E6B75D',
    onHighlight: '#302615',
    highlightSoft: '#332E24',
    success: '#8BD8A9',
    successSoft: '#20392C',
    danger: '#FFA4AD',
    dangerSoft: '#40282E',
    warning: '#E9C481',
    warningSoft: '#393224',
    track: '#30343D',
    overlay: 'rgba(0,0,0,0.60)',
    tabBar: 'rgba(27,30,37,0.94)',
  },
} as const;

export type ColorName = keyof typeof palette.light;
export type Colors = Record<ColorName, string>;
```

Aturan pakai:

| Token | Dipakai untuk |
|---|---|
| `bg` | Latar layar |
| `surface` | Kartu, grup daftar, input |
| `surfaceRaised` | Sheet, modal, elemen di atas `surface` |
| `border` | Garis pemisah 1 px (hairline) |
| `text` / `textSecondary` / `textTertiary` | Judul dan isi / keterangan / placeholder dan nonaktif |
| `accent` | Tombol utama, tautan, tab aktif, toggle |
| `highlight` / `highlightSoft` | Badge, streak, kartu sorotan; teks di atasnya `onHighlight` |
| `*Soft` | Latar badge dan highlight; pasangkan dengan warna padatnya sebagai teks |
| `success` / `danger` / `warning` | Hanya untuk makna, bukan dekorasi |

### 3.2 Tipografi — `theme/typography.ts`

Ketebalan dipilih lewat `fontFamily`. **Jangan pakai `fontWeight`** bersama Inter: di Android nilainya diabaikan atau menghasilkan tebal palsu.

```ts
import type { TextStyle } from 'react-native';

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  brand: 'Outfit_800ExtraBold',
  brandBold: 'Outfit_700Bold',
} as const;

export const type = {
  wordmark: { fontFamily: fonts.brand,     fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  hero:     { fontFamily: fonts.brandBold, fontSize: 34, lineHeight: 41, letterSpacing: -0.5 },
  display:  { fontFamily: fonts.brandBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  title:    { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body:     { fontFamily: fonts.regular,  fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  callout:  { fontFamily: fonts.regular,  fontSize: 15, lineHeight: 20 },
  label:    { fontFamily: fonts.medium,   fontSize: 14, lineHeight: 18 },
  caption:  { fontFamily: fonts.regular,  fontSize: 13, lineHeight: 17 },
  micro:    { fontFamily: fonts.medium,   fontSize: 11, lineHeight: 13, letterSpacing: 0.1 },
} satisfies Record<string, TextStyle>;

export type TypeName = keyof typeof type;
```

Aturan pakai:

Dua keluarga font:

- **Outfit** (ExtraBold 800 dan Bold 700): wordmark "Ronda Pak" dan judul besar. Geometris dengan bentuk huruf bulat, jadi selaras dengan bentuk maskot.
- **Inter**: semua teks antarmuka lainnya.

Wordmark: tulis "Ronda Pak" dalam satu baris, Outfit ExtraBold, warna `text`, `letterSpacing` sekitar −2% dari ukuran font. Untuk splash, ikon aplikasi, dan materi cetak, ekspor wordmark sebagai SVG agar tidak bergantung pada pemuatan font.

| Gaya | Dipakai untuk |
|---|---|
| `wordmark` | Tulisan "Ronda Pak" di onboarding dan header |
| `hero` | Angka utama satu layar (saldo, total) |
| `display` | Judul besar layar |
| `title` | Judul bagian, judul sheet |
| `headline` | Judul baris daftar, teks tombol |
| `body` / `bodyStrong` | Isi / isi yang ditekankan |
| `callout` | Teks pendukung di kartu |
| `label` | Label form, chip, tab |
| `caption` | Keterangan, timestamp |
| `micro` | Label tab bar, badge |

Maksimal 3 gaya teks dalam satu kartu. Untuk angka di daftar, tambahkan `fontVariant: ['tabular-nums']`.

### 3.3 Spacing, radius, ukuran — `theme/layout.ts`

Grid dasar 4.

```ts
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,       // badge, chip kecil
  control: 14, // tombol, input
  card: 20,    // kartu, grup daftar
  sheet: 28,   // sheet, modal
  pill: 999,
} as const;

export const size = {
  touch: 44,        // target sentuh minimal
  control: 50,      // tinggi tombol dan input
  controlSmall: 36,
  icon: 22,
  iconSmall: 18,
  screenPadding: 16,
  hairline: 1,
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;
```

Aturan pakai:

- Padding horizontal layar: `size.screenPadding` (16).
- Jarak antar elemen dalam kartu: `space.sm` sampai `space.md`.
- Jarak antar kartu: `space.md`. Jarak antar bagian: `space.xl`.
- Padding dalam kartu: `space.lg`.
- Radius bersarang: radius dalam = radius luar − padding (minimal `radius.sm`).

### 3.4 Elevasi

Utamakan beda warna permukaan (`bg` → `surface` → `surfaceRaised`) daripada bayangan. Bayangan hanya untuk elemen mengambang (tab bar, FAB, toast):

```ts
export const shadow = {
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;
```

Di dark mode, jangan mengandalkan bayangan; pakai `border` 1 px.

---

## 4. Tema — `theme/index.ts`

```ts
import { useColorScheme } from 'react-native';
import { palette } from './colors';
import { type, fonts } from './typography';
import { space, radius, size, motion } from './layout';

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palette[scheme], type, fonts, space, radius, size, motion };
}

export * from './colors';
export * from './typography';
export * from './layout';
```

`app.json` harus berisi `"userInterfaceStyle": "automatic"` agar dark mode mengikuti sistem.

---

## 5. Memuat font — `app/_layout.tsx`

```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
```

---

## 6. Komponen dasar

### 6.1 Text — `components/Text.tsx`

Selalu pakai komponen ini, bukan `Text` dari `react-native`.

```tsx
import { Text as RNText, type TextProps } from 'react-native';
import { useTheme, type TypeName, type ColorName } from '@/theme';

type Props = TextProps & { variant?: TypeName; color?: ColorName };

export function Text({ variant = 'body', color = 'text', style, ...rest }: Props) {
  const { type, colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.3}
      style={[type[variant], { color: colors[color] }, style]}
      {...rest}
    />
  );
}
```

### 6.2 Screen — `components/Screen.tsx`

```tsx
import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

type Props = ViewProps & { scroll?: boolean };

export function Screen({ scroll = true, style, children, ...rest }: Props) {
  const { colors, size, space } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + space.md,
    paddingBottom: insets.bottom + space.xl,
    paddingHorizontal: size.screenPadding,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg }, padding, style]} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[padding, style]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
```

### 6.3 Button — `components/Button.tsx`

```tsx
import { Pressable, ActivityIndicator, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function Button({ label, variant = 'primary', loading, disabled, onPress, ...rest }: Props) {
  const { colors, radius, size, space } = useTheme();

  const bg = {
    primary: colors.accent,
    secondary: colors.surface,
    ghost: 'transparent',
    danger: colors.danger,
  }[variant];

  const fg = {
    primary: 'onAccent',
    secondary: 'text',
    ghost: 'accent',
    danger: 'onAccent',
  }[variant] as 'onAccent' | 'text' | 'accent';

  const off = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={(e) => {
        Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={({ pressed }) => ({
        minHeight: size.control,
        paddingHorizontal: space.xl,
        borderRadius: radius.control,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: off ? 0.4 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[fg]} />
      ) : (
        <Text variant="headline" color={fg}>{label}</Text>
      )}
    </Pressable>
  );
}
```

Aturan: satu tombol `primary` per layar. Aksi kedua pakai `secondary`, aksi ringan pakai `ghost`.

### 6.4 Card — `components/Card.tsx`

```tsx
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export function Card({ style, ...rest }: ViewProps) {
  const { colors, radius, space } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.lg },
        style,
      ]}
      {...rest}
    />
  );
}
```

### 6.5 Pola lain (spesifikasi)

| Komponen | Spesifikasi |
|---|---|
| Baris daftar | Tinggi minimal 52, padding horizontal `lg`, pemisah hairline `border` mulai sejajar teks (bukan ikon). Baris pertama dan terakhir mengikuti radius kartu. |
| Input | Tinggi `size.control`, latar `surface`, radius `control`, teks `body`, placeholder `textTertiary`. Fokus: border 1.5 `accent`. Error: border `danger` + pesan `caption` berwarna `danger`. |
| Chip / badge | Tinggi 28, radius `pill`, padding horizontal `md`, teks `label`. Latar `*Soft`, teks warna padatnya. |
| Tab bar | Maksimal 5 tab, ikon `size.icon`, label `micro`. Aktif `accent`, nonaktif `textTertiary`. |
| Sheet | Latar `surfaceRaised`, radius atas `sheet`, grabber 36×5 `track`, backdrop `overlay`. |
| Empty state | Ikon 48 `textTertiary`, judul `title`, penjelasan `callout` `textSecondary`, satu tombol. |
| Ikon | Ionicons varian outline untuk nonaktif, filled untuk aktif. Satu set ikon di seluruh aplikasi. |

---

## 7. Aksesibilitas

- Kontras teks minimal 4.5:1; teks besar (≥ 20) minimal 3:1.
- Semua elemen yang bisa ditekan punya `accessibilityRole` dan `accessibilityLabel` (jika tanpa teks).
- Jangan menyampaikan makna hanya lewat warna; tambahkan ikon atau teks.
- Biarkan font scaling aktif. `maxFontSizeMultiplier` 1.3 sudah diset di `Text`.
- Hormati "Reduce Motion": lewati animasi dekoratif.

---

## 8. Motion dan haptics

- Durasi: `fast` untuk tekan dan toggle, `base` untuk transisi layar dan sheet, `slow` hanya untuk momen perayaan.
- Animasikan `opacity` dan `transform` saja.
- Haptics: `selectionAsync` untuk tekan dan pilih, `notificationAsync(Success | Error)` untuk hasil aksi. Jangan pada scroll.

---

## 9. Checklist sebelum merge

- [ ] Tidak ada hex, ukuran font, atau angka spacing di luar folder `theme/`.
- [ ] Tidak ada `fontWeight`; ketebalan lewat `fonts.*`.
- [ ] Semua teks memakai `components/Text`.
- [ ] Layar dicek di light dan dark mode.
- [ ] Layar dicek di perangkat kecil (lebar 360) dan dengan ukuran font sistem besar.
- [ ] Target sentuh ≥ 44.
- [ ] Hanya satu tombol `primary` per layar.
- [ ] Safe area atas dan bawah aman (notch, home indicator).

---

## 10. Catatan

- Inter dan Outfit berlisensi SIL Open Font License; boleh dibundel di iOS, Android, dan web.
- Warna merek diambil dari gambar maskot (sampel piksel), jadi bisa selisih sedikit dari file desain aslinya. Jika ada file sumber maskot, samakan nilai `brand.*` dengan file itu.
- Uji kontras teks pada latar layar, kartu, dan kontrol untuk kedua mode. Padukan warna status dengan label atau ikon.
- Nilai `letterSpacing` adalah titik awal; sesuaikan setelah melihat hasil di perangkat.

## Penerapan pada alur Ronda Pak

- Formulir akun memakai satu kolom dengan lebar maksimal 480. Label selalu terlihat. Kesalahan format email atau kata sandi muncul di bawah kolom terkait dan diumumkan sebagai peringatan.
- Sediakan satu aksi utama pada formulir. Tindakan pemulihan dan kembali memakai tombol teks dengan area sentuh penuh. Gunakan umpan balik tekan langsung dan jaga ukuran kontrol tetap stabil saat menerima fokus.
- Navigasi ruang RT memasangkan ikon dengan label. Bagian aktif memakai garis tepi, latar lembut, dan status pilihan untuk pembaca layar. Biarkan pilihan berpindah baris saat ruang menyempit atau teks diperbesar.
- Kontrol input menggunakan permukaan terangkat dan garis yang lebih kontras dari pemisah kartu. Pertahankan palet Owl saat menyesuaikan tema perangkat.

### Beranda desa dan teras pos

Beranda memakai ilustrasi 2D desa malam dengan tekstur lukisan tangan bernuansa Ghibli, rimbun dedaunan tropis, dan atap terakota. Bulan krem, jalan, sawah, rumah warga, dan pos berlampu terbaca dalam komposisi lebar maupun potongan layar HP. Tautan **Masuk** dan **Daftarkan RT** mendekatkan kamera ke lentera pada gambar yang sama bersamaan dengan munculnya formulir selama 200 ms untuk Masuk dan 250 ms untuk Daftarkan RT. Saat kembali ke beranda, kamera mundur selama 200 ms dan fokus kembali ke tombol asal. Aktivasi melalui keyboard membuka kolom email langsung. Uap teh tampak saat kamera berada di teras. Di HP, komposisi awal memperlihatkan jalan dan lingkungan desa, lalu panel formulir muncul di bawah pos. Tautan langsung ke formulir dan undangan memakai posisi akhir kamera.

Lapisan padi, daun pisang, dan pelepah kelapa bergerak dengan jeda pendek mengikuti satu embusan. Bintang berpendar perlahan, sedangkan bulan dan panel tetap stabil. **Jeda** atau preferensi kurangi gerakan membuka formulir langsung. Saat layar kehilangan fokus atau aplikasi masuk ke latar belakang, animasi suasana berhenti.
