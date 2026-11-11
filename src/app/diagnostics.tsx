import React, { useEffect, useReducer, useState } from 'react';
import { Text, View } from 'react-native';
import { firebaseStatus, onFirebaseStatus, sendTestNonFatal } from '../state/firebase.ts';
import { adMode, APP_MODE, currentAdConfig, messaging } from '../state/services.ts';
import { Card, CardTitle, Header, PrimaryButton, Screen, snackbar } from '../ui/components.tsx';
import { C } from '../ui/theme.ts';

/**
 * Firebase diagnostics (any build; reached by long-pressing the version in
 * Settings or loadapp://diagnostics). Read-only except the labelled test
 * crash report. The FCM token is selectable so it can be pasted into the
 * Firebase console's "Send test message".
 */
export default function Diagnostics() {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [crashSent, setCrashSent] = useState(false);
  useEffect(() => onFirebaseStatus(rerender), []);
  useEffect(() => {
    void messaging.remoteToken().then(rerender);
  }, []);
  const s = firebaseStatus();
  const cfg = currentAdConfig();
  const ok = (v: boolean) => (v ? 'yes' : 'no');

  return (
    <Screen header={<Header title="Firebase status" />}>
      <Card>
        <CardTitle>App</CardTitle>
        <Line id="diag-app" k="Firebase app ID" v={s.appId ?? 'not initialised'} />
        <Line id="diag-project" k="Project" v={s.projectId ?? '-'} />
        <Line id="diag-mode" k="Build mode" v={APP_MODE} />
        <Line id="diag-collection" k="Analytics / Crashlytics collection" v={s.collection ? 'on' : 'off (mock / test build)'} />
        <Line id="diag-instance" k="Analytics app instance ID" v={s.analyticsInstanceId ?? '…'} selectable />
      </Card>
      <Card>
        <CardTitle>Remote Config</CardTitle>
        <Line id="diag-rc-activated" k="Activated at startup" v={s.remoteConfig.activated === null ? '…' : ok(s.remoteConfig.activated)} />
        <Line id="diag-rc-fetch" k="Last fetch (applies next launch)" v={s.remoteConfig.lastFetchStatus} />
        <Line id="diag-rc-fetched-at" k="Fetched at" v={s.remoteConfig.fetchedAt ? new Date(s.remoteConfig.fetchedAt).toISOString() : '-'} />
        {s.remoteConfig.error ? <Line id="diag-rc-error" k="Fetch error" v={s.remoteConfig.error} /> : null}
        <Line id="diag-rc-keys" k="Ad-policy keys (chars)" v={JSON.stringify(s.remoteConfig.keys)} />
        <Line id="diag-ad-config" k="Ad policy in use" v={`${cfg.version} (${cfg.provenance})`} />
        <Line id="diag-ad-mode" k="Ad adapter" v={adMode() === 'mock' ? 'local mock (debug)' : 'NoOp placeholder: no ad SDK, no unit IDs'} />
      </Card>
      <Card>
        <CardTitle>Cloud Messaging</CardTitle>
        <Line id="diag-fcm-status" k="FCM token" v={s.fcm.status} />
        {s.fcm.token ? <Line id="diag-fcm-token" k="Token (long-press to copy)" v={s.fcm.token} selectable /> : null}
        {s.fcm.error ? <Line id="diag-fcm-error" k="Error" v={s.fcm.error} /> : null}
      </Card>
      <Card>
        <CardTitle>Crashlytics</CardTitle>
        <Text style={{ color: C.sub, fontSize: 13, marginBottom: 10 }}>
          Sends one labelled non-fatal report. It appears in Firebase console → Crashlytics → Non-fatals after the next app start.
        </Text>
        <PrimaryButton
          testID="diag-crash-test"
          title={crashSent ? 'Test report recorded' : 'Send test non-fatal'}
          disabled={crashSent || !s.collection}
          onPress={() => {
            if (sendTestNonFatal()) {
              setCrashSent(true);
              snackbar.show('Recorded. Restart the app to upload it.');
            }
          }}
        />
        <Line id="diag-revenue" k="Ad revenue → Firebase (sent / skipped / failed)" v={`${s.revenue.sent} / ${s.revenue.skipped} / ${s.revenue.failed}`} />
      </Card>
      {s.errors.length > 0 && (
        <Card>
          <CardTitle>Errors</CardTitle>
          {s.errors.map((e, i) => (
            <Text key={i} style={{ color: C.danger ?? '#C62828', fontSize: 12, marginBottom: 4 }}>
              {e}
            </Text>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Line({ id, k, v, selectable }: { id: string; k: string; v: string; selectable?: boolean }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: C.sub, fontSize: 12 }}>{k}</Text>
      <Text testID={id} selectable={selectable} style={{ color: C.text, fontSize: 14 }}>
        {v}
      </Text>
    </View>
  );
}
