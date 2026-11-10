import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useApp } from '../../state/app.ts';
import { Card, Header, Screen } from '../../ui/components.tsx';
import { C } from '../../ui/theme.ts';

/**
 * In-app legal document screen with loading / loaded / error states.
 * Source: EXPO_PUBLIC_PRIVACY_URL / EXPO_PUBLIC_TERMS_URL when the owner
 * supplies them (plain text or HTML stripped to text); otherwise the bundled,
 * clearly labelled development placeholder.
 */
const URLS: Record<string, string | undefined> = {
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL || undefined,
  terms: process.env.EXPO_PUBLIC_TERMS_URL || undefined,
};

type State = { kind: 'loading' } | { kind: 'loaded'; text: string; placeholder: boolean } | { kind: 'error' };

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h\d|li|div)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function LegalDoc() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const kind = doc === 'terms' ? 'terms' : 'privacy';
  const { t } = useApp();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const url = URLS[kind];
    if (!url) {
      // small delay keeps the loading state observable and consistent with a fetched document
      await new Promise((r) => setTimeout(r, 250));
      setState({ kind: 'loaded', text: t(kind === 'terms' ? 'terms_body' : 'privacy_body'), placeholder: true });
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      setState({ kind: 'loaded', text: htmlToText(await res.text()), placeholder: false });
    } catch {
      setState({ kind: 'error' });
    }
  }, [kind, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen header={<Header title={t(kind === 'terms' ? 'terms' : 'privacy')} />}>
      {state.kind === 'loading' && (
        <View testID="legal-loading" style={{ alignItems: 'center', paddingTop: 60 }}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ color: C.sub, marginTop: 10 }}>{t('legal_loading')}</Text>
        </View>
      )}
      {state.kind === 'error' && (
        <View testID="legal-error" style={{ alignItems: 'center', paddingTop: 60 }}>
          <Text style={{ color: C.danger }}>{t('legal_error')}</Text>
          <Pressable onPress={load} style={{ marginTop: 12 }}>
            <Text style={{ color: C.primary, fontWeight: '700' }}>{t('retry')}</Text>
          </Pressable>
        </View>
      )}
      {state.kind === 'loaded' && (
        <>
          {state.placeholder && (
            <View testID="legal-placeholder" style={{ backgroundColor: C.warnSoft, borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: C.warn, fontWeight: '700' }}>{t('legal_dev_banner')}</Text>
            </View>
          )}
          <Card>
            <Text testID="legal-body" style={{ color: C.text, fontSize: 15, lineHeight: 23 }}>
              {state.text}
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}
