import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../state/app.ts';
import { Icon, type IconName } from '../../ui/components.tsx';
import { withFullScreenAd } from '../../ui/ads.tsx';
import { C } from '../../ui/theme.ts';

const TABS: { name: string; key: 'tab_home' | 'tab_tools' | 'tab_settings'; icon: IconName; iconOn: IconName }[] = [
  { name: 'index', key: 'tab_home', icon: 'home-outline', iconOn: 'home' },
  { name: 'tools', key: 'tab_tools', icon: 'toolbox-outline', iconOn: 'toolbox' },
  { name: 'settings', key: 'tab_settings', icon: 'cog-outline', iconOn: 'cog' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TabBar({ state, navigation }: any) {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {state.routes.map((route: { key: string; name: string }, i: number) => {
        const tab = TABS.find((x) => x.name === route.name);
        if (!tab) return null;
        const focused = state.index === i;
        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              if (focused) {
                // Home reselect is the configured home-tab opportunity.
                if (route.name === 'index') withFullScreenAd('IV_HOME_TAB', 'home', () => undefined);
                return;
              }
              navigation.navigate(route.name);
            }}
            style={s.item}
          >
            <Icon name={focused ? tab.iconOn : tab.icon} size={24} color={focused ? C.primary : C.faint} />
            <Text style={[s.label, { color: focused ? C.primary : C.faint }]} numberOfLines={1}>
              {t(tab.key)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tools" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
