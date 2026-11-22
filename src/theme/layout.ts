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
