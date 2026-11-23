import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SocialSignIn } from '@/components/social-sign-in';
import { AppText, Button, Field, Notice, Screen } from '@/components/ui';
import { AuthError, signUpWithEmail } from '@/lib/auth';
import { isEmail, MIN_PASSWORD } from '@/lib/validation';

export default function SignUp() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    if (!isEmail(email)) return setError(t('auth.errors.invalid_email'));
    if (password.length < MIN_PASSWORD) return setError(t('auth.errors.short_password'));
    setSending(true);
    setError(null);
    try {
      const signedIn = await signUpWithEmail(email, password);
      // Com sessão, o SessionProvider segue a profissão escolhida e as guardas levam às abas.
      if (!signedIn) setSentTo(email.trim());
    } catch (e) {
      setError(t(`auth.errors.${e instanceof AuthError ? e.code : 'unknown'}`));
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <Screen edges={['bottom']}>
        <AppText variant="title">{t('auth.checkEmailTitle')}</AppText>
        <AppText>{t('auth.checkEmail', { email: sentTo })}</AppText>
        <Button title={t('auth.toSignIn')} variant="secondary" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <AppText variant="title">{t('auth.signUpTitle')}</AppText>
      <AppText muted>{t('auth.signUpSubtitle')}</AppText>
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
        placeholder={t('auth.passwordHint')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button title={t('auth.signUp')} loading={sending} onPress={() => void submit()} />
      <Button title={t('auth.toSignIn')} variant="ghost" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
