import { Platform, useColorScheme } from 'react-native';

// Direção visual B quente: neutro off-white, uma cor de ação, cor fixa por tipo de conteúdo,
// IBM Plex Sans no texto e Plex Mono só em números e datas.

export const Colors = {
  light: {
    text: '#16181B',
    textSecondary: '#5E6168',
    textMuted: '#8A8D93',
    background: '#F6F5F2',
    surface: '#FFFFFF',
    surfaceAlt: '#EEECE7',
    border: '#E4E1DA',
    borderStrong: '#CFCBC2',
    primary: '#2F4FD8',
    primarySoft: '#E8ECFB',
    onPrimary: '#FFFFFF',
    success: '#108A68',
    successSoft: '#EAF6F1',
    danger: '#C23B3B',
    dangerSoft: '#FBECEC',
    star: '#D9A21B',
    types: {
      term: '#2F4FD8',
      tip: '#108A68',
      question: '#8A48C9',
      trend: '#D9661F',
    },
  },
  dark: {
    text: '#F1F2F4',
    textSecondary: '#A6AAB2',
    textMuted: '#7B8089',
    background: '#121316',
    surface: '#1B1D21',
    surfaceAlt: '#24272C',
    border: '#2C2F35',
    borderStrong: '#3B3F46',
    primary: '#7F95FF',
    primarySoft: '#232A45',
    onPrimary: '#121316',
    success: '#4CC59B',
    successSoft: '#1A2E27',
    danger: '#F07C7C',
    dangerSoft: '#3A2022',
    star: '#F2C14E',
    types: {
      term: '#7F95FF',
      tip: '#4CC59B',
      question: '#B98AF0',
      trend: '#F29A5C',
    },
  },
} as const;

export type Palette = (typeof Colors)['light'] | (typeof Colors)['dark'];

export function useTheme(): Palette {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export const Fonts = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const MaxContentWidth = 560;

/** No web (só prévia e capturas de tela), as abas ficam no topo; o conteúdo das abas desce para não ficar coberto. */
export const TabTopInset = Platform.OS === 'web' ? 56 : 0;
