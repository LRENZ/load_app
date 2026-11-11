import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { RISK_SIGNALS, type RiskSignals } from '../core/ads/risk.ts';
import { PLACEMENTS } from '../core/ads/placements.ts';
import type { Cohort } from '../core/ads/types.ts';
import { kv, KEYS } from '../storage/kv.ts';
import { appStore, useApp } from '../state/app.ts';
import {
  ads,
  adMode,
  analytics,
  analyticsTrace,
  APP_MODE,
  attribution,
  currentAdConfig,
  DEBUG_TOOLS,
  DEFAULT_MOCK_SCENARIO,
  ledger,
  mockAdapter,
  resetAdCounters,
  risk,
  setAdMode,
  setMockScenario,
  setRiskFixture,
  setSimulatedOffline,
} from '../state/services.ts';
import { showRatePreview } from '../state/notifications.ts';
import { Card, CardTitle, Header, Screen, snackbar } from '../ui/components.tsx';
import { C } from '../ui/theme.ts';

/**
 * Developer screen (debug / mock builds only). Everything here is a local
 * test fixture: no real attribution, no real ads, synthetic revenue only.
 */
let offline = false;
let lastOutcome = '-';
const fmtTotals = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => k + ' ' + v).join(', ') || 'none';
const describe = (o: { status: string; reasons?: string[]; reason?: string }) => o.status + (o.reasons ? ' ' + o.reasons.join(',') : '') + (o.reason ? ' ' + o.reason : '');

type ScriptParams = {
  run?: string;
  adMode?: string;
  cohort?: string;
  fill?: string;
  showFails?: string;
  dup?: string;
  risk?: string;
  offline?: string;
  reset?: string;
  preload?: string;
  trigger?: string;
};

/**
 * Deterministic fixture script for emulator tests, e.g.
 * loadapp://debug?run=r1&adMode=mock&fill=no_fill&reset=1&preload=1&trigger=one
 * The outcome is written to the "last:" line at the top of this screen.
 */
async function runScript(p: ScriptParams): Promise<string> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  if (p.adMode === 'mock' || p.adMode === 'noop') setAdMode(p.adMode);
  if (p.cohort) {
    kv.set(KEYS.debugCohort, p.cohort === 'none' ? null : p.cohort);
    mockAdapter.clear();
  }
  if (p.fill || p.showFails || p.dup) {
    const sc = {
      ...DEFAULT_MOCK_SCENARIO,
      fill: (p.fill ?? 'success') as typeof DEFAULT_MOCK_SCENARIO.fill,
      showFails: p.showFails === '1',
      duplicateCallbacks: p.dup === '1',
    };
    for (const prov of ['admob', 'gam', 'pangle', 'topon', 'max'] as const) setMockScenario(prov, sc);
  } else if (p.fill === undefined && p.run) {
    for (const prov of ['admob', 'gam', 'pangle', 'topon', 'max'] as const) setMockScenario(prov, null);
  }
  if (p.risk !== undefined) {
    const on = new Set(p.risk.split(',').filter(Boolean));
    setRiskFixture(Object.fromEntries(RISK_SIGNALS.map((k) => [k, on.has(k)])) as RiskSignals);
  }
  if (p.offline !== undefined) {
    offline = p.offline === '1';
    setSimulatedOffline(offline);
  }
  if (p.reset === '1') resetAdCounters();
  if (p.preload === '1') {
    ads.preload('IV_CALCULATION_COMPLETE');
    await wait(1500);
  }
  if (p.trigger === 'one') {
    const o = await ads.showFullScreen('IV_CALCULATION_COMPLETE', 'debug-script');
    return 'outcome: ' + describe(o as never);
  }
  if (p.trigger === 'two') {
    const first = ads.showFullScreen('IV_CALCULATION_COMPLETE', 'debug-a');
    const second = await ads.showFullScreen('IV_LANGUAGE_CONFIRM', 'debug-b');
    lastOutcome = `${p.run} second: ${describe(second as never)}`;
    const f = await first;
    return `second: ${describe(second as never)}; first: ${describe(f as never)}`;
  }
  return 'applied';
}

