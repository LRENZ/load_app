import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appStore, useApp } from '../state/app.ts';
import { analytics } from '../state/services.ts';
import { Icon, type IconName, snackbar } from '../ui/components.tsx';
import { withFullScreenAd } from '../ui/ads.tsx';
import { C } from '../ui/theme.ts';
import type { StringKey } from '../i18n/index.ts';

const PAGES: { icon: IconName; title: StringKey; desc: StringKey; tint: { bg: string; fg: string } }[] = [
  { icon: 'calculator-variant-outline', title: 'intro_1_title', desc: 'intro_1_desc', tint: C.tiles.mortgage },
  { icon: 'file-document-multiple-outline', title: 'intro_2_title', desc: 'intro_2_desc', tint: C.tiles.business },
  { icon: 'swap-horizontal-circle-outline', title: 'intro_3_title', desc: 'intro_3_desc', tint: C.tiles.auto },
];

/**
 * Three-page product intro shown on first launch. Completion is saved before
 * the onboarding-complete opportunity runs, so a failed ad never loses it.
 */
export default function Intro() {
  const { t } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const list = useRef<FlatList>(null);
  const finishing = useRef(false);

  const finish = (how: 'start' | 'skip') => {
    if (finishing.current) return;
    if (!appStore.completeIntro()) {
      snackbar.show(t('intro_save_failed'));
      return;
    }
    finishing.current = true;
    analytics.track('intro_complete', { how, page: page + 1 });
    withFullScreenAd('IV_ONBOARDING_COMPLETE', 'intro', () => router.replace('/'));
  };

  const goTo = (i: number) => {
    list.current?.scrollToIndex({ index: i, animated: true });
    setPage(i);
  };

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page > 0) {
        goTo(page - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={s.top}>
        {page < PAGES.length - 1 ? (
          <Pressable testID="intro-skip" onPress={() => finish('skip')} hitSlop={10}>
            <Text style={s.skip}>{t('skip')}</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>
      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.title}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index }) => (
          <View style={[s.page, { width }]} testID={`intro-page-${index + 1}`}>
            <View style={[s.hero, { backgroundColor: item.tint.bg }]}>
              <Icon name={item.icon} size={110} color={item.tint.fg} />
            </View>
            <Text style={s.title}>{t(item.title)}</Text>
            <Text style={s.desc}>{t(item.desc)}</Text>
          </View>
        )}
      />
      <View style={s.dots} accessibilityLabel={t('intro_page', { n: page + 1, total: PAGES.length })}>
        {PAGES.map((_, i) => (
          <View key={i} style={[s.dot, i === page && s.dotOn]} />
        ))}
      </View>
      <Pressable
        testID={page === PAGES.length - 1 ? 'intro-start' : 'intro-next'}
        onPress={() => (page === PAGES.length - 1 ? finish('start') : goTo(page + 1))}
        style={s.cta}
      >
        <Text style={s.ctaText}>{page === PAGES.length - 1 ? t('start') : t('next')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  top: { height: 52, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20 },
  skip: { color: C.sub, fontSize: 16, fontWeight: '600' },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  hero: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, textAlign: 'center' },
  desc: { fontSize: 16, color: C.sub, textAlign: 'center', marginTop: 12, lineHeight: 23 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D3DAE6' },
  dotOn: { width: 24, backgroundColor: C.primary },
  cta: { marginHorizontal: 24, height: 54, borderRadius: 999, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
