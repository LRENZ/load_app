import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { formatMoney } from '../../core/currency.ts';
import { D } from '../../core/decimal.ts';
import { monthlyCost } from '../../core/mortgage.ts';
import { termLabel } from '../../i18n/index.ts';
import { history } from '../../storage/history.ts';
import { useApp } from '../../state/app.ts';
import { formBus } from '../../state/formBus.ts';
import { Card, CardTitle, Header, InfoRow, PrimaryButton, Screen, SoftButton } from '../../ui/components.tsx';
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

/** The mortgage record keeps annual costs; the result shows the per-cost rounded monthly value. */
function monthly(annual: string | null): string {
  return annual ? monthlyCost(new D(annual)).toFixed(2) : '0.00';
}
