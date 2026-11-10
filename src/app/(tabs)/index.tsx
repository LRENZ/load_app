import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney } from '../../core/currency.ts';
import type { LoanRecord, LoanType } from '../../core/loan.ts';
import { termLabel, type Translate } from '../../i18n/index.ts';
import { history } from '../../storage/history.ts';
import { useApp } from '../../state/app.ts';
import { formBus } from '../../state/formBus.ts';
import { Icon } from '../../ui/components.tsx';
import { NativeAdSlot, withFullScreenAd } from '../../ui/ads.tsx';
import { LOAN_META, openCalculator } from '../../ui/loanMeta.ts';
import { C } from '../../ui/theme.ts';

const TILE_ORDER: LoanType[] = ['personal', 'business', 'mortgage', 'auto'];

const SAMPLE: LoanRecord = {
  operationId: 'sample',
  type: 'personal',
  currency: 'GBP',
  principal: '10000.00',
  annualRate: '6',
  termValue: 12,
  termUnit: 'months',
  termMonths: 12,
  startDate: '2026-08-03',
  monthlyPayment: '860.66',
  totalPayment: '10327.92',
  totalInterest: '327.92',
  payoffDate: '2027-08-03',
  homePrice: null,
  downPayment: null,
  downPaymentPercent: null,
  propertyTax: null,
  pmi: null,
  hoa: null,
  insurance: null,
  principalInterest: null,
  createdAt: 0,
};

let historyVersion = 0;
history.subscribe(() => {
  historyVersion++;
});

export default function Home() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const version = useSyncExternalStore(history.subscribe, () => historyVersion, () => historyVersion);
  const [records, setRecords] = useState<LoanRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      setRecords(history.list());
      // Android Back on Home: configured exit opportunity, then leave the app.
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        withFullScreenAd('IV_EXIT_APP', 'home', () => BackHandler.exitApp());
        return true;
      });
      return () => sub.remove();
    }, [version]),
  );

  const remove = (r: LoanRecord) => {
    Alert.alert(t('history_delete_title'), t('history_delete_body'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => r.id && history.remove(r.id) },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 32 }}>
      <View style={s.hero}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t('home_title')}</Text>
          <Text style={s.subtitle}>{t('home_subtitle')}</Text>
        </View>
        <View style={s.heroIcon}>
          <Icon name="finance" size={34} color={C.primary} />
        </View>
      </View>

      <View style={s.grid}>
        {TILE_ORDER.map((type) => {
          const m = LOAN_META[type];
          return (
            <Pressable
              key={type}
              testID={`tile-${type}`}
              accessibilityRole="button"
              onPress={() => openCalculator(type)}
              style={({ pressed }) => [s.tile, { backgroundColor: m.tint.bg }, pressed && { opacity: 0.8 }]}
            >
              <View style={[s.tileIcon, { backgroundColor: '#fff' }]}>
                <Icon name={m.icon} size={26} color={m.tint.fg} />
              </View>
              <Text style={s.tileTitle}>{t(m.key)}</Text>
              <View style={s.tileHint}>
                <Text style={[s.tileHintText, { color: m.tint.fg }]}>{t('loan_tile_hint')}</Text>
                <Icon name="arrow-right" size={16} color={m.tint.fg} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <NativeAdSlot placement="NA_HOME" screen="home" />

      <Text style={s.section}>{t('history')}</Text>
      {records.length === 0 ? (
        <HistoryCard
          r={SAMPLE}
          sample
          t={t}
          onPress={() => {
            formBus.post('personal', { action: 'load', record: SAMPLE });
            openCalculator('personal');
          }}
        />
      ) : (
        records.map((r) => (
          <HistoryCard key={r.id} r={r} t={t} onPress={() => router.push(`/result/${r.id}` as never)} onLongPress={() => remove(r)} />
        ))
      )}
    </ScrollView>
  );
}

function HistoryCard({ r, t, sample, onPress, onLongPress }: { r: LoanRecord; t: Translate; sample?: boolean; onPress: () => void; onLongPress?: () => void }) {
  const m = LOAN_META[r.type];
  const amount = formatMoney(r.currency, r.type === 'mortgage' ? r.homePrice ?? r.principal : r.principal);
  const term = termLabel(t, r.termValue, r.termUnit);
  return (
    <Pressable
      testID={sample ? 'history-sample' : `history-${r.id}`}
      accessibilityLabel={t('history_card_cd', { type: t(m.key), date: r.startDate, rate: `${r.annualRate}%`, term, amount })}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
    >
      <View style={s.cardHead}>
        <View style={[s.cardIcon, { backgroundColor: m.tint.bg }]}>
          <Icon name={m.icon} size={20} color={m.tint.fg} />
        </View>
        <Text style={s.cardTitle}>{t(m.key)}</Text>
        {sample && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{t('sample')}</Text>
          </View>
        )}
        <Text style={s.cardDate}>{r.startDate}</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.cell}>
          <Text style={s.cellLabel}>{t('interest_rate')}</Text>
          <Text style={s.cellValue}>{r.annualRate}%</Text>
        </View>
        <View style={s.cell}>
          <Text style={s.cellLabel}>{t('term')}</Text>
          <Text style={s.cellValue}>{term}</Text>
        </View>
        <View style={[s.cell, { flex: 1.4 }]}>
          <Text style={s.cellLabel}>{t('loan_amount')}</Text>
          <Text style={[s.cellValue, { color: C.primary }]} numberOfLines={1} adjustsFontSizeToFit>
            {amount}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 15, color: C.sub, marginTop: 4 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { width: '48.4%', borderRadius: 18, padding: 14, minHeight: 128 },
  tileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 12 },
  tileHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  tileHintText: { fontSize: 13, fontWeight: '600' },
  section: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  badge: { backgroundColor: C.warnSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: C.warn, fontSize: 11, fontWeight: '700' },
  cardDate: { marginLeft: 'auto', color: C.sub, fontSize: 13 },
  cardBody: { flexDirection: 'row', marginTop: 12, gap: 8 },
  cell: { flex: 1 },
  cellLabel: { color: C.sub, fontSize: 12 },
  cellValue: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
});
