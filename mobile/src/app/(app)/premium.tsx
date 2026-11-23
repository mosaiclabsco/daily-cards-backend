import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, Button, Notice, Screen } from '@/components/ui';
import { Spacing, useTheme } from '@/constants/theme';

const BENEFITS = ['widget', 'explanation', 'archive', 'professions'] as const;

// Oferta do premium. A compra entra com o RevenueCat (Purchases.logIn com o id do Supabase);
// o plano só muda pelo webhook no banco.
export default function Premium() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen edges={['bottom']}>
      <Icon name="premium" size={32} color={theme.primary} />
      <AppText variant="title">{t('premium.title')}</AppText>
      <AppText muted>{t('premium.subtitle')}</AppText>
      <View style={styles.list}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.item}>
            <Icon name="check" size={20} color={theme.success} />
            <AppText style={styles.itemText}>{t(`premium.benefits.${b}`)}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="label">{t('premium.trial')}</AppText>
      <Notice text={t('premium.comingSoon')} />
      <Button title={t('premium.close')} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm, marginVertical: Spacing.md },
  item: { flexDirection: 'row', gap: Spacing.sm },
  itemText: { flex: 1 },
});
