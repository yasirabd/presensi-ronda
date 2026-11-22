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
