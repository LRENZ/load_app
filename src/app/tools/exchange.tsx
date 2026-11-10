import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { CurrencyCode } from '../../core/currency.ts';
import { applyRate, LatestOnly, loadFx, type FxState } from '../../core/fx.ts';
import { parseToolInput } from '../../core/converters.ts';
import type { StringKey } from '../../i18n/index.ts';
import { kv, KEYS } from '../../storage/kv.ts';
import { useApp } from '../../state/app.ts';
import { analytics, fxCache } from '../../state/services.ts';
import { Card, Header, Screen } from '../../ui/components.tsx';
import { ConvBox, SwapButton } from '../../ui/converterParts.tsx';
import { CurrencyPicker } from '../../ui/pickers.tsx';
import { NativeAdSlot } from '../../ui/ads.tsx';
import { C } from '../../ui/theme.ts';

const realFetch = (url: string, signal: AbortSignal) => fetch(url, { signal, headers: { Accept: 'application/json' } });

export default function ExchangeRate() {
  const { t } = useApp();
  const initial = kv.get<{ from: CurrencyCode; to: CurrencyCode } | null>(KEYS.lastFxPair, null);
  const [from, setFrom] = useState<CurrencyCode>(initial?.from ?? 'USD');
  const [to, setTo] = useState<CurrencyCode>(initial?.to ?? 'EUR');
  const [amount, setAmount] = useState('1');
  const [fx, setFx] = useState<FxState | null>(null);
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const latest = useRef(new LatestOnly()).current;

  const load = useCallback(
    async (f: CurrencyCode, tt: CurrencyCode) => {
      const id = latest.next();
      setLoading(true);
      kv.set(KEYS.lastFxPair, { from: f, to: tt });
      const s = await loadFx(f, tt, { cache: fxCache, fetch: realFetch, now: Date.now });
      if (!latest.isLatest(id)) return; // a newer pair was chosen; drop this response
      setFx(s);
      setLoading(false);
      analytics.track('fx_load', { from: f, to: tt, kind: s.kind, source: s.kind === 'fresh' ? s.source : undefined });
    },
    [latest],
  );

  useEffect(() => {
    void load(from, to);
  }, [from, to, load]);

  const parsed = parseToolInput(amount, 'mass'); // non-negative, ≤ 12 integer and 4 fraction digits
  const quote = fx && (fx.kind === 'fresh' || fx.kind === 'stale') ? fx.quote : null;
  const output = quote && parsed.kind === 'value' ? applyRate(parsed.value, quote.rate) : '';
  const inputError = parsed.kind === 'error' ? t(`tool_err_${parsed.error}` as StringKey) : null;

  let status: { text: string; color: string } | null = null;
  if (fx?.kind === 'same_currency') status = { text: t('fx_same'), color: C.warn };
  else if (fx?.kind === 'error') status = { text: t(`fx_err_${fx.reason}` as StringKey), color: C.danger };
  else if (fx?.kind === 'stale') status = { text: t('fx_stale', { date: fx.quote.date }), color: C.warn };

  return (
    <Screen header={<Header title={t('tool_fx')} />}>
      <Card>
        <ConvBox
          caption={t('from')}
          unit={from}
          onUnitPress={() => setPicker('from')}
          testID="fx-amount"
          error={inputError}
          inputProps={{ value: amount, onChangeText: (s) => setAmount(s.replace(/,/g, '.')), placeholder: t('enter_value'), keyboardType: 'decimal-pad', maxLength: 18 }}
        />
        <SwapButton
          label={t('swap')}
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
        />
        <ConvBox caption={t('to')} unit={to} onUnitPress={() => setPicker('to')} output={output} testID="fx-output" />
        <View style={{ marginTop: 14, minHeight: 40 }}>
          {loading && !quote ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={C.primary} />
              <Text style={{ color: C.sub }}>{t('fx_loading')}</Text>
            </View>
          ) : null}
          {quote ? (
            <>
              <Text testID="fx-rate-line" style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>
                {t('fx_rate_line', { from: quote.from, to: quote.to, rate: String(quote.rate) })}
              </Text>
              <Text testID="fx-rate-date" style={{ color: C.sub, fontSize: 13, marginTop: 2 }}>
                {t('fx_rate_date', { date: quote.date })}
              </Text>
            </>
          ) : null}
          {status ? (
            <Text testID="fx-status" style={{ color: status.color, fontSize: 13, marginTop: 6 }}>
              {status.text}
            </Text>
          ) : null}
          {(fx?.kind === 'error' || fx?.kind === 'stale') && (
            <Pressable testID="fx-retry" onPress={() => load(from, to)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Text style={{ color: C.primary, fontWeight: '700' }}>{t('retry')}</Text>
            </Pressable>
          )}
        </View>
      </Card>
      <NativeAdSlot placement="NA_EXCHANGE_RATE" screen="tool_fx" />
      <CurrencyPicker
        visible={picker !== null}
        value={picker === 'to' ? to : from}
        t={t}
        onCancel={() => setPicker(null)}
        onConfirm={(c) => {
          if (picker === 'from') setFrom(c);
          else setTo(c);
          setPicker(null);
        }}
      />
    </Screen>
  );
}
