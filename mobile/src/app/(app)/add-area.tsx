import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProfessionList } from '@/components/area-pickers';
import { Loading, Notice, Screen } from '@/components/ui';
import { ApiError, followArea } from '@/lib/api';
import { useSession } from '@/providers/session';

// Seguir outra profissão. O banco recusa a segunda sem premium (premium_required).
export default function AddArea() {
  const router = useRouter();
  const { t } = useTranslation();
  const { followed, refresh } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function follow(areaId: string) {
    setSaving(true);
    setError(null);
    try {
      await followArea(areaId);
      await refresh();
      router.back();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'unknown';
      if (code === 'premium_required') {
        router.replace('/premium');
        return;
      }
      setError(t(`errors.${code}`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      {error ? <Notice tone="error" text={error} /> : null}
      {saving ? (
        <Loading />
      ) : (
        <ProfessionList
          disabledIds={followed.map((f) => f.area_id)}
          onSelect={(area) => void follow(area.id)}
        />
      )}
    </Screen>
  );
}
