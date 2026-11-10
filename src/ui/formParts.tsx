import { useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { symbolOf, type CurrencyCode } from '../core/currency.ts';
import { formatIso, type LocalDate } from '../core/localDate.ts';
import { appStore } from '../state/app.ts';
import type { Translate } from '../i18n/index.ts';
import { Field, Icon } from './components.tsx';
import { CurrencyPicker, DatePickerDialog } from './pickers.tsx';
import { withFullScreenAd } from './ads.tsx';
import { C } from './theme.ts';

/** Currency prefix control inside an amount field; commits only on Confirm. */
export function CurrencyPrefix({ currency, t }: { currency: CurrencyCode; t: Translate }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        testID="currency-button"
        accessibilityLabel={t('currency_selector_cd', { code: currency })}
        onPress={() => setOpen(true)}
        style={s.prefix}
      >
        <Text style={s.prefixText}>{currency}</Text>
        <Icon name="menu-down" size={18} color={C.sub} />
        <Text style={s.symbol}>{symbolOf(currency)}</Text>
      </Pressable>
      <CurrencyPicker
        visible={open}
        value={currency}
        t={t}
        onCancel={() => setOpen(false)}
        onConfirm={(c) => {
          setOpen(false);
          appStore.setCurrency(c);
          withFullScreenAd('IV_CURRENCY_CONFIRM', 'currency_picker', () => undefined);
        }}
      />
    </>
  );
}

export function DateField({
  value,
  onChange,
  error,
  t,
  lang,
}: {
  value: LocalDate | null;
  onChange: (d: LocalDate) => void;
  error?: boolean;
  t: Translate;
  lang: string;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const fallback = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  return (
    <>
      <Pressable testID="start-date" accessibilityRole="button" onPress={() => setOpen(true)}>
        <Field
          label={t('start_date')}
          icon="calendar-month-outline"
          error={error}
          suffix={
            <View style={s.dateRow} pointerEvents="none">
              <Text style={[s.dateText, !value && { color: C.faint }]}>{value ? formatIso(value) : t('start_date_placeholder')}</Text>
              <Icon name="chevron-down" size={20} color={C.sub} />
            </View>
          }
        />
      </Pressable>
      <DatePickerDialog
        visible={open}
        value={value ?? fallback}
        t={t}
        lang={lang}
        onCancel={() => setOpen(false)}
        onConfirm={(d) => {
          setOpen(false);
          onChange(d);
        }}
      />
    </>
  );
}

/**
 * Leaving a calculator back to Home is the configured return-to-home
 * opportunity (layer2PageExitEnabled). Navigation proceeds exactly once.
 */
export function useReturnToHomeOpportunity(screen: string) {
  const navigation = useNavigation();
  const allow = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsub = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (allow.current) return;
      e.preventDefault();
      withFullScreenAd('IV_RETURN_TO_HOME', screen, () => {
        allow.current = true;
        navigation.dispatch(e.data.action);
      });
    });
    return unsub;
  }, [navigation, screen]);
}

const s = StyleSheet.create({
  prefix: { flexDirection: 'row', alignItems: 'center', paddingRight: 8, marginRight: 8, borderRightWidth: 1, borderRightColor: C.line, height: 32 },
  prefixText: { fontSize: 15, fontWeight: '700', color: C.text },
  symbol: { fontSize: 17, fontWeight: '700', color: C.primary, marginLeft: 2 },
  dateRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  dateText: { fontSize: 17, color: C.text },
});
