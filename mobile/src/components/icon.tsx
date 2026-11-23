import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { useTheme } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// Ícones do sistema: SF Symbols no iOS, Material Symbols no Android e no web.
// Cada ícone do app tem nome nas duas famílias.
export const ICONS = {
  technology: { ios: 'laptopcomputer', android: 'computer', web: 'computer' },
  business: { ios: 'briefcase', android: 'work', web: 'work' },
  design: { ios: 'paintpalette', android: 'palette', web: 'palette' },
  education: { ios: 'graduationcap', android: 'school', web: 'school' },
  health: { ios: 'cross.case', android: 'health_and_safety', web: 'health_and_safety' },
  law: { ios: 'building.columns', android: 'gavel', web: 'gavel' },
  architecture_engineering: { ios: 'building.2', android: 'architecture', web: 'architecture' },
  works: { ios: 'person.text.rectangle', android: 'badge', web: 'badge' },
  studies: { ios: 'book', android: 'local_library', web: 'local_library' },
  curious: { ios: 'lightbulb', android: 'lightbulb', web: 'lightbulb' },
  quick: { ios: 'bolt', android: 'bolt', web: 'bolt' },
  sourced: { ios: 'checkmark.seal', android: 'verified', web: 'verified' },
  widget: { ios: 'square.grid.2x2', android: 'widgets', web: 'widgets' },
  next: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  save: { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' },
  saved: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  flag: { ios: 'flag', android: 'flag', web: 'flag' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' },
  link: { ios: 'link', android: 'link', web: 'link' },
  offline: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  premium: { ios: 'sparkles', android: 'workspace_premium', web: 'workspace_premium' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
} as const satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return <SymbolView name={ICONS[name]} size={size} tintColor={color ?? theme.text} />;
}

/** Ícone da área profissional pelo `group_key` do banco; áreas novas caem num ícone neutro. */
export function areaIcon(groupKey: string): IconName {
  return groupKey in ICONS ? (groupKey as IconName) : 'business';
}
