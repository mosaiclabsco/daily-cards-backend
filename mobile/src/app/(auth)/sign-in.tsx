import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SocialSignIn } from '@/components/social-sign-in';
import { AppText, Button, Field, Notice, Screen } from '@/components/ui';
import { AuthError, signInWithEmail } from '@/lib/auth';
import { isEmail } from '@/lib/validation';

export default function SignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!isEmail(email)) return setError(t('auth.errors.invalid_email'));
    setSending(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (e) {
      setError(t(`auth.errors.${e instanceof AuthError ? e.code : 'unknown'}`));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <AppText variant="title">{t('auth.signInTitle')}</AppText>
      <SocialSignIn />
      <AppText muted style={{ textAlign: 'center' }}>
        {t('common.or')}
      </AppText>
      <Field
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Field
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button title={t('auth.signIn')} loading={sending} onPress={() => void submit()} />
      <Button title={t('auth.forgot')} variant="ghost" onPress={() => router.push('/forgot')} />
      <Button title={t('auth.toSignUp')} variant="ghost" onPress={() => router.replace('/sign-up')} />
    </Screen>
  );
}
