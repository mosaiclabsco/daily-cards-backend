import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Loading, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

// Retorno do login com Google/Apple e do link de confirmação de e-mail (dailycards://auth/callback?code=...).
export default function AuthCallback() {
  const router = useRouter();
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // O navegador do login pode já ter trocado o mesmo código.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            if (active) setFailed(true);
            return;
          }
        }
      }
      if (active) router.replace('/');
    })();
    return () => {
      active = false;
    };
  }, [code, router]);

  if (!failed) return <Loading label={t('auth.callbackLoading')} />;

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <AppText variant="subtitle">{t('auth.callbackFailed')}</AppText>
      <Button title={t('auth.signIn')} onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
