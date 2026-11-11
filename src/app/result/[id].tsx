import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { repaymentSplit } from '../../core/breakdown.ts';
import { formatMoney } from '../../core/currency.ts';
import { D } from '../../core/decimal.ts';
import { monthlyCost } from '../../core/mortgage.ts';
import { termLabel } from '../../i18n/index.ts';
import { history } from '../../storage/history.ts';
import { useApp } from '../../state/app.ts';
import { formBus } from '../../state/formBus.ts';
import { analytics } from '../../state/services.ts';
import { Card, CardTitle, Header, Icon, InfoRow, PrimaryButton, Screen, SoftButton } from '../../ui/components.tsx';
import { NativeAdSlot } from '../../ui/ads.tsx';
import { calculatorPath, LOAN_META } from '../../ui/loanMeta.ts';
import { C } from '../../ui/theme.ts';

export default function Result() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { t } = useApp();
  const rec = useMemo(() => history.get(Number(id)), [id]);
  const fromForm = from === 'form';

  if (!rec) {
    return (
      <Screen header={<Header title={t('r_calc_result')} />}>
        <Text style={{ color: C.sub }}>—</Text>
      </Screen>
    );
  }
  const m = (v: string | null) => formatMoney(rec.currency, v ?? '0.00');
  const isMortgage = rec.type === 'mortgage';
  const term = termLabel(t, rec.termValue, isMortgage ? 'years' : rec.termUnit);
  // Principal vs interest over the whole loan (mortgage: of the loan part, without ownership costs).
  const repaid = new D(rec.principal).plus(new D(rec.totalInterest)).toFixed(2);
  const split = repaymentSplit(rec.principal, repaid);

  const share = () => {
    const lines = [
      t(LOAN_META[rec.type].key),
      `${t(isMortgage ? 'r_mortgage_principal' : 'loan_amount')}: ${m(rec.principal)}`,
      `${t('r_annual_rate')}: ${rec.annualRate}%`,
      `${t('r_loan_term')}: ${term}`,
      `${t(isMortgage ? 'r_monthly_total' : 'r_monthly_payment')}: ${m(rec.monthlyPayment)}`,
      `${t('r_total_interest')}: ${m(rec.totalInterest)}`,
      ...(isMortgage ? [] : [`${t('r_total_repayment')}: ${m(rec.totalPayment)}`, `${t('r_payoff')}: ${rec.payoffDate}`]),
      '',
      t('share_footer', { app: t('app_name') }),
    ];
    analytics.track('result_share', { type: rec.type });
    void Share.share({ message: lines.join('\n') }).catch(() => undefined);
  };

  const edit = () => {
    if (fromForm) router.back(); // inputs are still in the form
    else {
      formBus.post(rec.type, { action: 'load', record: rec });
      router.replace(calculatorPath(rec.type) as never);
    }
  };
  const startNew = () => {
    formBus.post(rec.type, { action: 'reset' });
    if (fromForm) router.back();
    else router.replace(calculatorPath(rec.type) as never);
  };

  return (
    <Screen header={<Header title={t(LOAN_META[rec.type].key)} />}>
      <View style={st.hero} testID="r-hero">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroLabel}>{t(isMortgage ? 'r_monthly_total' : 'r_monthly_payment')}</Text>
            <Text style={st.heroValue} testID="r-hero-monthly" adjustsFontSizeToFit numberOfLines={1}>
              {m(rec.monthlyPayment)}
            </Text>
            <Text style={st.heroSub}>
              {term} · {rec.annualRate}%
            </Text>
          </View>
          <Pressable
            testID="r-share"
            accessibilityRole="button"
            accessibilityLabel={t('share')}
            onPress={share}
            hitSlop={8}
            android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true }}
            style={({ pressed }) => [st.shareBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon name="share-variant" size={20} color="#fff" />
          </Pressable>
        </View>
        <View style={st.bar} accessibilityLabel={`${t('principal')} ${split.principalPct}%, ${t('interest')} ${split.interestPct}%`}>
          <View style={[st.barPrincipal, { flex: Math.max(split.principalFraction, 0.001) }]} />
          <View style={[st.barInterest, { flex: Math.max(1 - split.principalFraction, 0.001) }]} />
        </View>
        <View style={st.legend}>
          <Legend color="#FFFFFF" label={t('principal')} pct={split.principalPct} value={m(rec.principal)} testID="r-split-principal" />
          <Legend color={C.interest} label={t('interest')} pct={split.interestPct} value={m(rec.totalInterest)} testID="r-split-interest" />
        </View>
      </View>
      {isMortgage ? (
        <>
          <Card>
            <CardTitle>{t('r_mortgage_info')}</CardTitle>
            <InfoRow label={t('m_home_price')} value={m(rec.homePrice)} />
            <InfoRow label={t('m_down_payment')} value={m(rec.downPayment)} />
            <InfoRow label={t('r_down_payment_percent')} value={`${rec.downPaymentPercent}%`} />
            <InfoRow label={t('r_mortgage_principal')} value={m(rec.principal)} testID="r-principal" />
            <InfoRow label={t('m_annual_rate')} value={`${rec.annualRate}%`} />
            <InfoRow label={t('m_loan_term')} value={termLabel(t, rec.termValue, 'years')} />
          </Card>
          <Card>
            <CardTitle>{t('r_monthly_payment_title')}</CardTitle>
            <InfoRow label={t('r_monthly_total')} value={m(rec.monthlyPayment)} strong testID="r-monthly-total" />
            <InfoRow label={t('r_principal_interest')} value={m(rec.principalInterest)} testID="r-pi" />
            <InfoRow label={t('m_property_tax')} value={m(monthly(rec.propertyTax))} />
            <InfoRow label={t('m_pmi')} value={m(monthly(rec.pmi))} />
            <InfoRow label={t('m_hoa')} value={m(monthly(rec.hoa))} />
            <InfoRow label={t('m_insurance')} value={m(monthly(rec.insurance))} />
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardTitle>{t('r_loan_information')}</CardTitle>
            <InfoRow label={t('loan_amount')} value={m(rec.principal)} />
            <InfoRow label={t('r_annual_rate')} value={`${rec.annualRate}%`} />
            <InfoRow label={t('r_loan_term')} value={termLabel(t, rec.termValue, rec.termUnit)} />
            <InfoRow label={t('start_date')} value={rec.startDate} />
          </Card>
          <Card>
            <CardTitle>{t('r_calc_result')}</CardTitle>
            <InfoRow label={t('r_monthly_payment')} value={m(rec.monthlyPayment)} strong testID="r-monthly" />
            <InfoRow label={t('r_total_repayment')} value={m(rec.totalPayment)} testID="r-total" />
            <InfoRow label={t('r_total_interest')} value={m(rec.totalInterest)} testID="r-interest" />
            <InfoRow label={t('r_payoff')} value={rec.payoffDate} testID="r-payoff" />
          </Card>
        </>
      )}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginBottom: 6 }}>
        <Text style={{ color: C.sub, fontSize: 13, lineHeight: 19, flex: 1 }}>{t('r_disclaimer')}</Text>
      </View>
      <NativeAdSlot placement="NA_RESULT_DISCLAIMER" screen="result" />
      <PrimaryButton testID="edit-calculation" title={t('r_edit')} onPress={edit} />
      <SoftButton testID="new-calculation" title={t('r_new')} onPress={startNew} />
    </Screen>
  );
}

function Legend({ color, label, pct, value, testID }: { color: string; label: string; pct: string; value: string; testID: string }) {
  return (
    <View style={{ flex: 1 }} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={st.legendLabel}>
          {label} · {pct}%
        </Text>
      </View>
      <Text style={st.legendValue}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.primary, borderRadius: 20, padding: 18, marginBottom: 14 },
  heroLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 2 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.2)' },
  barPrincipal: { backgroundColor: '#FFFFFF' },
  barInterest: { backgroundColor: C.interest },
  legend: { flexDirection: 'row', gap: 12, marginTop: 12 },
  legendLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '600' },
  legendValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2, marginLeft: 16 },
});

/** The mortgage record keeps annual costs; the result shows the per-cost rounded monthly value. */
function monthly(annual: string | null): string {
  return annual ? monthlyCost(new D(annual)).toFixed(2) : '0.00';
}
