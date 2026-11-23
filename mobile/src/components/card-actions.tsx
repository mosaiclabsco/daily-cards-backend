import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { AppText } from '@/components/ui';
import { Fonts, Radius, Spacing, useTheme } from '@/constants/theme';
import { ApiError, rateCard, toggleFavorite } from '@/lib/api';
import { cardStore } from '@/lib/card-store';
import type { Card } from '@/lib/types';

// Abaixo do conteúdo: nota de 1 a 5 e as ações salvar, corrigir e enviar.
// Nota e salvar são otimistas e voltam atrás se o banco recusar.

function showError(t: (key: string) => string, e: unknown) {
  const code = e instanceof ApiError ? e.code : 'unknown';
  Alert.alert(t(`errors.${code}`));
}

export function CardActions({ card }: { card: Card }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function rate(score: number) {
    const previous = card.my_rating;
    cardStore.patch(card.card_id, { my_rating: score });
    try {
      await rateCard(card.card_id, score);
    } catch (e) {
      cardStore.patch(card.card_id, { my_rating: previous });
      showError(t, e);
    }
  }

  async function favorite() {
    if (busy) return;
    setBusy(true);
    const previous = card.favorited;
    cardStore.patch(card.card_id, { favorited: !previous });
    try {
      const now = await toggleFavorite(card.card_id);
      cardStore.patch(card.card_id, { favorited: now });
    } catch (e) {
      cardStore.patch(card.card_id, { favorited: previous });
      showError(t, e);
    } finally {
      setBusy(false);
    }
  }

  function share() {
    void Share.share({
      message: `${card.widget_text}\n\n${t('card.source', { label: card.source_label })} · ${card.source_url}\n${t('card.shareFooter')}`,
    });
  }

  return (
    <View style={styles.container}>
      <View style={[styles.rating, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <AppText variant="caption" muted style={{ fontFamily: Fonts.medium }}>
          {card.my_rating ? t('card.rated') : t('card.rate')}
        </AppText>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((score) => (
            <Pressable
              key={score}
              accessibilityRole="button"
              accessibilityLabel={`${score}/5`}
              accessibilityState={{ selected: card.my_rating === score }}
              onPress={() => void rate(score)}
              hitSlop={4}>
              <AppText
                style={[
                  styles.star,
                  { color: card.my_rating && score <= card.my_rating ? theme.star : theme.borderStrong },
                ]}>
                ★
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.actions, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Action
          icon={card.favorited ? 'saved' : 'save'}
          label={card.favorited ? t('card.favorited') : t('card.favorite')}
          active={card.favorited}
          onPress={() => void favorite()}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Action
          icon="flag"
          label={t('card.suggestFix')}
          onPress={() => router.push({ pathname: '/report/[cardId]', params: { cardId: card.card_id } })}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Action icon="share" label={t('card.share')} onPress={share} />
      </View>
    </View>
  );
}

function Action({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = active ? theme.primary : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={20} color={color} />
      <AppText variant="caption" style={{ color, fontFamily: Fonts.medium }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 26, lineHeight: 32 },
  actions: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: Spacing.md, minHeight: 56 },
  divider: { width: 1 },
});
