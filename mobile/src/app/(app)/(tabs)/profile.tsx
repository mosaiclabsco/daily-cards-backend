import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { useAreaName } from '@/components/area-switcher';
import { AppText, Button, OptionRow, Screen } from '@/components/ui';
import { Spacing, TabTopInset } from '@/constants/theme';
import { ApiError, deleteAccount, getSubscription, unfollowArea } from '@/lib/api';
import { formatShortDate } from '@/lib/dates';
import type { Subscription } from '@/lib/types';
import { useSession } from '@/providers/session';

// Páginas públicas do backend (Next.js). Ficam ocultas enquanto EXPO_PUBLIC_SITE_URL não existir.
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '');
const PAGES = [
  { key: 'settings.howWeReview', path: '/como-revisamos' },
  { key: 'settings.terms', path: '/termos' },
  { key: 'settings.privacy', path: '/privacidade' },
] as const;

export default function Profile() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { followed, premium, refresh, signOut } = useSession();
  const areaName = useAreaName();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getSubscription().then(setSubscription, () => undefined);
  }, [premium]);

  function confirmUnfollow(areaId: string) {
    Alert.alert(t('settings.removeProfession'), t('settings.removeConfirm', { name: areaName(areaId) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.removeProfession'),
        style: 'destructive',
        onPress: () => {
          unfollowArea(areaId).then(refresh, (e) =>
            Alert.alert(t(`errors.${e instanceof ApiError ? e.code : 'unknown'}`)),
          );
        },
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAction'),
        style: 'destructive',
        onPress: () => {
          setDeleting(true);
          deleteAccount()
            .then(async () => {
              await signOut();
              Alert.alert(t('settings.deleted'));
            })
            .catch((e) => Alert.alert(t(`errors.${e instanceof ApiError ? e.code : 'unknown'}`)))
            .finally(() => setDeleting(false));
        },
      },
    ]);
  }

  const planLabel = premium
    ? subscription?.expires_at
      ? t('settings.premiumUntil', { date: formatShortDate(subscription.expires_at.slice(0, 10), i18n.language) })
      : t('settings.premium')
    : t('settings.free');

  return (
    <Screen edges={['top']}
      contentStyle={{ paddingTop: TabTopInset + Spacing.lg }}>
      <AppText variant="title">{t('tabs.profile')}</AppText>

      <Section title={t('settings.professions')}>
        {followed.map((f, index) => (
          <OptionRow
            key={f.area_id}
            title={areaName(f.area_id)}
            subtitle={index === 0 && followed.length > 1 ? t('settings.primary') : null}
            onPress={followed.length > 1 ? () => confirmUnfollow(f.area_id) : undefined}
          />
        ))}
        <Button title={t('settings.addProfession')} icon="add" variant="secondary" onPress={() => router.push('/add-area')} />
      </Section>

      <Section title={t('settings.plan')}>
        <OptionRow title={planLabel} icon={premium ? 'premium' : undefined} />
        {premium ? null : (
          <Button title={t('settings.seePremium')} icon="premium" variant="secondary" onPress={() => router.push('/premium')} />
        )}
      </Section>

      {SITE_URL ? (
        <Section title={t('settings.about')}>
          {PAGES.map((page) => (
            <OptionRow
              key={page.path}
              title={t(page.key)}
              onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}${page.path}`)}
            />
          ))}
        </Section>
      ) : null}

      <Section title={t('settings.account')}>
        <Button title={t('settings.signOut')} variant="secondary" onPress={() => void signOut()} />
        <Button
          title={t('settings.deleteAccount')}
          variant="danger"
          loading={deleting}
          onPress={confirmDelete}
        />
      </Section>

      <AppText variant="caption" muted style={styles.version}>
        {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
      </AppText>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" muted>
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm, marginTop: Spacing.md },
  version: { textAlign: 'center', marginTop: Spacing.lg },
});
