import { Fonts, type Palette } from '@/constants/theme';

// Cabeçalho padrão das pilhas: sem sombra, fundo da tela e fonte do app.
export function stackScreenOptions(theme: Palette) {
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: theme.background },
    headerTintColor: theme.text,
    headerTitleStyle: { fontFamily: Fonts.semibold },
    contentStyle: { backgroundColor: theme.background },
  };
}
