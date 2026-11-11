import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { parseIso, today, type LocalDate } from '../../core/localDate.ts';
import {
  calculateLoan,
  ordinaryRecord,
  validateLoanForm,
  type LoanFormInput,
  type OrdinaryLoanType,
  type TermUnit,
} from '../../core/loan.ts';
import { sanitizeDecimalTyping } from '../../core/numberInput.ts';
import { history } from '../../storage/history.ts';
import { useApp } from '../../state/app.ts';
import { formBus, newOperationId } from '../../state/formBus.ts';
import { analytics, crash } from '../../state/services.ts';
import { Card, Field, FormMessage, Header, Icon, PrimaryButton, Screen, snackbar, TextButton } from '../../ui/components.tsx';
import { CurrencyPrefix, DateField, useReturnToHomeOpportunity } from '../../ui/formParts.tsx';
import { TermUnitMenu } from '../../ui/pickers.tsx';
import { NativeAdSlot, withFullScreenAd } from '../../ui/ads.tsx';
import { LOAN_META } from '../../ui/loanMeta.ts';
import { C } from '../../ui/theme.ts';

const TYPES: OrdinaryLoanType[] = ['personal', 'business', 'auto'];

interface FormState {
  amount: string;
  rate: string;
  term: string;
  termUnit: TermUnit;
  startDate: LocalDate | null;
}

const empty = (): FormState => ({ amount: '', rate: '', term: '', termUnit: 'months', startDate: today() });

export default function LoanForm() {
  const params = useLocalSearchParams<{ type: string }>();
  const type = (TYPES.includes(params.type as OrdinaryLoanType) ? params.type : 'personal') as OrdinaryLoanType;
  const { t, currency, language } = useApp();
  const [f, setF] = useState<FormState>(empty);
  const [errField, setErrField] = useState<keyof LoanFormInput | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const amountRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const rateRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const termRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; width: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const unitRef = useRef<React.ComponentRef<typeof View>>(null);
  useReturnToHomeOpportunity(`${type}_form`);

  useFocusEffect(
    useCallback(() => {
      const p = formBus.take(type);
      if (p?.action === 'reset') {
        setF(empty());
        setErrField(null);
        setErrMsg(null);
      } else if (p?.action === 'load') {
        const r = p.record;
        setF({
          amount: r.principal.replace(/\.00$/, ''),
          rate: r.annualRate,
          term: String(r.termValue),
          termUnit: r.termUnit,
          startDate: parseIso(r.startDate),
        });
        setErrField(null);
      }
    }, [type]),
  );

  const set = (patch: Partial<FormState>) => {
    setF((prev) => ({ ...prev, ...patch }));
    setErrField(null);
    setErrMsg(null);
    setFormErr(null);
  };

  const calculate = () => {
    if (busy) return;
    const v = validateLoanForm(f);
    if (!v.ok) {
      const msg = t(`err_${v.error}` as never);
      setErrField(v.field);
      // Field errors stay under the field until it is edited; the start date has no text field, so it keeps the snackbar.
      if (v.field === 'startDate') snackbar.show(msg);
      else {
        setErrMsg(msg);
        const refs: Partial<Record<keyof LoanFormInput, React.RefObject<React.ComponentRef<typeof TextInput> | null>>> = { amount: amountRef, rate: rateRef, term: termRef };
        refs[v.field]?.current?.focus();
      }
      analytics.track('calc_invalid', { type, error: v.error });
      return;
    }
    const r = calculateLoan(v.value.principal, v.value.rate, v.value.termMonths, v.value.startDate);
    if (!r.ok) {
      setFormErr(t(r.failure === 'payment_too_small' ? 'fail_payment_too_small' : 'fail_total_below_principal'));
      analytics.track('calc_failure', { type, failure: r.failure });
      return;
    }
    setBusy(true);
    let id = 0;
    try {
      id = history.save(ordinaryRecord(type, currency, v.value, r.result, newOperationId(), Date.now()));
    } catch (e) {
      crash.record(e, 'history.save');
      setBusy(false);
      snackbar.show(t('fail_save'));
      return;
    }
    analytics.track('calc_success', { type, currency });
    withFullScreenAd('IV_CALCULATION_COMPLETE', `${type}_form`, () => {
      setBusy(false);
      router.push(`/result/${id}?from=form` as never);
    });
  };

  return (
    <Screen header={<Header title={t(LOAN_META[type].key)} />}>
      <Card>
        <Field
          label={t('loan_amount')}
          icon="cash-multiple"
          error={errField === 'amount'}
          errorText={errMsg}
          inputRef={amountRef}
          testID="input-amount"
          prefix={<CurrencyPrefix currency={currency} t={t} />}
          inputProps={{
            returnKeyType: 'next',
            submitBehavior: 'submit',
            onSubmitEditing: () => rateRef.current?.focus(),
            value: f.amount,
            onChangeText: (s) => set({ amount: sanitizeDecimalTyping(s, 2) }),
            placeholder: t('amount_placeholder'),
            keyboardType: 'decimal-pad',
            maxLength: 16,
          }}
        />
        <Field
          label={t('interest_rate')}
          icon="percent-outline"
          error={errField === 'rate'}
          errorText={errMsg}
          inputRef={rateRef}
          testID="input-rate"
          inputProps={{
            returnKeyType: 'next',
            submitBehavior: 'submit',
            onSubmitEditing: () => termRef.current?.focus(),
            value: f.rate,
            onChangeText: (s) => set({ rate: sanitizeDecimalTyping(s, 4) }),
            placeholder: t('rate_placeholder'),
            keyboardType: 'decimal-pad',
            maxLength: 9,
          }}
          suffix={<Text style={{ fontSize: 17, color: C.sub, fontWeight: '700' }}>%</Text>}
        />
        <Field
          label={t('term')}
          icon="calendar-range"
          error={errField === 'term'}
          errorText={errMsg}
          inputRef={termRef}
          testID="input-term"
          inputProps={{
            returnKeyType: 'done',
            onSubmitEditing: () => calculate(),
            value: f.term,
            onChangeText: (s) => set({ term: s.replace(/[^0-9]/g, '') }),
            placeholder: t('term_placeholder'),
            keyboardType: 'number-pad',
            maxLength: 4,
          }}
          suffix={
            <View ref={unitRef} collapsable={false}>
              <Pressable
                testID="term-unit"
                accessibilityLabel={t('term_unit_cd', { unit: t(f.termUnit) })}
                onPress={() =>
                  unitRef.current?.measureInWindow((x, y, width, height) => setMenu({ x, y: y + height, width }))
                }
                style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingVertical: 8, borderLeftWidth: 1, borderLeftColor: C.line }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.primary }}>{t(f.termUnit)}</Text>
                <Icon name="menu-down" size={20} color={C.primary} />
              </Pressable>
            </View>
          }
        />
        <DateField value={f.startDate} onChange={(d) => set({ startDate: d })} error={errField === 'startDate'} t={t} lang={language} />
        <FormMessage text={formErr} />
        <PrimaryButton testID="calculate" title={t('calculate')} onPress={calculate} busy={busy} />
        <TextButton
          testID="reset-fields"
          title={t('reset_fields')}
          onPress={() => {
            setF(empty());
            setErrField(null);
            setErrMsg(null);
            setFormErr(null);
          }}
        />
      </Card>
      <NativeAdSlot placement="NA_CALCULATOR_ACTIONS" screen={`${type}_form`} />
      <TermUnitMenu visible={!!menu} anchor={menu} value={f.termUnit} t={t} onClose={() => setMenu(null)} onSelect={(u) => set({ termUnit: u })} />
    </Screen>
  );
}
