import type { AdFormat, PlacementId } from './types.ts';
import type { AdFlags } from './config.ts';

export interface PlacementDef {
  id: PlacementId;
  format: AdFormat;
  trigger: string;
  /** false = configuration-only key: no UI container, never requested. */
  wired: boolean;
  /** Higher-level flag that must be true for the opportunity to be evaluated. */
  gate?: keyof AdFlags;
  note: string;
}

export const PLACEMENTS: PlacementDef[] = [
  { id: 'SP_APP_OPEN', format: 'app_open', trigger: 'app_start', wired: true, note: 'Startup app-open opportunity; continues immediately when nothing is cached.' },
  { id: 'IV_ONBOARDING_COMPLETE', format: 'interstitial', trigger: 'intro_start_or_skip', wired: true, note: 'After intro Start/Skip; completion is saved first.' },
  { id: 'NA_ONBOARDING', format: 'native', trigger: 'config_only', wired: false, note: 'Configuration key only; no container in the intro layout.' },
  { id: 'IV_ENTER_SECONDARY', format: 'interstitial', trigger: 'enter_secondary_page', wired: true, gate: 'layer2PageEnterEnabled', note: 'Gated by layer2PageEnterEnabled (false in the reference cache).' },
  { id: 'IV_CALCULATION_COMPLETE', format: 'interstitial', trigger: 'valid_calculate', wired: true, note: 'Only after validation + saved record; result always shown.' },
  { id: 'IV_RETURN_TO_HOME', format: 'interstitial', trigger: 'secondary_back_to_home', wired: true, gate: 'layer2PageExitEnabled', note: 'Leaving a secondary page for Home; not on Result → Form.' },
  { id: 'NA_HOME', format: 'native', trigger: 'home_visible', wired: true, note: 'Native slot under the loan tiles.' },
  { id: 'BA_HOME', format: 'banner', trigger: 'config_only', wired: false, note: 'Banner key exists but reference banner IDs are empty; no banner rendered.' },
  { id: 'NA_CALCULATOR_ACTIONS', format: 'native', trigger: 'form_visible', wired: true, note: 'Below Calculate / Reset.' },
  { id: 'NA_RESULT_DISCLAIMER', format: 'native', trigger: 'result_visible', wired: true, note: 'Below the result disclaimer.' },
  { id: 'NA_EXCHANGE_RATE', format: 'native', trigger: 'tool_visible', wired: true, note: 'Exchange-rate tool.' },
  { id: 'NA_TEMPERATURE', format: 'native', trigger: 'tool_visible', wired: true, note: 'Temperature tool.' },
  { id: 'NA_MASS_CONVERTER', format: 'native', trigger: 'tool_visible', wired: true, note: 'Mass tool.' },
  { id: 'NA_SPEED_CONVERTER', format: 'native', trigger: 'tool_visible', wired: true, note: 'Speed tool.' },
  { id: 'NA_LENGTH_CONVERTER', format: 'native', trigger: 'tool_visible', wired: true, note: 'Length tool.' },
  { id: 'NA_WORLD_CLOCK', format: 'native', trigger: 'tool_visible', wired: true, note: 'World clock tool.' },
  { id: 'IV_HOME_TAB', format: 'interstitial', trigger: 'home_tab_reselect', wired: true, note: 'Home tab pressed while already on Home (reselect semantics provisional).' },
  { id: 'IV_LANGUAGE_CONFIRM', format: 'interstitial', trigger: 'language_confirm', wired: true, note: 'After Confirm on the language page; language is committed first.' },
  { id: 'IV_CURRENCY_CONFIRM', format: 'interstitial', trigger: 'currency_confirm', wired: true, note: 'After Confirm in the currency picker; currency is committed first.' },
  { id: 'NA_LANGUAGE', format: 'native', trigger: 'language_visible', wired: true, note: 'Language page.' },
  { id: 'NA_CURRENCY', format: 'native', trigger: 'currency_visible', wired: true, note: 'Currency picker.' },
  { id: 'IV_EXIT_APP', format: 'interstitial', trigger: 'home_back_exit', wired: true, gate: 'adHomeExitEnabled', note: 'Back on Home; gated by adHomeExitEnabled (false in the reference cache).' },
  { id: 'IV_UNINSTALL_1', format: 'interstitial', trigger: 'not_built', wired: false, note: 'Uninstall-retention funnel intentionally not built in this app.' },
  { id: 'NA_UNINSTALL_1_BOTTOM', format: 'native', trigger: 'not_built', wired: false, note: 'Uninstall-retention funnel intentionally not built in this app.' },
  { id: 'NA_UNINSTALL_2_BOTTOM', format: 'native', trigger: 'not_built', wired: false, note: 'Uninstall-retention funnel intentionally not built in this app.' },
];

export function placement(id: PlacementId): PlacementDef {
  const p = PLACEMENTS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown placement ${id}`);
  return p;
}
