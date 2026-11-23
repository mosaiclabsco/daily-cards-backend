import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { AreaSwitcher } from '@/components/area-switcher';
import { CardActions } from '@/components/card-actions';
import { CardView, TypeTag } from '@/components/card-view';
import { AppText, Button, Loading, Notice, Screen } from '@/components/ui';
import { Spacing, TabTopInset, useTheme } from '@/constants/theme';
import { useSelectedArea } from '@/hooks/use-selected-area';
import { useTrack } from '@/hooks/use-track';
import { addDays, formatDay, localToday } from '@/lib/dates';
import { slotType } from '@/lib/schedule';

// Hoje: o conhecimento do dia da profissão, com nota, salvar, corrigir e enviar.
export default function Today() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { areaId, accessible, select } = useSelectedArea();
  const { cards, loading, offline, error, reload } = useTrack(areaId);
  const today = localToday();
  const card = cards.find((c) => c.day === today);
  const firstLoad = loading && cards.length === 0;

  return (
    <Screen
      edges={['top']}
      contentStyle={{ paddingTop: TabTopInset + Spacing.lg }}
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={loading && !firstLoad}
            onRefresh={() => void reload()}
            tintColor={theme.primary}
          />
        ),
      }}>
      <View style={styles.header}>
        <AreaSwitcher areaId={areaId} accessible={accessible} onSelect={select} />
        <AppText variant="title">{capitalize(formatDay(today, i18n.language))}</AppText>
      </View>
      {offline ? <Notice icon="offline" text={t('today.offline')} /> : null}
      {firstLoad ? (
        <Loading />
      ) : error && !card ? (
        <>
          <Notice tone="error" text={t(`errors.${error.code}`)} />
          <Button title={t('common.retry')} variant="secondary" onPress={() => void reload()} />
        </>
      ) : card ? (
        <>
          <CardView card={card} />
          <CardActions card={card} />
        </>
      ) : (
        <Notice text={slotType(today) === 'trend' ? t('today.trendEmpty') : t('today.empty')} />
      )}
      <View style={styles.tomorrow}>
        <AppText variant="caption" muted>
          {t('today.tomorrow')}
        </AppText>
        <TypeTag type={slotType(addDays(today, 1))} />
      </View>
    </Screen>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  header: { gap: Spacing.xs, marginBottom: Spacing.xs },
  tomorrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
});
