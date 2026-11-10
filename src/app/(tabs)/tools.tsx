import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StringKey } from '../../i18n/index.ts';
import { useApp } from '../../state/app.ts';
import { Icon, type IconName } from '../../ui/components.tsx';
import { C } from '../../ui/theme.ts';

const TOOL_LIST: { id: string; path: string; title: StringKey; sub: StringKey; icon: IconName; tint: { bg: string; fg: string } }[] = [
  { id: 'fx', path: '/tools/exchange', title: 'tool_fx', sub: 'tool_fx_sub', icon: 'currency-usd', tint: C.tools.fx },
  { id: 'temperature', path: '/tools/temperature', title: 'tool_temperature', sub: 'tool_temperature_sub', icon: 'thermometer', tint: C.tools.temperature },
  { id: 'mass', path: '/tools/mass', title: 'tool_mass', sub: 'tool_mass_sub', icon: 'weight-kilogram', tint: C.tools.mass },
  { id: 'speed', path: '/tools/speed', title: 'tool_speed', sub: 'tool_speed_sub', icon: 'speedometer', tint: C.tools.speed },
  { id: 'length', path: '/tools/length', title: 'tool_length', sub: 'tool_length_sub', icon: 'ruler', tint: C.tools.length },
  { id: 'clock', path: '/tools/clock', title: 'tool_clock', sub: 'tool_clock_sub', icon: 'earth', tint: C.tools.clock },
];

export default function Tools() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 32 }}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t('tools_title')}</Text>
          <Text style={s.sub}>{t('tools_subtitle')}</Text>
        </View>
        <View style={s.headIcon}>
          <Icon name="calculator-variant-outline" size={32} color={C.primary} />
        </View>
      </View>
      <View style={s.grid}>
        {TOOL_LIST.map((tool) => (
          <Pressable
            key={tool.id}
            testID={`tool-${tool.id}`}
            accessibilityRole="button"
            onPress={() => router.push(tool.path as never)}
            style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
          >
            <View style={s.cardTop}>
              <View style={[s.icon, { backgroundColor: tool.tint.bg }]}>
                <Icon name={tool.icon} size={24} color={tool.tint.fg} />
              </View>
              <Icon name="chevron-right" size={20} color={C.faint} />
            </View>
            <Text style={s.cardTitle}>{t(tool.title)}</Text>
            <Text style={s.cardSub}>{t(tool.sub)}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 4 },
  headIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48.4%', backgroundColor: '#fff', borderRadius: 18, padding: 14, minHeight: 130 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 12 },
  cardSub: { fontSize: 12, color: C.sub, marginTop: 4 },
});
