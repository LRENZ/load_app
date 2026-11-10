import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { FxQuote } from '../core/fx.ts';
import type { CurrencyCode } from '../core/currency.ts';
import type { Translate } from '../i18n/index.ts';
import { kv, KEYS } from '../storage/kv.ts';

/**
 * Real Android notification permission + a local preview notification.
 * Remote push (FCM) is deferred: see NoOpRemoteMessagingProvider.
 */
export type PermissionState = 'granted' | 'denied' | 'blocked' | 'undetermined';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'fx_rate';

export async function permissionState(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  if (p.status === 'undetermined') return 'undetermined';
  return p.canAskAgain ? 'denied' : 'blocked';
}

export async function requestPermission(t: Translate): Promise<PermissionState> {
  await ensureChannel(t);
  const p = await Notifications.requestPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'denied' : 'blocked';
}

async function ensureChannel(t: Translate) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: t('notif_channel'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Posts the local preview with the latest currency pair and rate when one is cached. */
export async function showRatePreview(t: Translate): Promise<void> {
  await ensureChannel(t);
  const pair = kv.get<{ from: CurrencyCode; to: CurrencyCode } | null>(KEYS.lastFxPair, null) ?? { from: 'USD', to: 'EUR' };
  const q = kv.get<FxQuote | null>(KEYS.fxCache(pair.from, pair.to), null);
  const body = q
    ? t('notif_preview_body', { from: q.from, to: q.to, rate: q.rate.toFixed(4), date: q.date })
    : t('notif_preview_no_rate', { from: pair.from, to: pair.to });
  await Notifications.scheduleNotificationAsync({
    content: { title: t('notif_preview_title'), body, data: { kind: 'fx_preview' } },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}

export function openAppSettings() {
  void Linking.openSettings();
}
