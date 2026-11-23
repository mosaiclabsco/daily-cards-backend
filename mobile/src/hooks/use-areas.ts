import { useLoader } from '@/hooks/use-loader';
import { listAreas } from '@/lib/api';
import type { Area } from '@/lib/types';

// Catálogo de profissões (leitura pública). Guardado em memória depois da primeira carga.

let cached: Area[] | null = null;

async function loadAreas() {
  if (cached) return cached;
  cached = await listAreas();
  return cached;
}

export function useAreas() {
  const { data, error, reload } = useLoader(loadAreas, 'areas', cached);
  return {
    areas: data,
    error: Boolean(error) && !data,
    reload: async () => {
      cached = null;
      await reload();
    },
  };
}

/** Profissões disponíveis no país, agrupadas na ordem do catálogo. */
export function groupAreas(areas: Area[]) {
  const groups: { key: string; areas: Area[] }[] = [];
  for (const area of areas) {
    if (!area.layer) continue;
    let group = groups.find((g) => g.key === area.group_key);
    if (!group) {
      group = { key: area.group_key, areas: [] };
      groups.push(group);
    }
    group.areas.push(area);
  }
  return groups;
}
