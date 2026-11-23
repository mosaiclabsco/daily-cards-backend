import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { AppText, Button, Screen } from '@/components/ui';
import { Fonts, Radius, Spacing, useTheme } from '@/constants/theme';
import { useSession } from '@/providers/session';

const VALUES: { icon: IconName; key: string }[] = [
  { icon: 'quick', key: 'onboarding.welcome.quick' },
  { icon: 'sourced', key: 'onboarding.welcome.sourced' },
  { icon: 'widget', key: 'onboarding.welcome.widget' },
];

// Boas-vindas: o que a pessoa ganha, com uma amostra de como o conteúdo aparece.
export default function Welcome() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { session, signOut } = useSession();

  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <>
          <Button title={t('onboarding.welcome.start')} onPress={() => router.push('/area')} />
          {session ? (
            <Button title={t('settings.signOut')} variant="ghost" onPress={() => void signOut()} />
          ) : (
            <Button title={t('onboarding.haveAccount')} variant="ghost" onPress={() => router.push('/sign-in')} />
          )}
        </>
      }>
      <View style={[styles.preview, { backgroundColor: theme.text }]}>
        <View style={styles.previewHead}>
          <View style={[styles.dot, { backgroundColor: theme.types.term }]} />
          <AppText variant="mono" style={{ color: theme.textMuted }}>
            {t('card.types.term').toUpperCase()} · {t('onboarding.welcome.exampleArea').toUpperCase()}
          </AppText>
        </View>
        <AppText style={[styles.previewText, { color: theme.background }]}>
          {t('onboarding.welcome.exampleText')}
        </AppText>
        <AppText variant="caption" style={{ color: theme.textMuted }}>
          {t('onboarding.welcome.exampleSource')}
        </AppText>
      </View>

      <View style={styles.copy}>
        <AppText variant="display">{t('onboarding.welcome.title')}</AppText>
        <AppText muted style={{ fontSize: 17 }}>
          {t('onboarding.welcome.subtitle')}
        </AppText>
      </View>

      <View style={styles.values}>
        {VALUES.map((v) => (
          <View key={v.key} style={styles.value}>
            <View style={[styles.valueIcon, { backgroundColor: theme.surfaceAlt }]}>
              <Icon name={v.icon} size={20} color={theme.primary} />
            </View>
            <AppText style={{ fontFamily: Fonts.medium }}>{t(v.key)}</AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: Spacing.xl },
  preview: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, transform: [{ rotate: '-1.5deg' }] },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  previewText: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 24 },
  copy: { gap: Spacing.sm },
  values: { gap: Spacing.md },
  value: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valueIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
