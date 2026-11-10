import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { convertText, type ConverterTool } from '../../core/converters.ts';
import type { PlacementId } from '../../core/ads/types.ts';
import type { StringKey } from '../../i18n/index.ts';
import { useApp } from '../../state/app.ts';
import { Card, Header, Screen } from '../../ui/components.tsx';
import { ConvBox, SwapButton } from '../../ui/converterParts.tsx';
import { NativeAdSlot } from '../../ui/ads.tsx';

const META: Record<ConverterTool, { title: StringKey; units: [StringKey, StringKey]; placement: PlacementId }> = {
  temperature: { title: 'tool_temperature', units: ['unit_c', 'unit_f'], placement: 'NA_TEMPERATURE' },
  mass: { title: 'tool_mass', units: ['unit_kg', 'unit_lb'], placement: 'NA_MASS_CONVERTER' },
  speed: { title: 'tool_speed', units: ['unit_kmh', 'unit_mph'], placement: 'NA_SPEED_CONVERTER' },
  length: { title: 'tool_length', units: ['unit_m', 'unit_ft'], placement: 'NA_LENGTH_CONVERTER' },
};

export default function Converter() {
  const params = useLocalSearchParams<{ tool: string }>();
  const tool = (params.tool in META ? params.tool : 'temperature') as ConverterTool;
  const meta = META[tool];
  const { t } = useApp();
  const [forward, setForward] = useState(true);
  const [input, setInput] = useState('');
  const { state, output } = convertText(tool, input, forward);
  const [fromUnit, toUnit] = forward ? meta.units : [meta.units[1], meta.units[0]];
  const error = state.kind === 'error' ? t(`tool_err_${state.error}` as StringKey) : null;

  return (
    <Screen header={<Header title={t(meta.title)} />}>
      <Card>
        <ConvBox
          caption={t('from')}
          unit={t(fromUnit)}
          testID="conv-input"
          error={error}
          inputProps={{
            value: input,
            onChangeText: (s) => setInput(s.replace(/,/g, '.')),
            placeholder: t('enter_value'),
            keyboardType: tool === 'temperature' ? 'numbers-and-punctuation' : 'decimal-pad',
            maxLength: 24,
          }}
        />
        <SwapButton
          label={t('swap')}
          onPress={() => {
            // swap direction and carry the current result into the input
            setForward((f) => !f);
            if (output) setInput(output);
          }}
        />
        <ConvBox caption={t('to')} unit={t(toUnit)} output={output} testID="conv-output" />
      </Card>
      <NativeAdSlot placement={meta.placement} screen={`tool_${tool}`} />
    </Screen>
  );
}
