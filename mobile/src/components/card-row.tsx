import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { TypeTag } from '@/components/card-view';
import { Icon } from '@/components/icon';
import { AppText } from '@/components/ui';
import { Fonts, Radius, Spacing, useTheme } from '@/constants/theme';
import { formatDayMonth } from '@/lib/dates';
import type { Card } from '@/lib/types';

export type QuestionStatus = 'right' | 'wrong' | 'open';

// Item de lista (Explorar e Salvos): o texto curto, com tipo, data e, nas perguntas, se a
// pessoa acertou. Abre o conteúdo completo.
export function CardRow({
  card,
  hideType,
  showDate = true,
  status,
}: {
  card: Card;
  hideType?: boolean;
  showDate?: boolean;
  status?: QuestionStatus;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const date = showDate && card.day ? formatDayMonth(card.day, i18n.language).toUpperCase() : null;
  const statusColor = status === 'right' ? theme.success : status === 'wrong' ? theme.danger : theme.textMuted;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.card_id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.main}>
        {!hideType || date || status ? (
          <View style={styles.header}>
            {hideType ? (
              status ? (
                <AppText variant="caption" style={{ color: statusColor, fontFamily: Fonts.semibold }}>
                  {t(`explore.status.${status}`)}
                </AppText>
              ) : (
                <View />
              )
            ) : (
              <TypeTag type={card.type} />
            )}
            {date ? (
              <AppText variant="mono" muted>
                {date}
              </AppText>
            ) : null}
          </View>
        ) : null}
        <AppText style={{ fontFamily: Fonts.medium }} numberOfLines={3}>
          {card.widget_text}
        </AppText>
      </View>
      <Icon name={card.favorited ? 'saved' : 'next'} size={18} color={card.favorited ? theme.primary : theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  main: { flex: 1, gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
