import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText, Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAreas } from '@/hooks/use-areas';

/** Nome da profissão para um id, a partir do catálogo. */
export function useAreaName() {
  const { t } = useTranslation();
  const { areas } = useAreas();
  return (areaId: string | null) => {
    const area = areas?.find((a) => a.id === areaId);
    return area ? t(area.name_key) : '';
  };
}

// Mostra a profissão aberta; com mais de uma acessível (premium), vira seletor.
export function AreaSwitcher({
  areaId,
  accessible,
  onSelect,
}: {
  areaId: string | null;
  accessible: string[];
  onSelect: (id: string) => void;
}) {
  const name = useAreaName();
  if (accessible.length <= 1) {
    return (
      <AppText variant="label" muted>
        {name(areaId)}
      </AppText>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {accessible.map((id) => (
        <Chip key={id} title={name(id)} selected={id === areaId} onPress={() => onSelect(id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm },
});
