import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { today } from '../core/localDate.ts';
import {
  calculateMortgage,
  downPaymentAmountOf,
  downPaymentPercentOf,
  mortgageRecord,
  validateMortgageForm,
  type MortgageFormInput,
} from '../core/mortgage.ts';
import { parseDecimalField, sanitizeDecimalTyping } from '../core/numberInput.ts';
import type { StringKey } from '../i18n/index.ts';
import { history } from '../storage/history.ts';
import { useApp } from '../state/app.ts';
import { formBus, newOperationId } from '../state/formBus.ts';
import { analytics, crash } from '../state/services.ts';
import { Card, CardTitle, Field, FormMessage, Header, PrimaryButton, Screen, snackbar, TextButton } from '../ui/components.tsx';
import { CurrencyPrefix, useReturnToHomeOpportunity } from '../ui/formParts.tsx';
import { NativeAdSlot, withFullScreenAd } from '../ui/ads.tsx';
import { C, R } from '../ui/theme.ts';

const EMPTY: MortgageFormInput = {
  homePrice: '',
  downPayment: '',
  downPaymentPercent: '',
  rate: '',
  term: '',
  propertyTax: '',
  pmi: '',
  hoa: '',
  insurance: '',
};

const plain = (s: string) => s.replace(/\.00$/, '');

