export type ConverterTool = 'temperature' | 'mass' | 'speed' | 'length';

export type ToolInputError =
  | 'integer_too_long'
  | 'too_many_decimals'
  | 'negative_not_allowed'
  | 'invalid_character'
  | 'scientific_notation'
  | 'invalid';

export type ToolInputState =
  | { kind: 'empty' }
  | { kind: 'partial' } // a lone "-" while typing a negative temperature
  | { kind: 'error'; error: ToolInputError }
  | { kind: 'value'; value: number };

interface ToolSpec {
  maxInt: number;
  maxFrac: number;
  allowNegative: boolean;
  /** factor for the forward direction (A → B); temperature is special-cased */
  factor: number;
  outputDecimals: number;
  units: [string, string];
}

export const TOOL_SPECS: Record<ConverterTool, ToolSpec> = {
  temperature: { maxInt: 6, maxFrac: 2, allowNegative: true, factor: 0, outputDecimals: 2, units: ['°C', '°F'] },
  mass: { maxInt: 12, maxFrac: 4, allowNegative: false, factor: 2.20462, outputDecimals: 4, units: ['kg', 'lb'] },
  speed: { maxInt: 12, maxFrac: 4, allowNegative: false, factor: 0.621371, outputDecimals: 4, units: ['km/h', 'mph'] },
  length: { maxInt: 12, maxFrac: 4, allowNegative: false, factor: 3.28084, outputDecimals: 4, units: ['m', 'ft'] },
};

/** Input check in the same order as the reference tool validator. */
export function parseToolInput(raw: string, tool: ConverterTool): ToolInputState {
  const { maxInt, maxFrac, allowNegative } = TOOL_SPECS[tool];
  const s = raw.trim();
  if (s.length === 0) return { kind: 'empty' };
  if (/e/i.test(s)) return { kind: 'error', error: 'scientific_notation' };
  const neg = s.startsWith('-');
  if (neg && !allowNegative) return { kind: 'error', error: 'negative_not_allowed' };
  if (s === '-' && allowNegative) return { kind: 'partial' };
  const body = neg ? s.slice(1) : s;
  if (body.includes('-')) return { kind: 'error', error: 'invalid' };
  const parts = body.split('.');
  if (parts.length > 2) return { kind: 'error', error: 'invalid' };
  const [ip, fp] = [parts[0], parts.length === 2 ? parts[1] : null];
  if (ip.length > 0) {
    if (!/^[0-9]+$/.test(ip)) return { kind: 'error', error: 'invalid_character' };
    if (ip.length > maxInt) return { kind: 'error', error: 'integer_too_long' };
  }
  if (fp !== null) {
    if (fp.length > 0 && !/^[0-9]+$/.test(fp)) return { kind: 'error', error: 'invalid_character' };
    if (fp.length > maxFrac) return { kind: 'error', error: 'too_many_decimals' };
  }
  if (ip.length === 0 && (fp === null || fp.length === 0)) return { kind: 'error', error: 'invalid' };
  const v = Number(s);
  if (!Number.isFinite(v)) return { kind: 'error', error: 'invalid' };
  return { kind: 'value', value: v };
}

/** forward = first unit → second unit (°C→°F, kg→lb, km/h→mph, m→ft). */
export function convert(tool: ConverterTool, value: number, forward: boolean): number {
  if (tool === 'temperature') return forward ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
  const f = TOOL_SPECS[tool].factor;
  return forward ? value * f : value / f;
}

/** Half-up decimal formatting of a double, avoiding "-0.00". */
export function formatToolOutput(tool: ConverterTool, value: number): string {
  const d = TOOL_SPECS[tool].outputDecimals;
  const p = 10 ** d;
  const rounded = Math.sign(value) * Math.round(Math.abs(value) * p + 1e-9) / p;
  const out = (Object.is(rounded, -0) ? 0 : rounded).toFixed(d);
  return out === `-${(0).toFixed(d)}` ? (0).toFixed(d) : out;
}

export function convertText(tool: ConverterTool, raw: string, forward: boolean): { state: ToolInputState; output: string } {
  const state = parseToolInput(raw, tool);
  if (state.kind !== 'value') return { state, output: '' };
  return { state, output: formatToolOutput(tool, convert(tool, state.value, forward)) };
}
