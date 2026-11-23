import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Field, Notice, Screen } from '@/components/ui';
import { ApiError, joinWaitlist } from '@/lib/api';
import { isEmail } from '@/lib/validation';

// "Minha profissão não está aqui": guarda o e-mail para avisar quando a profissão entrar.
export default function Waitlist() {
  const { t } = useTranslation();
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!isEmail(email)) {
      setError(t('auth.errors.invalid_email'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await joinWaitlist(email, profession);
      setDone(true);
    } catch (e) {
      setError(t(`errors.${e instanceof ApiError ? e.code : 'unknown'}`));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <AppText variant="title">{t('onboarding.waitlist.title')}</AppText>
      {done ? (
        <Notice tone="success" text={t('onboarding.waitlist.done')} />
      ) : (
        <>
          <Field
            label={t('onboarding.waitlist.profession')}
            value={profession}
            onChangeText={setProfession}
            maxLength={80}
          />
          <Field
            label={t('onboarding.waitlist.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {error ? <Notice tone="error" text={error} /> : null}
          <Button
            title={t('onboarding.waitlist.submit')}
            loading={sending}
            disabled={!profession.trim() || !email.trim()}
            onPress={() => void submit()}
          />
        </>
      )}
    </Screen>
  );
}
