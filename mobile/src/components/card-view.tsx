import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, Button } from '@/components/ui';
import { Fonts, Radius, Spacing, useTheme } from '@/constants/theme';
import { addDays, formatDayMonth, localToday } from '@/lib/dates';
import { setAnswer, useAnswers } from '@/lib/answers';
import type { Card } from '@/lib/types';

// Conteúdo do dia (direção B quente): barra com o tipo e a data, texto curto, explicação ou
// pergunta, e a fonte separada na base.

export function TypeTag({ type }: { type: Card['type'] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const color = theme.types[type];
  return (
    <View style={styles.tag}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="label" style={{ color }}>
        {t(`card.types.${type}`)}
      </AppText>
    </View>
  );
}

export function CardView({ card, meta }: { card: Card; meta?: string | null }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isQuestion = card.type === 'question' && card.question;
  // Novidade com mais de 4 semanas ganha aviso (documento do MVP).
  const stale = card.type === 'trend' && card.fact_date && card.fact_date < addDays(localToday(), -28);
  const rightMeta =
    meta ?? (card.fact_date ? formatDayMonth(card.fact_date, i18n.language) : null);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <TypeTag type={card.type} />
        {rightMeta ? (
          <AppText variant="mono" muted>
            {rightMeta.toUpperCase()}
          </AppText>
        ) : null}
      </View>

      <View style={styles.inner}>
        <AppText style={styles.headline}>{card.widget_text}</AppText>
        {isQuestion ? (
          <QuestionBlock card={card} />
        ) : card.body ? (
          <AppText style={{ color: theme.textSecondary }}>{card.body}</AppText>
        ) : null}
        {card.community_updated ? (
          <AppText variant="caption" style={{ color: theme.success }}>
            {t('card.communityUpdated')}
          </AppText>
        ) : null}
        {stale ? (
          <AppText variant="caption" style={{ color: theme.types.trend }}>
            {t('card.outdated')}
          </AppText>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => void WebBrowser.openBrowserAsync(card.source_url)}
        style={({ pressed }) => [styles.source, { borderTopColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
        <Icon name="link" size={16} color={theme.primary} />
        <AppText variant="caption" numberOfLines={1} style={{ color: theme.primary, fontFamily: Fonts.medium, flex: 1 }}>
          {t('card.source', { label: card.source_label })}
        </AppText>
      </Pressable>
    </View>
  );
}

function QuestionBlock({ card }: { card: Card }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const answers = useAnswers();
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = picked ?? answers[card.card_id] ?? null;
  const question = card.question!;
  const answered = chosen !== null;
  const letters = 'ABCDEFGH';

  return (
    <View style={styles.question}>
      {question.options.map((option, index) => {
        const isAnswer = index === question.answer;
        const isChosen = index === chosen;
        const state = !answered ? 'idle' : isAnswer ? 'right' : isChosen ? 'wrong' : 'idle';
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ disabled: answered, selected: isChosen }}
            disabled={answered}
            onPress={() => {
              setPicked(index);
              setAnswer(card.card_id, index);
            }}
            style={[
              styles.option,
              {
                borderColor: state === 'right' ? theme.success : state === 'wrong' ? theme.danger : theme.border,
                backgroundColor:
                  state === 'right' ? theme.successSoft : state === 'wrong' ? theme.dangerSoft : theme.surface,
              },
            ]}>
            <AppText variant="mono" muted style={styles.letter}>
              {letters[index]}
            </AppText>
            <AppText style={{ flex: 1 }}>{option}</AppText>
            {state === 'right' ? <Icon name="check" size={18} color={theme.success} /> : null}
          </Pressable>
        );
      })}

      {answered ? (
        <View style={styles.answer}>
          <AppText
            style={{
              fontFamily: Fonts.semibold,
              color: chosen === question.answer ? theme.success : theme.danger,
            }}>
            {chosen === question.answer
              ? t('card.correct')
              : t('card.wrong', { answer: question.options[question.answer] })}
          </AppText>
          {card.locked ? (
            <View style={[styles.locked, { backgroundColor: theme.primarySoft }]}>
              <View style={styles.lockedHead}>
                <Icon name="premium" size={18} color={theme.primary} />
                <AppText style={{ fontFamily: Fonts.semibold, flex: 1 }}>{t('card.lockedTitle')}</AppText>
              </View>
              <AppText variant="caption" muted>
                {t('card.lockedBody')}
              </AppText>
              <Button title={t('card.seePremium')} variant="secondary" onPress={() => router.push('/premium')} />
            </View>
          ) : card.body ? (
            <AppText style={{ color: theme.textSecondary }}>{card.body}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inner: { padding: Spacing.lg, gap: Spacing.md },
  headline: { fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 27, letterSpacing: -0.3 },
  question: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  letter: { width: 14 },
  answer: { gap: Spacing.sm, marginTop: Spacing.xs },
  locked: { borderRadius: Radius.sm, padding: Spacing.md, gap: Spacing.sm },
  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
});
