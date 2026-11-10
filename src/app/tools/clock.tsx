import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CLOCK_CITIES, dateIn, timeIn } from '../../core/worldClock.ts';
import type { StringKey } from '../../i18n/index.ts';
import { useApp } from '../../state/app.ts';
import { Card, Header, Icon, Screen } from '../../ui/components.tsx';
import { NativeAdSlot } from '../../ui/ads.tsx';
import { C } from '../../ui/theme.ts';

export default function WorldClock() {
  const { t } = useApp();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // tick at the start of every minute
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const ms = 60_000 - (Date.now() % 60_000) + 50;
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, ms);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  const local = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return (
    <Screen header={<Header title={t('tool_clock')} />}>
      <Text style={s.local}>{t('clock_local', { time: local })}</Text>
      {CLOCK_CITIES.map((c) => {
        const d = dateIn(c.zone, now);
        return (
          <Card key={c.key} style={s.row}>
            <View style={s.icon}>
              <Icon name="clock-outline" color={C.tools.clock.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.city}>{t(`city_${c.key}` as StringKey)}</Text>
              <Text style={s.zone}>
                {c.zone}
                {d !== localDate ? ` · ${d}` : ''}
              </Text>
            </View>
            <Text testID={`clock-${c.key}`} style={s.time}>
              {timeIn(c.zone, now)}
            </Text>
          </Card>
        );
      })}
      <NativeAdSlot placement="NA_WORLD_CLOCK" screen="tool_clock" />
    </Screen>
  );
}

const s = StyleSheet.create({
  local: { color: C.sub, marginBottom: 10, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.tools.clock.bg, alignItems: 'center', justifyContent: 'center' },
  city: { fontSize: 16, fontWeight: '700', color: C.text },
  zone: { fontSize: 12, color: C.sub, marginTop: 2 },
  time: { fontSize: 28, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
});
