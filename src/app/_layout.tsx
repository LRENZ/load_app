import { Stack, router, usePathname } from 'expo-router';
import { useLocales } from 'expo-localization';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { kv, KEYS } from '../storage/kv.ts';
import { appStore, useApp } from '../state/app.ts';
import { ads, analytics, ensureAttribution, localCrash } from '../state/services.ts';
import { afterFirstScreen, trackScreen } from '../state/firebase.ts';
import { permissionState, requestPermission } from '../state/notifications.ts';
import { Dialog, PrimaryButton, SnackbarHost, TextButton } from '../ui/components.tsx';
import { MockInterstitialHost } from '../ui/ads.tsx';
import { C } from '../ui/theme.ts';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

type ErrorUtilsT = { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(h: (e: unknown, fatal?: boolean) => void): void };
const eu = (globalThis as unknown as { ErrorUtils?: ErrorUtilsT }).ErrorUtils;
if (eu) {
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    // Local list only: Crashlytics gets fatal JS errors from RNFB's own (chained) handler.
    localCrash.record(e, fatal ? 'fatal' : 'js');
    prev(e, fatal);
  });
}

export default function RootLayout() {
  const { introDone, t } = useApp();
  const pathname = usePathname();
  const started = useRef(false);
  const [prompt, setPrompt] = useState(false);

  // Startup: app-open opportunity (continues immediately with NoOp), then the intro gate.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    analytics.track('app_start', {});
    ads.showFullScreen('SP_APP_OPEN', 'splash').finally(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
      if (!appStore.get().introDone) router.replace('/intro');
    });
    // Traffic source (Play install referrer) → ad cohort; off the start-up path.
    void afterFirstScreen().then(() => ensureAttribution());
  }, []);

  // Device / per-app language changed while the app is open → follow it (when set to Use device language).
  const locales = useLocales();
  useEffect(() => {
    appStore.refreshFromDevice();
  }, [locales]);

  // Firebase Analytics screen views (ids collapsed: /result/42 → result/[id]).
  useEffect(() => {
    trackScreen(pathname);
  }, [pathname]);

  // First-run notification prompt (once), after the intro, only while undetermined.
  useEffect(() => {
    if (!introDone || kv.get<boolean>(KEYS.notifPrompted, false)) return;
    if (pathname !== '/') return;
    let cancelled = false;
    void permissionState().then((s) => {
      if (cancelled) return;
      // Android 13+ reports a never-asked permission as denied-but-askable.
      if (s === 'undetermined' || s === 'denied') setPrompt(true);
      else kv.set(KEYS.notifPrompted, true);
    });
    return () => {
      cancelled = true;
    };
  }, [introDone, pathname]);

  const closePrompt = () => {
    kv.set(KEYS.notifPrompted, true);
    setPrompt(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="intro" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
        <Dialog visible={prompt} onClose={closePrompt} testID="notif-prompt">
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 }}>{t('notif_prompt_title')}</Text>
          <Text style={{ fontSize: 15, color: C.sub, lineHeight: 21 }}>{t('notif_prompt_body')}</Text>
          <PrimaryButton
            testID="notif-prompt-allow"
            title={t('notif_prompt_allow')}
            onPress={async () => {
              closePrompt();
              const s = await requestPermission(t);
              appStore.setNotifEnabled(s === 'granted');
            }}
          />
          <View style={{ height: 4 }} />
          <TextButton testID="notif-prompt-later" title={t('notif_prompt_later')} onPress={closePrompt} />
        </Dialog>
        <SnackbarHost />
        <MockInterstitialHost />
      </SafeAreaProvider>
    </View>
  );
}
