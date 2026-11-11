import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LANGUAGES } from '../i18n/index.ts';
import type { LanguagePref } from '../i18n/resolve.ts';
import { appStore, useApp } from '../state/app.ts';
import { Card, Header, Icon, PrimaryButton, Screen } from '../ui/components.tsx';
import { NativeAdSlot, withFullScreenAd } from '../ui/ads.tsx';
import { C } from '../ui/theme.ts';

/** Selection is staged; only Confirm commits (Back discards). "Use device language" is the default. */
export default function LanguagePage() {
  const { t, languagePref } = useApp();
  const [pending, setPending] = useState<LanguagePref>(languagePref);
  const deviceLabel = LANGUAGES.find((l) => l.code === appStore.deviceLanguage())?.label ?? 'English';

  const row = (code: LanguagePref, label: string, sub?: string, testID = `lang-${code}`) => {
    const sel = code === pending;
    return (
      <Pressable
        key={code}
        testID={testID}
        accessibilityRole="radio"
        accessibilityState={{ selected: sel }}
        onPress={() => setPending(code)}
        android_ripple={{ color: C.primarySoft }}
        style={[s.row, sel && s.rowSel, sub ? { height: 64 } : null]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.label, sel && { color: C.primary }]}>{label}</Text>
          {sub ? <Text style={s.sub}>{sub}</Text> : null}
        </View>
        {sel && <Icon name="check-circle" color={C.primary} />}
      </Pressable>
    );
  };

  return (
    <Screen header={<Header title={t('language')} />}>
      <Card>
        {row('system', t('language_system'), deviceLabel, 'lang-system')}
        {LANGUAGES.map((l) => row(l.code, l.label))}
      </Card>
      <NativeAdSlot placement="NA_LANGUAGE" screen="language" />
      <PrimaryButton
        testID="lang-confirm"
        title={t('confirm')}
        onPress={() => {
          appStore.setLanguage(pending);
          withFullScreenAd('IV_LANGUAGE_CONFIRM', 'language', () => router.back());
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 54, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, marginBottom: 10, overflow: 'hidden' },
  rowSel: { borderColor: C.primary, backgroundColor: C.primarySoft },
  label: { fontSize: 16, fontWeight: '600', color: C.text },
  sub: { fontSize: 13, color: C.sub, marginTop: 2 },
});
