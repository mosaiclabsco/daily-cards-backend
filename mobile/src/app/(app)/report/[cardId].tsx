import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Field, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ApiError, reportCard } from '@/lib/api';
import { cardStore } from '@/lib/card-store';
import { REPORT_CATEGORIES, type ReportCategory } from '@/lib/types';
import { isSafeSource } from '@/lib/validation';

// Sugestão de correção: categoria obrigatória, texto e fonte opcionais.
export default function ReportCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const card = cardId ? cardStore.get(cardId) : undefined;
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!cardId || !category) return;
    if (!isSafeSource(source)) {
      setError(t('errors.invalid_source'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await reportCard(cardId, category, text, source);
      Alert.alert(t('report.sent'));
      router.back();
    } catch (e) {
      setError(t(`errors.${e instanceof ApiError ? e.code : 'unknown'}`));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      {card ? <AppText variant="subtitle">{card.widget_text}</AppText> : null}
      <AppText muted>{t('report.subtitle')}</AppText>
      <AppText variant="label" muted>
        {t('report.category')}
      </AppText>
      <View style={styles.categories}>
        {REPORT_CATEGORIES.map((c) => (
          <Chip
            key={c}
            title={t(`report.categories.${c}`)}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>
      <Field
        label={t('report.text')}
        placeholder={t('report.textPlaceholder')}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
        style={styles.multiline}
      />
      <Field
        label={t('report.source')}
        placeholder={t('report.sourcePlaceholder')}
        value={source}
        onChangeText={setSource}
        autoCapitalize="none"
        maxLength={500}
      />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button title={t('common.send')} loading={sending} disabled={!category} onPress={() => void submit()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  multiline: { minHeight: 110, paddingTop: Spacing.md, textAlignVertical: 'top' },
});
