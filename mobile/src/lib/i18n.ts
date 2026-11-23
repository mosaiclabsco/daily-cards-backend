import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from '@/locales/pt-BR.json';

// Lançamento só em pt-BR; novos idiomas entram como novos arquivos em src/locales.
export const resources = {
  'pt-BR': { translation: ptBR },
} as const;

const supported = Object.keys(resources);
const device = getLocales()[0]?.languageTag ?? 'pt-BR';

// eslint-disable-next-line import/no-named-as-default-member -- API documentada do i18next
void i18n.use(initReactI18next).init({
  resources,
  lng: supported.includes(device) ? device : 'pt-BR',
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
});

export default i18n;
