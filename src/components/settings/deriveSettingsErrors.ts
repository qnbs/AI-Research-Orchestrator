import type { Settings } from '../../types';
import { isOriginCspAllowed, validateCustomEndpointUrl } from '../../lib/endpointPolicy';

export type SettingsFormErrors = {
  formDefaults?: string;
  endpoint?: string;
};

type Translate = (key: string, params?: Record<string, string>) => string;

/** Live validation for the settings form (save is blocked when any error is set). */
export function deriveSettingsErrors(tempSettings: Settings, t: Translate): SettingsFormErrors {
  const maxScan = tempSettings.defaults.maxArticlesToScan;
  const topN = tempSettings.defaults.topNToSynthesize;
  const next: SettingsFormErrors = {};
  if (!Number.isFinite(maxScan) || !Number.isFinite(topN) || topN > maxScan) {
    next.formDefaults = t('settings.error.form_defaults');
  }
  const rawCustomUrl = tempSettings.ai.customBaseUrl ?? '';
  if (rawCustomUrl.length > 0 && rawCustomUrl.trim().length === 0) {
    next.endpoint = t('settings.ai.base_url_invalid', { reason: 'empty' });
  } else {
    const customUrl = rawCustomUrl.trim();
    if (customUrl) {
      const parsed = validateCustomEndpointUrl(customUrl);
      if (!parsed.ok) {
        next.endpoint = t('settings.ai.base_url_invalid', { reason: parsed.reason });
      } else if (!isOriginCspAllowed(parsed.origin)) {
        next.endpoint = t('settings.ai.base_url_csp_blocked', { origin: parsed.origin });
      } else if (tempSettings.ai.approvedEndpointOrigin !== parsed.origin) {
        next.endpoint = t('settings.error.endpoint_not_approved');
      }
    }
  }
  return next;
}
