import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Field, Loading, Notice, Screen } from '@/components/ui';
import { AuthError, updatePassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { MIN_PASSWORD } from '@/lib/validation';

// Link de "Esqueci minha senha" (dailycards://auth/reset?code=...): entra com o código e pede a senha nova.
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (code) await supabase.auth.exchangeCodeForSession(code);
      const { data } = await supabase.auth.getSession();
      if (active) setStatus(data.session ? 'ready' : 'failed');
    })();
    return () => {
      active = false;
    };
  }, [code]);

  async function save() {
    if (password.length < MIN_PASSWORD) return setError(t('auth.errors.short_password'));
    setSaving(true);
    setError(null);
    try {
      await updatePassword(password);
      router.replace('/');
    } catch (e) {
      setError(t(`auth.errors.${e instanceof AuthError ? e.code : 'unknown'}`));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <Loading />;

  if (status === 'failed') {
    return (
      <Screen contentStyle={{ justifyContent: 'center' }}>
        <AppText variant="subtitle">{t('auth.callbackFailed')}</AppText>
        <Button title={t('auth.forgot')} onPress={() => router.replace('/forgot')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title">{t('auth.resetTitle')}</AppText>
      <Field
        label={t('auth.newPassword')}
        placeholder={t('auth.passwordHint')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button title={t('common.save')} loading={saving} onPress={() => void save()} />
    </Screen>
  );
}
