// Datas de calendário no formato YYYY-MM-DD, no fuso do aparelho.
// O banco calcula o "hoje" pelo fuso salvo no perfil (o mesmo do aparelho, via save_profile).

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localToday() {
  return toIsoDate(new Date());
}

export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return toIsoDate(date);
}

/** Converte YYYY-MM-DD em Date local ao meio-dia (evita pular de dia por fuso). */
export function parseIsoDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function formatDay(isoDate: string, locale: string) {
  return parseIsoDate(isoDate).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatShortDate(isoDate: string, locale: string) {
  return parseIsoDate(isoDate).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Dia e mês curtos para rótulos em mono (ex.: "22 nov"). */
export function formatDayMonth(isoDate: string, locale: string) {
  const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).formatToParts(parseIsoDate(isoDate));
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', '');
  return `${day} ${month}`;
}
