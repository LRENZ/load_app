import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeAdLease } from '../core/ads/gateway.ts';
import type { MockPresentation } from '../core/ads/mockAdapter.ts';
import type { PlacementId } from '../core/ads/types.ts';
import { ads, mockAdapter, onGatewayChange } from '../state/services.ts';
import { useApp } from '../state/app.ts';
import { C } from './theme.ts';

function useGateway() {
  return useSyncExternalStore(onGatewayChange, () => ads, () => ads);
}

/**
 * Native placement. With the NoOp adapter (normal builds) it renders nothing,
 * keeping the unfilled layout. In debug mock mode it shows a clearly labelled
 * local mock card. A real provider native view replaces this later.
 */
export function NativeAdSlot({ placement, screen }: { placement: PlacementId; screen: string }) {
  const gw = useGateway();
  const [lease, setLease] = useState<NativeAdLease | null>(null);
  const { t } = useApp();

  useEffect(() => {
    let current: NativeAdLease | null = gw.leaseNative(placement, screen);
    let retry: ReturnType<typeof setTimeout> | null = null;
    if (!current && gw.mode === 'mock') {
      // the first visit triggers a preload; try once more when it may be ready
      retry = setTimeout(() => {
        current = gw.leaseNative(placement, screen);
        setLease(current);
      }, 1200);
    }
    setLease(current);
    return () => {
      if (retry) clearTimeout(retry);
      current?.dispose();
    };
  }, [gw, placement, screen]);

  useEffect(() => {
    lease?.impression();
  }, [lease]);

  if (!lease) return null;
  return (
    <Pressable testID={`mock-native-${placement}`} onPress={() => lease.click()} style={s.native}>
      <Text style={s.badge}>{t('mock_ad_label')}</Text>
      <Text style={s.nativeTitle}>
        {lease.ad.provider.toUpperCase()} · {placement}
      </Text>
      <Text style={s.nativeBody}>{t('mock_ad_body')}</Text>
    </Pressable>
  );
}

/** Renders mock full-screen ads (debug mock mode only). */
export function MockInterstitialHost() {
  const [cur, setCur] = useState<MockPresentation | null>(null);
  const { t } = useApp();
  useEffect(() => {
    mockAdapter.presenter = (p) => setCur(p);
    return () => {
      mockAdapter.presenter = null;
    };
  }, []);
  if (!cur) return null;
  const close = () => {
    const c = cur;
    setCur(null);
    c.close();
  };
  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View testID="mock-interstitial" style={s.full}>
        <Text style={s.fullBadge}>{t('mock_ad_label')}</Text>
        <Text style={s.fullTitle}>
          {cur.ad.provider.toUpperCase()} · {cur.ad.format}
        </Text>
        <Text style={s.fullPlacement}>{cur.placementId}</Text>
        <Text style={s.fullBody}>{t('mock_ad_body')}</Text>
        <Pressable testID="mock-interstitial-click" onPress={() => cur.click()} style={s.fullClick}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Simulate click</Text>
        </Pressable>
        <Pressable testID="mock-interstitial-close" onPress={close} style={s.fullClose}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{t('mock_ad_close')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** Runs a full-screen opportunity, then the continuation exactly once. */
export function withFullScreenAd(placement: PlacementId, screen: string, next: () => void) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    next();
  };
  ads.showFullScreen(placement, screen).then(go, go);
}

const s = StyleSheet.create({
  native: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#F08C00', backgroundColor: '#FFF8EC', borderRadius: 14, padding: 12, marginVertical: 10 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#F08C00', color: '#fff', fontWeight: '800', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  nativeTitle: { fontWeight: '700', color: C.text },
  nativeBody: { color: C.sub, fontSize: 12, marginTop: 2 },
  full: { flex: 1, backgroundColor: '#FFF8EC', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fullBadge: { backgroundColor: '#F08C00', color: '#fff', fontWeight: '800', fontSize: 16, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  fullTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 20 },
  fullPlacement: { fontSize: 14, color: C.sub, marginTop: 6 },
  fullBody: { textAlign: 'center', color: C.sub, marginTop: 16 },
  fullClick: { marginTop: 28, backgroundColor: '#F08C00', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  fullClose: { marginTop: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
});
