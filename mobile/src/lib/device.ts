import { getCalendars, getLocales } from 'expo-localization';

import { resources } from '@/lib/i18n';

// Idioma, país e fuso do aparelho, enviados ao perfil com save_profile.
// O conteúdo só existe em pt-BR no lançamento, então idiomas sem tradução caem em pt-BR.

const SUPPORTED = Object.keys(resources);

export function deviceLocale() {
  const tag = getLocales()[0]?.languageTag ?? 'pt-BR';
  return SUPPORTED.includes(tag) ? tag : 'pt-BR';
}

export function deviceCountry() {
  const region = getLocales()[0]?.regionCode;
  return region && /^[A-Z]{2}$/.test(region) ? region : 'BR';
}

export function deviceTimezone() {
  return getCalendars()[0]?.timeZone ?? 'America/Sao_Paulo';
}