export default function Debug() {
  const { t } = useApp();
  const params = useLocalSearchParams<ScriptParams>();
  const [, setN] = useState(0);
  const refresh = () => setN((n) => n + 1);
  useEffect(() => {
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!params.run || !DEBUG_TOOLS) return;
    lastOutcome = `${params.run} running`;
    runScript(params).then(
      (r) => {
        lastOutcome = `${params.run} ${r}`;
        refresh();
      },
      (e) => {
        lastOutcome = `${params.run} error ${String(e)}`;
        refresh();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.run]);
  if (!DEBUG_TOOLS) return <Screen header={<Header title="Developer" />}><Text>Not available in this build.</Text></Screen>;

  const cfg = currentAdConfig();
  const iv = cfg.formats.interstitial;
  const cohortFixture = kv.get<Cohort | null>(KEYS.debugCohort, null);
  const sig = risk.signals();
  const sc = mockAdapter.scenario('admob');
  const trace = analyticsTrace.entries().slice(-30).reverse();

  return (
    <Screen header={<Header title="Developer" />}>
      <Card>
        <CardTitle>Runtime</CardTitle>
        <Text testID="dbg-last" style={s.mono}>last: {lastOutcome}</Text>
        <Text style={s.mono}>APP_MODE={APP_MODE} adapter={ads.mode} config={cfg.version} ({cfg.provenance})</Text>
        <Text style={s.mono}>cohort={attribution().cohort}{attribution().fixture ? ' (LOCAL FIXTURE — not real paid traffic)' : ''}</Text>
        {iv && (
          <Text style={s.mono}>
            interstitial total {iv.total.maxDailyShow}/day; admob {iv.platform.admob.maxDailyShow}/day every {iv.platform.admob.minIntervalSec}s; enabled:{' '}
            {Object.entries(iv.enabled).filter(([, v]) => v).map(([k]) => k).join(',')}
          </Text>
        )}
        <Seg label="Ad adapter" options={['noop', 'mock']} value={adMode()} onChange={(v) => { setAdMode(v as 'noop' | 'mock'); refresh(); }} />
        <Seg
          label="Cohort fixture"
          options={['none', 'natural', 'paid']}
          value={cohortFixture ?? 'none'}
          onChange={(v) => { kv.set(KEYS.debugCohort, v === 'none' ? null : v); mockAdapter.clear(); refresh(); }}
        />
        <Toggle label="Simulate offline (ads)" value={offline} onChange={(v) => { offline = v; setSimulatedOffline(v); refresh(); }} />
      </Card>

      <Card>
        <CardTitle>Mock scenario (AdMob; test fixture)</CardTitle>
        <Seg
          label="Fill"
          options={['success', 'no_fill', 'error', 'offline']}
          value={sc.fill}
          onChange={(v) => { setMockScenario('admob', { ...sc, fill: v as typeof sc.fill }); refresh(); }}
        />
        <Toggle label="Show fails" value={sc.showFails} onChange={(v) => { setMockScenario('admob', { ...sc, showFails: v }); refresh(); }} />
        <Toggle label="Duplicate callbacks" value={sc.duplicateCallbacks} onChange={(v) => { setMockScenario('admob', { ...sc, duplicateCallbacks: v }); refresh(); }} />
        <Toggle label="Short TTL (5 s)" value={sc.ttlMs === 5000} onChange={(v) => { setMockScenario('admob', { ...sc, ttlMs: v ? 5000 : DEFAULT_MOCK_SCENARIO.ttlMs }); refresh(); }} />
        <Btn title="Reset scenario" onPress={() => { setMockScenario('admob', null); refresh(); }} />
      </Card>

      <Card>
        <CardTitle>Risk signal fixtures</CardTitle>
        {RISK_SIGNALS.map((k) => (
          <Toggle key={k} label={k} value={sig[k]} onChange={(v) => { setRiskFixture({ ...sig, [k]: v } as RiskSignals); refresh(); }} />
        ))}
      </Card>

      <Card>
        <CardTitle>Actions</CardTitle>
        <Text testID="dbg-last-outcome" style={s.mono}>last: {lastOutcome}</Text>
        <Btn title="Preload interstitial + native" onPress={() => { ads.preload('IV_CALCULATION_COMPLETE'); ads.preload('NA_HOME'); snackbar.show('Preload requested'); }} />
        <Btn
          title="Trigger IV_CALCULATION_COMPLETE"
          onPress={() => ads.showFullScreen('IV_CALCULATION_COMPLETE', 'debug').then((o) => { lastOutcome = 'outcome: ' + describe(o as never); snackbar.show(lastOutcome); refresh(); })}
        />
        <Btn title="Two triggers at once" onPress={() => {
          void ads.showFullScreen('IV_CALCULATION_COMPLETE', 'debug-a').then((o) => analytics.track('debug_outcome_a', { status: o.status }));
          void ads.showFullScreen('IV_LANGUAGE_CONFIRM', 'debug-b').then((o) => { lastOutcome = 'second: ' + describe(o as never); snackbar.show(lastOutcome); refresh(); });
        }} />
        <Btn title="Reset frequency counters" onPress={() => { resetAdCounters(); snackbar.show('Counters reset'); }} />
        <Btn title="Show intro again" onPress={() => { appStore.resetIntro(); snackbar.show('Intro will show on next launch'); }} />
        <Btn title="Re-ask notification prompt" onPress={() => { kv.set(KEYS.notifPrompted, false); snackbar.show('Prompt will show on Home'); }} />
        <Btn title="Post notification preview" onPress={() => void showRatePreview(t).then(() => snackbar.show('Preview posted'))} />
        <Btn title="Clear synthetic ledger" onPress={() => { ledger.clear(); refresh(); }} />
      </Card>

      <Card>
        <CardTitle>Synthetic revenue ledger (isTest, local only)</CardTitle>
        <Text style={s.mono}>entries={ledger.list().length} duplicatesIgnored={ledger.duplicateCount()}</Text>
        <Text testID="dbg-totals" style={s.mono}>totals(test): {fmtTotals(ledger.totals(true))} | totals(real): {fmtTotals(ledger.totals(false))}</Text>
      </Card>

      <Card>
        <CardTitle>Placements ({PLACEMENTS.length})</CardTitle>
        {PLACEMENTS.map((p) => {
          const d = ads.decide(p.id);
          return (
            <Text key={p.id} style={s.mono}>
              {p.id} [{p.format}] {p.wired ? '' : 'UNWIRED '}{d.allowed ? 'ALLOWED ' + d.candidates.join(',') : d.reasons.join(',')}
            </Text>
          );
        })}
      </Card>

      <Card>
        <CardTitle>Trace (latest 30)</CardTitle>
        <View testID="debug-trace">
          {trace.map((e, i) => (
            <Text key={i} style={s.mono}>
              {new Date(e.at).toISOString().slice(11, 19)} {e.name} {JSON.stringify(e.params)}
            </Text>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function Seg({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {options.map((o) => (
          <Pressable key={o} testID={`dbg-${label}-${o}`} onPress={() => onChange(o)} style={[s.seg, o === value && s.segOn]}>
            <Text style={{ color: o === value ? '#fff' : C.text, fontWeight: '600', fontSize: 13 }}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <Text style={s.label}>{label}</Text>
      <Switch testID={`dbg-toggle-${label}`} value={value} onValueChange={onChange} />
    </View>
  );
}

function Btn({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable testID={`dbg-${title}`} onPress={onPress} style={s.btn}>
      <Text style={{ color: C.primary, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  mono: { fontFamily: 'monospace', fontSize: 11, color: C.text, marginTop: 3 },
  label: { fontSize: 14, color: C.text, fontWeight: '600' },
  seg: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.inputBg },
  segOn: { backgroundColor: C.primary },
  btn: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
});
