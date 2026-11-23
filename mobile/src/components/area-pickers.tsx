import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { areaIcon, Icon } from '@/components/icon';
import { AppText, Button, Loading, Notice, OptionRow, SectionLabel } from '@/components/ui';
import { Fonts, Radius, Spacing, useTheme } from '@/constants/theme';
import { groupAreas, useAreas } from '@/hooks/use-areas';
import type { Area } from '@/lib/types';

// Escolha de área (grade com ícones) e de profissão dentro da área.

function LoadState({ error, reload }: { error: boolean; reload: () => void }) {
  const { t } = useTranslation();
  if (!error) return <Loading />;
  return (
    <View style={{ gap: Spacing.md }}>
      <Notice tone="error" icon="offline" text={t('errors.network')} />
      <Button title={t('common.retry')} variant="secondary" onPress={reload} />
    </View>
  );
}

export function AreaGrid({ onSelect }: { onSelect: (groupKey: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { areas, error, reload } = useAreas();
  if (!areas) return <LoadState error={error} reload={() => void reload()} />;

  return (
    <View style={styles.grid}>
      {groupAreas(areas).map((group) => (
        <Pressable
          key={group.key}
          accessibilityRole="button"
          onPress={() => onSelect(group.key)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}>
          <View style={[styles.tileIcon, { backgroundColor: theme.primarySoft }]}>
            <Icon name={areaIcon(group.key)} size={24} color={theme.primary} />
          </View>
          <View style={{ gap: 2 }}>
            <AppText style={styles.tileTitle}>{t(`group.${group.key}`)}</AppText>
            <AppText variant="caption" muted>
              {t('onboarding.area.count', { count: group.areas.length })}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function ProfessionList({
  groupKey,
  selectedId,
  disabledIds = [],
  onSelect,
}: {
  /** Sem `groupKey`, lista todas as áreas com o nome de cada grupo. */
  groupKey?: string;
  selectedId?: string | null;
  disabledIds?: string[];
  onSelect: (area: Area) => void;
}) {
  const { t } = useTranslation();
  const { areas, error, reload } = useAreas();
  if (!areas) return <LoadState error={error} reload={() => void reload()} />;

  const groups = groupAreas(areas).filter((g) => !groupKey || g.key === groupKey);
  return (
    <View style={styles.list}>
      {groups.map((group) => (
        <View key={group.key} style={styles.list}>
          {groupKey ? null : <SectionLabel>{t(`group.${group.key}`)}</SectionLabel>}
          {group.areas.map((area) => {
            const disabled = disabledIds.includes(area.id);
            return (
              <OptionRow
                key={area.id}
                title={t(area.name_key)}
                subtitle={
                  disabled ? t('addArea.following') : area.layer === 'career' ? t('onboarding.profession.career') : null
                }
                selected={selectedId === area.id}
                onPress={disabled ? undefined : () => onSelect(area)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 128,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  tileIcon: { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 },
  list: { gap: Spacing.sm },
});
