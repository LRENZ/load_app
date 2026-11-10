import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CURRENCIES, type CurrencyCode } from '../core/currency.ts';
import {
  dayOfWeek,
  daysInMonth,
  formatIso,
  formatMdy,
  inSupportedRange,
  MAX_DATE,
  MIN_DATE,
  parseMdy,
  type LocalDate,
} from '../core/localDate.ts';
import type { TermUnit } from '../core/loan.ts';
import type { Translate } from '../i18n/index.ts';
import { Dialog, Icon } from './components.tsx';
import { NativeAdSlot } from './ads.tsx';
import { C, R } from './theme.ts';

// ---------------- currency ----------------
/** Staged selection: only Confirm commits; Cancel / Back / backdrop discard. */
export function CurrencyPicker({
  visible,
  value,
  onCancel,
  onConfirm,
  t,
}: {
  visible: boolean;
  value: CurrencyCode;
  onCancel: () => void;
  onConfirm: (c: CurrencyCode) => void;
  t: Translate;
}) {
  const [pending, setPending] = useState(value);
  useEffect(() => {
    if (visible) setPending(value);
  }, [visible, value]);
  return (
    <Dialog visible={visible} onClose={onCancel} testID="currency-picker">
      <Text style={p.title}>{t('currency_title')}</Text>
      <ScrollView style={{ maxHeight: 4 * 58 }} testID="currency-list">
        {CURRENCIES.map((c) => {
          const sel = c.code === pending;
          return (
            <Pressable
              key={c.code}
              testID={`currency-${c.code}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              onPress={() => setPending(c.code)}
              style={[p.row, sel && p.rowSel]}
            >
              <Text style={[p.rowText, sel && { color: C.primary }]}>
                {c.code} ({c.symbol})
              </Text>
              {sel && <Icon name="check-circle" color={C.primary} />}
            </Pressable>
          );
        })}
      </ScrollView>
      <NativeAdSlot placement="NA_CURRENCY" screen="currency_picker" />
      <View style={p.actions}>
        <Pressable testID="currency-cancel" onPress={onCancel} style={[p.btn, p.btnGhost]}>
          <Text style={[p.btnText, { color: C.sub }]}>{t('cancel')}</Text>
        </Pressable>
        <Pressable testID="currency-confirm" onPress={() => onConfirm(pending)} style={[p.btn, p.btnPrimary]}>
          <Text style={[p.btnText, { color: '#fff' }]}>{t('confirm')}</Text>
        </Pressable>
      </View>
    </Dialog>
  );
}

// ---------------- term unit popup ----------------
export function TermUnitMenu({
  visible,
  anchor,
  value,
  onSelect,
  onClose,
  t,
}: {
  visible: boolean;
  anchor: { x: number; y: number; width: number } | null;
  value: TermUnit;
  onSelect: (u: TermUnit) => void;
  onClose: () => void;
  t: Translate;
}) {
  if (!anchor) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="term-menu-backdrop" />
      <View testID="term-menu" style={[p.menu, { top: anchor.y + 4, left: Math.max(8, anchor.x + anchor.width - 140) }]}>
        {(['months', 'years'] as const).map((u) => (
          <Pressable
            key={u}
            testID={`term-unit-${u}`}
            onPress={() => {
              onSelect(u);
              onClose();
            }}
            style={[p.menuItem, u === value && { backgroundColor: C.primarySoft }]}
          >
            <Text style={[p.menuText, u === value && { color: C.primary, fontWeight: '700' }]}>{t(u)}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

// ---------------- date picker ----------------
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthTitle(year: number, month: number, lang: string) {
  try {
    return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' }).format(new Date(year, month - 1, 1));
  } catch {
    return `${MONTHS_SHORT[month - 1]} ${year}`;
  }
}

function weekdayLabels(lang: string): string[] {
  try {
    const f = new Intl.DateTimeFormat(lang, { weekday: 'narrow' });
    return [0, 1, 2, 3, 4, 5, 6].map((i) => f.format(new Date(2026, 1, 1 + i))); // 2026-02-01 is a Sunday
  } catch {
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  }
}

export function DatePickerDialog({
  visible,
  value,
  onCancel,
  onConfirm,
  t,
  lang,
}: {
  visible: boolean;
  value: LocalDate;
  onCancel: () => void;
  onConfirm: (d: LocalDate) => void;
  t: Translate;
  lang: string;
}) {
  const [sel, setSel] = useState(value);
  const [view, setView] = useState({ year: value.year, month: value.month });
  const [mode, setMode] = useState<'calendar' | 'year' | 'text'>('calendar');
  const [text, setText] = useState(formatMdy(value));
  const [textErr, setTextErr] = useState<string | null>(null);
  const yearList = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (visible) {
      setSel(value);
      setView({ year: value.year, month: value.month });
      setMode('calendar');
      setText(formatMdy(value));
      setTextErr(null);
    }
  }, [visible, value]);

  const cells = useMemo(() => {
    const first = dayOfWeek({ year: view.year, month: view.month, day: 1 });
    const n = daysInMonth(view.year, view.month);
    const out: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= n; d++) out.push(d);
    while (out.length % 7) out.push(null);
    return out;
  }, [view]);

  const years = useMemo(() => Array.from({ length: MAX_DATE.year - MIN_DATE.year + 1 }, (_, i) => MIN_DATE.year + i), []);

  const shiftMonth = (delta: number) => {
    const total = view.year * 12 + view.month - 1 + delta;
    const y = Math.floor(total / 12);
    if (y < MIN_DATE.year || y > MAX_DATE.year) return;
    setView({ year: y, month: (total % 12) + 1 });
  };

  const confirm = () => {
    if (mode === 'text') {
      const d = parseMdy(text);
      if (!d) return setTextErr(t('date_invalid'));
      if (!inSupportedRange(d)) return setTextErr(t('date_out_of_range'));
      onConfirm(d);
      return;
    }
    onConfirm(sel);
  };

  return (
    <Dialog visible={visible} onClose={onCancel} testID="date-picker">
      <Text style={p.dpLabel}>{mode === 'text' ? t('date_enter') : t('date_select')}</Text>
      <View style={p.dpHeadRow}>
        <Text testID="date-picker-heading" style={p.dpHead}>
          {formatIso(sel)}
        </Text>
        <Pressable
          testID="date-mode-toggle"
          accessibilityLabel={mode === 'text' ? t('date_switch_calendar') : t('date_switch_text')}
          hitSlop={10}
          onPress={() => {
            if (mode === 'text') {
              const d = parseMdy(text);
              if (d && inSupportedRange(d)) {
                setSel(d);
                setView({ year: d.year, month: d.month });
              }
              setMode('calendar');
            } else {
              setText(formatMdy(sel));
              setTextErr(null);
              setMode('text');
            }
          }}
        >
          <Icon name={mode === 'text' ? 'calendar-month-outline' : 'pencil-outline'} color={C.sub} />
        </Pressable>
      </View>
      <View style={p.divider} />
      {mode === 'text' && (
        <View style={{ paddingVertical: 8 }}>
          <TextInput
            testID="date-text-input"
            value={text}
            onChangeText={(s) => {
              setText(s.replace(/[^0-9/]/g, '').slice(0, 10));
              setTextErr(null);
            }}
            placeholder={t('date_format_hint')}
            placeholderTextColor={C.faint}
            keyboardType="number-pad"
            autoFocus
            style={[p.dpText, textErr ? { borderColor: C.danger } : null]}
          />
          <Text style={[p.dpHint, textErr ? { color: C.danger } : null]}>{textErr ?? t('date_format_hint')}</Text>
        </View>
      )}
      {mode !== 'text' && (
        <View>
          <View style={p.dpNav}>
            <Pressable testID="date-year-toggle" accessibilityLabel={t('date_choose_year')} onPress={() => setMode(mode === 'year' ? 'calendar' : 'year')} style={p.dpMonthBtn}>
              <Text style={p.dpMonth}>{monthTitle(view.year, view.month, lang)}</Text>
              <Icon name={mode === 'year' ? 'menu-up' : 'menu-down'} color={C.sub} />
            </Pressable>
            {mode === 'calendar' && (
              <View style={{ flexDirection: 'row' }}>
                <Pressable testID="date-prev" accessibilityLabel={t('date_prev_month')} hitSlop={8} onPress={() => shiftMonth(-1)} style={p.dpArrow}>
                  <Icon name="chevron-left" color={C.text} />
                </Pressable>
                <Pressable testID="date-next" accessibilityLabel={t('date_next_month')} hitSlop={8} onPress={() => shiftMonth(1)} style={p.dpArrow}>
                  <Icon name="chevron-right" color={C.text} />
                </Pressable>
              </View>
            )}
          </View>
          {mode === 'calendar' ? (
            <View>
              <View style={p.dpWeek}>
                {weekdayLabels(lang).map((w, i) => (
                  <Text key={i} style={p.dpWeekText}>
                    {w}
                  </Text>
                ))}
              </View>
              <View style={p.dpGrid}>
                {cells.map((d, i) => {
                  const isSel = d != null && sel.year === view.year && sel.month === view.month && sel.day === d;
                  return (
                    <Pressable
                      key={i}
                      disabled={d == null}
                      testID={d ? `date-day-${d}` : undefined}
                      onPress={() => d && setSel({ year: view.year, month: view.month, day: d })}
                      style={p.dpCell}
                    >
                      {d != null && (
                        <View style={[p.dpDay, isSel && { backgroundColor: C.primary }]}>
                          <Text style={[p.dpDayText, isSel && { color: '#fff', fontWeight: '700' }]}>{d}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <FlatList
              ref={yearList}
              testID="date-year-list"
              data={years}
              numColumns={3}
              style={{ height: 264 }}
              keyExtractor={(y) => String(y)}
              initialScrollIndex={Math.max(0, Math.floor((view.year - MIN_DATE.year) / 3) - 2)}
              getItemLayout={(_, i) => ({ length: 48, offset: 48 * Math.floor(i / 3), index: i })}
              renderItem={({ item }) => (
                <Pressable
                  testID={`date-year-${item}`}
                  onPress={() => {
                    const day = Math.min(sel.day, daysInMonth(item, view.month));
                    setView({ year: item, month: view.month });
                    setSel({ year: item, month: view.month, day });
                    setMode('calendar');
                  }}
                  style={p.yearCell}
                >
                  <View style={[p.yearPill, item === view.year && { backgroundColor: C.primary }]}>
                    <Text style={[p.yearText, item === view.year && { color: '#fff' }]}>{item}</Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
      <View style={[p.actions, { justifyContent: 'flex-end' }]}>
        <Pressable testID="date-cancel" onPress={onCancel} style={p.dpAction}>
          <Text style={p.dpActionText}>{t('cancel')}</Text>
        </Pressable>
        <Pressable testID="date-ok" onPress={confirm} style={p.dpAction}>
          <Text style={p.dpActionText}>{t('ok')}</Text>
        </Pressable>
      </View>
    </Dialog>
  );
}

// ---------------- rating ----------------
export function RatingDialog({
  visible,
  onClose,
  onSubmit,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (stars: number) => void;
  t: Translate;
}) {
  const [stars, setStars] = useState(0);
  useEffect(() => {
    if (visible) setStars(0);
  }, [visible]);
  return (
    <Dialog visible={visible} onClose={onClose} testID="rating-dialog">
      <Pressable testID="rating-close" accessibilityLabel={t('close')} onPress={onClose} hitSlop={10} style={p.rateClose}>
        <Icon name="close" color={C.sub} />
      </Pressable>
      <View style={p.rateHero}>
        <Icon name="star-face" size={56} color={C.star} />
      </View>
      <Text style={p.rateMsg}>
        {t('rate_msg_before')}
        <Text style={{ color: C.primary, fontWeight: '800' }}>{t('rate_msg_highlight')}</Text>
        {t('rate_msg_after')}
      </Text>
      <View style={p.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            testID={`rating-star-${n}`}
            accessibilityRole="button"
            accessibilityLabel={t('rate_star_cd', { n })}
            accessibilityState={{ selected: n <= stars }}
            hitSlop={4}
            onPress={() => setStars(n)}
          >
            <Icon name={n <= stars ? 'star' : 'star-outline'} size={38} color={n <= stars ? C.star : '#C9CFDA'} />
          </Pressable>
        ))}
      </View>
      <Pressable
        testID="rating-submit"
        disabled={stars === 0}
        onPress={() => onSubmit(stars)}
        style={[p.rateSubmit, stars === 0 ? { backgroundColor: C.primarySoft } : { backgroundColor: C.primary }]}
      >
        <Text style={{ color: stars === 0 ? '#8FA8E8' : '#fff', fontWeight: '700', fontSize: 16 }}>{t('submit')}</Text>
      </Pressable>
    </Dialog>
  );
}

const p = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, marginBottom: 8 },
  rowSel: { borderColor: C.primary, backgroundColor: C.primarySoft },
  rowText: { fontSize: 16, color: C.text, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  btn: { flex: 1, height: 48, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: C.inputBg },
  btnPrimary: { backgroundColor: C.primary },
  btnText: { fontSize: 16, fontWeight: '700' },
  menu: { position: 'absolute', width: 140, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 6, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuText: { fontSize: 16, color: C.text },
  dpLabel: { fontSize: 13, color: C.sub, fontWeight: '600' },
  dpHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  dpHead: { fontSize: 28, fontWeight: '700', color: C.text },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 10 },
  dpNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dpMonthBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dpMonth: { fontSize: 15, fontWeight: '700', color: C.text },
  dpArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dpWeek: { flexDirection: 'row' },
  dpWeekText: { flex: 1, textAlign: 'center', color: C.sub, fontSize: 12, paddingVertical: 4 },
  dpGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dpCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dpDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dpDayText: { fontSize: 14, color: C.text },
  yearCell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  yearPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill },
  yearText: { fontSize: 15, color: C.text },
  dpText: { borderWidth: 1.5, borderColor: C.primary, borderRadius: 10, fontSize: 18, paddingHorizontal: 12, paddingVertical: 10, color: C.text },
  dpHint: { fontSize: 12, color: C.sub, marginTop: 6 },
  dpAction: { paddingHorizontal: 14, paddingVertical: 10 },
  dpActionText: { color: C.primary, fontWeight: '700', fontSize: 15 },
  rateClose: { position: 'absolute', right: 14, top: 14, zIndex: 2 },
  rateHero: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFF6D6', marginTop: 8, marginBottom: 14 },
  rateMsg: { textAlign: 'center', fontSize: 16, color: C.text, lineHeight: 23, marginBottom: 14 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  rateSubmit: { height: 50, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
});