export default function MortgageForm() {
  const { t, currency } = useApp();
  const [f, setF] = useState<MortgageFormInput>(EMPTY);
  const [lastDp, setLastDp] = useState<'amount' | 'percent'>('amount');
  const [errField, setErrField] = useState<keyof MortgageFormInput | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  // Keyboard "Next" walks the fields in screen order; "Done" on the last one calculates.
  const inputs = useRef<Partial<Record<keyof MortgageFormInput, React.ComponentRef<typeof TextInput> | null>>>({});
  const bind = (key: keyof MortgageFormInput) => (r: React.ComponentRef<typeof TextInput> | null) => {
    inputs.current[key] = r;
  };
  const keyNav = (key: keyof MortgageFormInput) => {
    const i = FIELD_ORDER.indexOf(key);
    const next = FIELD_ORDER[i + 1];
    return next
      ? { returnKeyType: 'next' as const, submitBehavior: 'submit' as const, onSubmitEditing: () => inputs.current[next]?.focus() }
      : { returnKeyType: 'done' as const, onSubmitEditing: () => calculate() };
  };
  const [busy, setBusy] = useState(false);
  useReturnToHomeOpportunity('mortgage_form');

  useFocusEffect(
    useCallback(() => {
      const p = formBus.take('mortgage');
      if (p?.action === 'reset') {
        setF(EMPTY);
        setErrField(null);
        setErrMsg(null);
      } else if (p?.action === 'load') {
        const r = p.record;
        setF({
          homePrice: plain(r.homePrice ?? ''),
          downPayment: plain(r.downPayment ?? ''),
          downPaymentPercent: plain(r.downPaymentPercent ?? ''),
          rate: r.annualRate,
          term: String(r.termValue),
          propertyTax: plain(r.propertyTax ?? ''),
          pmi: plain(r.pmi ?? ''),
          hoa: plain(r.hoa ?? ''),
          insurance: plain(r.insurance ?? ''),
        });
        setErrField(null);
      }
    }, []),
  );

  const homeValue = (home: string) => {
    const h = parseDecimalField(home, 2, '0.01', '999999999.99');
    return h.ok ? h.value : null;
  };

  /** Amount ⇄ percentage coupling; recomputes only the other field, so no update loop. */
  const edit = (key: keyof MortgageFormInput, raw: string) => {
    setErrField(null);
    setErrMsg(null);
    setFormErr(null);
    setF((prev) => {
      const next = { ...prev, [key]: raw };
      const home = homeValue(key === 'homePrice' ? raw : prev.homePrice);
      if (key === 'downPayment') {
        setLastDp('amount');
        const d = parseDecimalField(raw, 2, '0', '999999999.99');
        next.downPaymentPercent = home && d.ok && d.value.lt(home) ? downPaymentPercentOf(home, d.value).toFixed(2).replace(/\.00$/, '') : prev.downPaymentPercent;
        if (raw === '') next.downPaymentPercent = '';
      } else if (key === 'downPaymentPercent') {
        setLastDp('percent');
        const p = parseDecimalField(raw, 2, '0', '100');
        next.downPayment = home && p.ok ? downPaymentAmountOf(home, p.value).toFixed(2).replace(/\.00$/, '') : prev.downPayment;
        if (raw === '') next.downPayment = '';
      } else if (key === 'homePrice' && home) {
        if (lastDp === 'percent') {
          const p = parseDecimalField(prev.downPaymentPercent, 2, '0', '100');
          if (p.ok) next.downPayment = downPaymentAmountOf(home, p.value).toFixed(2).replace(/\.00$/, '');
        } else {
          const d = parseDecimalField(prev.downPayment, 2, '0', '999999999.99');
          if (d.ok && d.value.lt(home)) next.downPaymentPercent = downPaymentPercentOf(home, d.value).toFixed(2).replace(/\.00$/, '');
        }
      }
      return next;
    });
  };

  const calculate = () => {
    if (busy) return;
    const v = validateMortgageForm(f);
    if (!v.ok) {
      setErrField(v.field);
      setErrMsg(t(`m_err_${v.error}` as StringKey));
      inputs.current[v.field]?.focus();
      analytics.track('calc_invalid', { type: 'mortgage', error: v.error });
      return;
    }
    const r = calculateMortgage(v.value);
    if (!r.ok) {
      setFormErr(t(`m_fail_${r.failure}` as StringKey));
      analytics.track('calc_failure', { type: 'mortgage', failure: r.failure });
      return;
    }
    setBusy(true);
    let id = 0;
    try {
      id = history.save(mortgageRecord(currency, v.value, r.result, today(), newOperationId(), Date.now()));
    } catch (e) {
      crash.record(e, 'history.save');
      setBusy(false);
      snackbar.show(t('fail_save'));
      return;
    }
    analytics.track('calc_success', { type: 'mortgage', currency });
    withFullScreenAd('IV_CALCULATION_COMPLETE', 'mortgage_form', () => {
      setBusy(false);
      router.push(`/result/${id}?from=form` as never);
    });
  };

  const money = (key: keyof MortgageFormInput, label: StringKey, icon: React.ComponentProps<typeof Field>['icon'], placeholder: StringKey = 'm_placeholder') => (
    <Field
      label={t(label)}
      icon={icon}
      error={errField === key}
      errorText={errMsg}
      inputRef={bind(key)}
      testID={`input-${key}`}
      inputProps={{ value: f[key], onChangeText: (s) => edit(key, sanitizeDecimalTyping(s, 2)), placeholder: t(placeholder), keyboardType: 'decimal-pad', maxLength: 16, ...keyNav(key) }}
    />
  );

  return (
    <Screen header={<Header title={t('loan_mortgage')} />}>
      <Card>
        <Field
          label={t('m_home_price')}
          icon="home-outline"
          error={errField === 'homePrice'}
          errorText={errMsg}
          inputRef={bind('homePrice')}
          testID="input-homePrice"
          prefix={<CurrencyPrefix currency={currency} t={t} />}
          inputProps={{ value: f.homePrice, onChangeText: (s) => edit('homePrice', sanitizeDecimalTyping(s, 2)), placeholder: t('m_home_price_placeholder'), keyboardType: 'decimal-pad', maxLength: 16, ...keyNav('homePrice') }}
        />
        <Field label={t('m_down_payment')} icon="cash-plus" />
        <View style={s.dpRow}>
          <View style={[s.dpBox, errField === 'downPayment' && s.err, { flex: 1.4 }]}>
            <TextInput
              ref={bind('downPayment')}
              {...keyNav('downPayment')}
              accessibilityLabel={t('m_down_payment')}
              testID="input-downPayment"
              value={f.downPayment}
              onChangeText={(x) => edit('downPayment', sanitizeDecimalTyping(x, 2))}
              placeholder={t('m_placeholder')}
              placeholderTextColor={C.faint}
              keyboardType="decimal-pad"
              maxLength={16}
              style={s.dpInput}
            />
          </View>
          <View style={[s.dpBox, errField === 'downPaymentPercent' && s.err, { flex: 1 }]}>
            <TextInput
              ref={bind('downPaymentPercent')}
              {...keyNav('downPaymentPercent')}
              accessibilityLabel={`${t('m_down_payment')} %`}
              testID="input-downPaymentPercent"
              value={f.downPaymentPercent}
              onChangeText={(x) => edit('downPaymentPercent', sanitizeDecimalTyping(x, 2))}
              placeholder="0"
              placeholderTextColor={C.faint}
              keyboardType="decimal-pad"
              maxLength={6}
              style={s.dpInput}
            />
            <Text style={s.pct}>%</Text>
          </View>
        </View>
        {(errField === 'downPayment' || errField === 'downPaymentPercent') && errMsg ? (
          <Text testID="input-downPayment-error" style={s.errText} accessibilityLiveRegion="polite">
            {errMsg}
          </Text>
        ) : null}
        <Field
          label={t('m_loan_term')}
          icon="calendar-range"
          error={errField === 'term'}
          errorText={errMsg}
          inputRef={bind('term')}
          testID="input-term"
          inputProps={{ value: f.term, onChangeText: (x) => edit('term', x.replace(/[^0-9]/g, '')), placeholder: t('term_placeholder'), keyboardType: 'number-pad', maxLength: 3, ...keyNav('term') }}
          suffix={<Text style={s.unit}>{t('years')}</Text>}
        />
        <Field
          label={t('m_annual_rate')}
          icon="percent-outline"
          error={errField === 'rate'}
          errorText={errMsg}
          inputRef={bind('rate')}
          testID="input-rate"
          inputProps={{ value: f.rate, onChangeText: (x) => edit('rate', sanitizeDecimalTyping(x, 4)), placeholder: t('rate_placeholder'), keyboardType: 'decimal-pad', maxLength: 9, ...keyNav('rate') }}
          suffix={<Text style={s.unit}>%</Text>}
        />
      </Card>
      <Card>
        <CardTitle>{t('m_ownership_costs')}</CardTitle>
        {money('propertyTax', 'm_property_tax', 'bank-outline')}
        {money('pmi', 'm_pmi', 'shield-check-outline')}
        {money('hoa', 'm_hoa', 'office-building-outline')}
        {money('insurance', 'm_insurance', 'umbrella-outline')}
        <FormMessage text={formErr} />
        <PrimaryButton testID="calculate" title={t('calculate')} onPress={calculate} busy={busy} />
        <TextButton
          testID="reset-fields"
          title={t('reset_fields')}
          onPress={() => {
            setF(EMPTY);
            setErrField(null);
            setErrMsg(null);
            setFormErr(null);
          }}
        />
      </Card>
      <NativeAdSlot placement="NA_CALCULATOR_ACTIONS" screen="mortgage_form" />
    </Screen>
  );
}

const FIELD_ORDER: (keyof MortgageFormInput)[] = ['homePrice', 'downPayment', 'downPaymentPercent', 'term', 'rate', 'propertyTax', 'pmi', 'hoa', 'insurance'];

const s = StyleSheet.create({
  errText: { color: C.danger, fontSize: 13.5, lineHeight: 18, marginTop: -10, marginBottom: 14, paddingHorizontal: 4 },
  dpRow: { flexDirection: 'row', gap: 10, marginTop: -8, marginBottom: 16 },
  dpBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: R.input, minHeight: 50, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'transparent' },
  err: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  dpInput: { flex: 1, fontSize: 17, color: C.text, paddingVertical: 10 },
  pct: { fontSize: 17, color: C.sub, fontWeight: '700' },
  unit: { fontSize: 15, color: C.sub, fontWeight: '700' },
});
