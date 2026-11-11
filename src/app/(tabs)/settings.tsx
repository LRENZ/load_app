import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGUAGES } from '../../i18n/index.ts';
import { kv, KEYS } from '../../storage/kv.ts';
import { appStore, useApp } from '../../state/app.ts';
import { openAppSettings, permissionState, requestPermission, showRatePreview, type PermissionState } from '../../state/notifications.ts';
import Constants from 'expo-constants';
import { analytics, DEBUG_TOOLS } from '../../state/services.ts';
import { Icon, type IconName, snackbar } from '../../ui/components.tsx';
import { RatingDialog } from '../../ui/pickers.tsx';
import { C } from '../../ui/theme.ts';

/**
 * Store-review destination is not configured until the app has its own store
 * listing; submissions are kept locally (see FUTURE_INTEGRATIONS.md).
 */
function recordRating(stars: number) {
  const list = kv.get<{ stars: number; at: number }[]>(KEYS.ratings, []);
  list.push({ stars, at: Date.now() });
  kv.set(KEYS.ratings, list.slice(-50));
  analytics.track('rating_submit', { stars, destination: 'local_only' });
}

export default function Settings() {
  const { t, language, languagePref, notifEnabled } = useApp();
  const insets = useSafeAreaInsets();
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [rating, setRating] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void permissionState().then(setPerm);
    }, []),
  );

  // The switch shows ON only when the preference is on AND Android allows notifications.
  const switchOn = notifEnabled && perm === 'granted';

  const toggle = async (next: boolean) => {
    if (busy) return;
    if (!next) {
      appStore.setNotifEnabled(false);
      return;
    }
    setBusy(true);
    try {
      let p = await permissionState();
      if (p !== 'granted' && p !== 'blocked') p = await requestPermission(t);
      setPerm(p);
      if (p === 'granted') {
        appStore.setNotifEnabled(true);
        await showRatePreview(t);
      } else {
        appStore.setNotifEnabled(false);
        snackbar.show(t('notif_denied'), { label: t('notif_open_settings'), onPress: openAppSettings });
      }
    } finally {
      setBusy(false);
    }
  };

  const langLabel = (LANGUAGES.find((l) => l.code === language)?.label ?? 'English') + (languagePref === 'system' ? ` · ${t('auto')}` : '');

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 32 }}>
      <Text style={s.title}>{t('settings_title')}</Text>
      <View style={s.group}>
        <Row testID="settings-language" icon="translate" label={t('language')} value={langLabel} onPress={() => router.push('/language')} />
        <Row testID="settings-rate" icon="star-outline" label={t('rate_us')} onPress={() => setRating(true)} />
        <Row testID="settings-privacy" icon="shield-lock-outline" label={t('privacy')} onPress={() => router.push('/legal/privacy' as never)} />
        <Row testID="settings-terms" icon="file-document-outline" label={t('terms')} onPress={() => router.push('/legal/terms' as never)} last />
      </View>
      <View style={s.group}>
        <View style={s.row}>
          <View style={s.rowIcon}>
            <Icon name="bell-ring-outline" size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>{t('notif_title')}</Text>
            <Text style={s.rowDesc}>{t('notif_desc')}</Text>
            {notifEnabled && perm !== 'granted' && perm !== 'undetermined' && (
              <Pressable onPress={openAppSettings} hitSlop={6}>
                <Text style={s.warn}>
                  {t('notif_denied')} {t('notif_open_settings')} ›
                </Text>
              </Pressable>
            )}
          </View>
          <Switch
            testID="settings-notif-switch"
            value={switchOn}
            disabled={busy}
            onValueChange={(v) => void toggle(v)}
            trackColor={{ true: '#9DB8FF', false: '#D5DBE6' }}
            thumbColor={switchOn ? C.primary : '#fff'}
          />
        </View>
      </View>
      {DEBUG_TOOLS && (
        <View style={s.group}>
          <Row testID="settings-firebase" icon="fire" label="Developer: Firebase status" onPress={() => router.push('/diagnostics' as never)} />
          <Row testID="settings-debug" icon="bug-outline" label="Developer: ads, fixtures & traces" onPress={() => router.push('/debug' as never)} last />
        </View>
      )}
      {/* Long-press the version for Firebase diagnostics (FCM token, test crash report) in any build. */}
      <Pressable testID="settings-version" onLongPress={() => router.push('/diagnostics' as never)} delayLongPress={800} style={{ alignItems: 'center', paddingVertical: 12 }}>
        <Text style={{ color: C.sub, fontSize: 13 }}>Repayly {Constants.expoConfig?.version ?? ''}</Text>
      </Pressable>
      <RatingDialog
        visible={rating}
        t={t}
        onClose={() => setRating(false)}
        onSubmit={(stars) => {
          setRating(false);
          recordRating(stars);
          snackbar.show(t('rate_saved_dev', { n: stars }));
        }}
      />
    </ScrollView>
  );
}

function Row({ icon, label, value, onPress, last, testID }: { icon: IconName; label: string; value?: string; onPress: () => void; last?: boolean; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { opacity: 0.7 }]}>
      <View style={s.rowIcon}>
        <Icon name={icon} size={20} color={C.primary} />
      </View>
      <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
      <Icon name="chevron-right" size={22} color={C.faint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 16 },
  group: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 16, color: C.text, fontWeight: '600' },
  rowValue: { fontSize: 14, color: C.sub },
  rowDesc: { fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 18 },
  warn: { fontSize: 12, color: C.danger, marginTop: 6 },
});
