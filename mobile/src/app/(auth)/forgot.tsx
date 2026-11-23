import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Field, Notice, Screen } from '@/components/ui';
import { AuthError, sendPasswordReset } from '@/lib/auth';
import { isEmail } from '@/lib/validation';

export default function Forgot() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!isEmail(email)) return setError(t('auth.errors.invalid_email'));
    setSending(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(t(`auth.errors.${e instanceof AuthError ? e.code : 'unknown'}`));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <AppText variant="title">{t('auth.forgotTitle')}</AppText>
      {sent ? (
        <Notice tone="success" text={t('auth.forgotSent')} />
      ) : (
        <>
          <AppText muted>{t('auth.forgotSubtitle')}</AppText>
          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {error ? <Notice tone="error" text={error} /> : null}
          <Button title={t('auth.forgotSend')} loading={sending} onPress={() => void submit()} />
        </>
      )}
    </Screen>
  );
}
