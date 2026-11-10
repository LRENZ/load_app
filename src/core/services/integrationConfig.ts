import type { AdFormat, Provider } from '../ads/types.ts';

/**
 * Owner configuration for LATER real integrations. Every field is empty in
 * this phase; nothing reads these values to initialise an SDK yet. Fill them
 * through EXPO_PUBLIC_* variables or a secure config when the owner supplies
 * accounts (see FUTURE_INTEGRATIONS.md and .env.example).
 */
export interface IntegrationConfig {
  firebase: { projectId: string; androidAppId: string; googleServicesJsonPath: string };
  ads: {
    admobAppId: string;
    gamNetworkCode: string;
    pangleAppId: string;
    toponAppId: string;
    toponAppKey: string;
    applovinSdkKey: string;
    /** unit IDs by provider → format; placements map onto formats */
    units: Record<Provider, Partial<Record<AdFormat, string>>>;
    testDeviceIds: string[];
  };
  attribution: { adjustAppToken: string; environment: 'sandbox' | 'production' | '' };
  legal: { privacyUrl: string; termsUrl: string };
  store: { reviewUrl: string };
}

const env = (k: string): string => (process.env[k] ?? '').trim();

export function loadIntegrationConfig(): IntegrationConfig {
  return {
    firebase: { projectId: env('EXPO_PUBLIC_FIREBASE_PROJECT_ID'), androidAppId: env('EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID'), googleServicesJsonPath: '' },
    ads: {
      admobAppId: env('EXPO_PUBLIC_ADMOB_APP_ID'),
      gamNetworkCode: env('EXPO_PUBLIC_GAM_NETWORK_CODE'),
      pangleAppId: env('EXPO_PUBLIC_PANGLE_APP_ID'),
      toponAppId: env('EXPO_PUBLIC_TOPON_APP_ID'),
      toponAppKey: env('EXPO_PUBLIC_TOPON_APP_KEY'),
      applovinSdkKey: env('EXPO_PUBLIC_APPLOVIN_SDK_KEY'),
      units: { admob: {}, gam: {}, pangle: {}, topon: {}, max: {} },
      testDeviceIds: [],
    },
    attribution: { adjustAppToken: env('EXPO_PUBLIC_ADJUST_APP_TOKEN'), environment: '' },
    legal: { privacyUrl: env('EXPO_PUBLIC_PRIVACY_URL'), termsUrl: env('EXPO_PUBLIC_TERMS_URL') },
    store: { reviewUrl: env('EXPO_PUBLIC_STORE_REVIEW_URL') },
  };
}

/** True only when a value is a real, non-placeholder identifier. */
export function isConfigured(v: string): boolean {
  return v.length > 0 && !/^(x+|todo|placeholder|changeme|your[_-]?)/i.test(v);
}
