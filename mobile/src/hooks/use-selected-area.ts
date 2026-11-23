import { useCallback, useEffect, useMemo, useState } from 'react';

import { selectedAreaStore } from '@/lib/storage';
import { useSession } from '@/providers/session';

// Profissão aberta em Hoje e no Arquivo. Sem premium, só a primeira seguida fica acessível
// (o banco recusa as outras), então ela é sempre a escolhida.

export function useSelectedArea() {
  const { followed, premium } = useSession();
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    void selectedAreaStore.get().then(setStored);
  }, []);

  const accessible = useMemo(
    () => (premium ? followed : followed.slice(0, 1)).map((f) => f.area_id),
    [followed, premium],
  );
  const areaId = stored && accessible.includes(stored) ? stored : (accessible[0] ?? null);

  const select = useCallback((id: string) => {
    setStored(id);
    void selectedAreaStore.set(id);
  }, []);

  return { areaId, accessible, select };
}
