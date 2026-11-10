import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Icon } from './components.tsx';
import { C, R } from './theme.ts';

/** Labelled From/To box used by every converter. */
export function ConvBox({
  caption,
  unit,
  onUnitPress,
  inputProps,
  output,
  testID,
  error,
}: {
  caption: string;
  unit: string;
  onUnitPress?: () => void;
  inputProps?: TextInputProps;
  output?: string;
  testID?: string;
  error?: string | null;
}) {
  return (
    <View style={s.box}>
      <Text style={s.caption}>{caption}</Text>
      <Pressable disabled={!onUnitPress} onPress={onUnitPress} style={s.unitRow} testID={testID ? `${testID}-unit` : undefined}>
        <Text style={s.unit}>{unit}</Text>
        {onUnitPress && <Icon name="menu-down" size={20} color={C.sub} />}
      </Pressable>
      {inputProps ? (
        <TextInput testID={testID} placeholderTextColor={C.faint} style={[s.input, error ? s.inputErr : null]} {...inputProps} />
      ) : (
        <View style={[s.input, s.output]}>
          <Text testID={testID} style={s.outputText} numberOfLines={1} adjustsFontSizeToFit>
            {output || '—'}
          </Text>
        </View>
      )}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function SwapButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <View style={s.swapWrap}>
      <Pressable testID="swap" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.swap, pressed && { opacity: 0.8 }]}>
        <Icon name="swap-vertical" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginBottom: 4 },
  caption: { fontSize: 13, color: C.sub, fontWeight: '600', marginBottom: 6 },
  unitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  unit: { fontSize: 16, fontWeight: '700', color: C.text },
  input: { backgroundColor: C.inputBg, borderRadius: R.input, minHeight: 52, paddingHorizontal: 14, fontSize: 20, color: C.text, borderWidth: 1.5, borderColor: 'transparent' },
  inputErr: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  output: { justifyContent: 'center' },
  outputText: { fontSize: 20, color: C.primary, fontWeight: '700' },
  error: { color: C.danger, fontSize: 13, marginTop: 6 },
  swapWrap: { alignItems: 'center', marginVertical: 10 },
  swap: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
