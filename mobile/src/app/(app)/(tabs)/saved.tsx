import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { CardRow } from '@/components/card-row';
import { AppText, Button, Chip, Loading, Notice, Screen } from '@/components/ui';
import { Spacing, TabTopInset, useTheme } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-track';
import type { CardType } from '@/lib/types';

const TYPES: CardType[] = ['term', 'tip', 'question', 'trend'];

// Salvos: o que a pessoa marcou, de todas as profissões, com filtro por tipo.
export default function Saved() {
  const theme = useTheme();
  const { t } = useTranslation();
  const favorites = useFavorites();
  const [type, setType] = useState<CardType | null>(null);

  // Recarrega ao voltar para a aba (ex.: depois de salvar algo em Hoje).
  const reload = favorites.reload;
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  const present = useMemo(() => TYPES.filter((k) => favorites.cards.some((c) => c.type === k)), [favorites.cards]);
  const list = type ? favorites.cards.filter((c) => c.type === type) : favorites.cards;

  return (
    <Screen
      edges={['top']}
      contentStyle={{ paddingTop: TabTopInset + Spacing.lg }}
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={favorites.loading && favorites.cards.length > 0}
            onRefresh={() => void reload()}
            tintColor={theme.primary}
          />
        ),
      }}>
      <AppText variant="title">{t('tabs.saved')}</AppText>
      {present.length > 1 ? (
        <View style={styles.types}>
          <Chip title={t('saved.all')} selected={type === null} onPress={() => setType(null)} />
          {present.map((k) => (
            <Chip key={k} title={t(`explore.types.${k}`)} selected={type === k} onPress={() => setType(k)} />
          ))}
        </View>
      ) : null}

      {favorites.loading && favorites.cards.length === 0 ? (
        <Loading />
      ) : favorites.error && favorites.cards.length === 0 ? (
        <>
          <Notice tone="error" text={t(`errors.${favorites.error.code}`)} />
          <Button title={t('common.retry')} variant="secondary" onPress={() => void reload()} />
        </>
      ) : list.length === 0 ? (
        <Notice icon="save" text={t('saved.empty')} />
      ) : (
        list.map((card) => <CardRow key={card.card_id} card={card} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
