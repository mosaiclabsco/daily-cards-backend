import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { Button, Notice } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { AuthError, signInWithProvider } from '@/lib/auth';

// Google em todas as plataformas; Apple só no iPhone (exigência da App Store quando há Google).
export function SocialSignIn() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(provider: 'google' | 'apple') {
    setBusy(provider);
    setError(null);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      const code = e instanceof AuthError ? e.code : 'unknown';
      if (code !== 'cancelled') setError(t(`auth.errors.${code}`));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      <Button
        title={t('auth.google')}
        variant="secondary"
        loading={busy === 'google'}
        disabled={busy !== null}
        onPress={() => void run('google')}
      />
      {Platform.OS === 'ios' ? (
        <Button
          title={t('auth.apple')}
          variant="secondary"
          loading={busy === 'apple'}
          disabled={busy !== null}
          onPress={() => void run('apple')}
        />
      ) : null}
      {error ? <Notice tone="error" text={error} /> : null}
    </View>
  );
}
