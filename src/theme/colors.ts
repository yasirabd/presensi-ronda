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
    bg: '#FCF7E5',
    surface: '#F3EDD8',
    surfaceRaised: '#FFFDF5',
    border: '#E5DEC6',

    text: '#1B2A18',
    textSecondary: '#5E6B55',
    textTertiary: '#8A9382',

    accent: '#35511C',
    onAccent: '#FDF7E5',
    accentSoft: 'rgba(53,81,28,0.10)',

    highlight: '#E6B75D',
    onHighlight: '#1B2A18',
    highlightSoft: '#FDEDC9',

    success: '#3F7A35',
    successSoft: 'rgba(63,122,53,0.12)',
    danger: '#B4452F',
    dangerSoft: 'rgba(180,69,47,0.10)',
    warning: '#8F6209',
    warningSoft: 'rgba(230,183,93,0.28)',

    track: '#E9E2CB',
    overlay: 'rgba(27,42,24,0.36)',
    tabBar: 'rgba(252,247,229,0.92)',
  },
  dark: {
    bg: '#141A12',
    surface: '#1D251A',
    surfaceRaised: '#273022',
    border: '#35402F',

    text: '#F4F1E4',
    textSecondary: '#A9B3A0',
    textTertiary: '#727C6B',

    accent: '#9CCB8A',
    onAccent: '#10210D',
    accentSoft: 'rgba(156,203,138,0.16)',

    highlight: '#E6B75D',
    onHighlight: '#1B2A18',
    highlightSoft: 'rgba(230,183,93,0.18)',

    success: '#7FCF8E',
    successSoft: 'rgba(127,207,142,0.14)',
    danger: '#F08A72',
    dangerSoft: 'rgba(240,138,114,0.14)',
    warning: '#F0C75E',
    warningSoft: 'rgba(240,199,94,0.16)',

    track: '#2B3526',
    overlay: 'rgba(0,0,0,0.6)',
    tabBar: 'rgba(29,37,26,0.92)',
  },
} as const;

export type ColorName = keyof typeof palette.light;
export type Colors = Record<ColorName, string>;
