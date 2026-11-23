import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { AreaSwitcher } from '@/components/area-switcher';
import { CardRow, type QuestionStatus } from '@/components/card-row';
import { AppText, Button, Chip, Field, Loading, Notice, Screen } from '@/components/ui';
import { Spacing, TabTopInset, useTheme } from '@/constants/theme';
import { useSelectedArea } from '@/hooks/use-selected-area';
import { PAST_WINDOW, usePastCards } from '@/hooks/use-track';
import { useAnswers } from '@/lib/answers';
import type { Card, CardType } from '@/lib/types';
import { useSession } from '@/providers/session';

const TYPES: CardType[] = ['term', 'tip', 'question', 'trend'];

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function statusOf(card: Card, answers: Record<string, number>): QuestionStatus {
  const chosen = answers[card.card_id];
  if (chosen === undefined || !card.question) return 'open';
  return chosen === card.question.answer ? 'right' : 'wrong';
}

// Explorar: o que já saiu na profissão, separado por tipo. Termos viram glossário A–Z com busca;
// perguntas mostram se a pessoa acertou. O limite do grátis vem do banco.
export default function Explore() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { premium } = useSession();
  const [type, setType] = useState<CardType>('term');
  const [query, setQuery] = useState('');
  const [days, setDays] = useState(PAST_WINDOW);
  const { areaId, accessible, select } = useSelectedArea();
  const past = usePastCards(areaId, days);
  const answers = useAnswers();

  const counts = useMemo(() => {
    const map = { term: 0, tip: 0, question: 0, trend: 0 } as Record<CardType, number>;
    for (const c of past.cards) map[c.type] += 1;
    return map;
  }, [past.cards]);

  const list = useMemo(() => {
    const ofType = past.cards.filter((c) => c.type === type);
    if (type !== 'term') return ofType;
    const q = fold(query.trim());
    return ofType
      .filter((c) => !q || fold(`${c.widget_text} ${c.body ?? ''}`).includes(q))
      .sort((a, b) => a.widget_text.localeCompare(b.widget_text, i18n.language, { sensitivity: 'base' }));
  }, [past.cards, type, query, i18n.language]);

  const score = useMemo(() => {
    const questions = past.cards.filter((c) => c.type === 'question');
    const statuses = questions.map((c) => statusOf(c, answers));
    return {
      answered: statuses.filter((s) => s !== 'open').length,
      right: statuses.filter((s) => s === 'right').length,
    };
  }, [past.cards, answers]);

  return (
    <Screen
      edges={['top']}
      contentStyle={{ paddingTop: TabTopInset + Spacing.lg }}
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={past.loading && past.cards.length > 0}
            onRefresh={() => void past.reload()}
            tintColor={theme.primary}
          />
        ),
      }}>
      <AppText variant="title">{t('tabs.explore')}</AppText>
      <AreaSwitcher areaId={areaId} accessible={accessible} onSelect={select} />
      <View style={styles.types}>
        {TYPES.map((k) => (
          <Chip
            key={k}
            title={counts[k] ? `${t(`explore.types.${k}`)} · ${counts[k]}` : t(`explore.types.${k}`)}
            selected={type === k}
            onPress={() => setType(k)}
          />
        ))}
      </View>

      {type === 'term' && counts.term > 0 ? (
        <Field
          label={t('explore.searchLabel')}
          placeholder={t('explore.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      ) : null}
      {type === 'question' && score.answered > 0 ? (
        <AppText muted>{t('explore.score', { right: score.right, answered: score.answered })}</AppText>
      ) : null}

      {past.loading && past.cards.length === 0 ? (
        <Loading />
      ) : past.error && past.cards.length === 0 ? (
        <>
          <Notice tone="error" text={t(`errors.${past.error.code}`)} />
          <Button title={t('common.retry')} variant="secondary" onPress={() => void past.reload()} />
        </>
      ) : list.length === 0 ? (
        <Notice text={query ? t('explore.noMatch') : t(`explore.empty.${type}`)} />
      ) : (
        list.map((card) => (
          <CardRow
            key={`${card.card_id}-${card.day ?? ''}`}
            card={card}
            hideType
            showDate={type !== 'term'}
            status={type === 'question' ? statusOf(card, answers) : undefined}
          />
        ))
      )}

      {premium && past.hasMore ? (
        <Button
          title={t('explore.older')}
          variant="secondary"
          loading={past.loading}
          onPress={() => setDays((d) => d + PAST_WINDOW)}
        />
      ) : null}
      {premium ? null : (
        <View style={styles.free}>
          <AppText variant="caption" muted>
            {t('explore.freeLimit')}
          </AppText>
          <Button title={t('explore.unlock')} variant="secondary" onPress={() => router.push('/premium')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  free: { gap: Spacing.sm, marginTop: Spacing.md },
});
