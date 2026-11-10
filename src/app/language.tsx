import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LANGUAGES, type Language } from '../i18n/index.ts';
import { appStore, useApp } from '../state/app.ts';
import { Card, Header, Icon, PrimaryButton, Screen } from '../ui/components.tsx';
import { NativeAdSlot, withFullScreenAd } from '../ui/ads.tsx';
import { C } from '../ui/theme.ts';

/** Selection is staged; only Confirm commits (Back discards). */
export default function LanguagePage() {
  const { t, language } = useApp();
  const [pending, setPending] = useState<Language>(language);
  return (
    <Screen header={<Header title={t('language')} />}>
      <Card>
        {LANGUAGES.map((l) => {
          const sel = l.code === pending;
          return (
            <Pressable
              key={l.code}
              testID={`lang-${l.code}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              onPress={() => setPending(l.code)}
              style={[s.row, sel && s.rowSel]}
            >
              <Text style={[s.label, sel && { color: C.primary }]}>{l.label}</Text>
              {sel && <Icon name="check-circle" color={C.primary} />}
            </Pressable>
          );
        })}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 54, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, marginBottom: 10 },
  rowSel: { borderColor: C.primary, backgroundColor: C.primarySoft },
  label: { fontSize: 16, fontWeight: '600', color: C.text },
});
