import React from 'react';
import type { TranslationKey } from '../../i18n/translations';

type EndpointValidation =
  | { status: 'empty' }
  | { status: 'invalid'; reason: string }
  | { status: 'csp'; origin: string }
  | { status: 'ok'; origin: string };

interface BaseUrlValidationAlertsProps {
  validation: EndpointValidation;
  approved?: string;
  needsApproval: boolean;
  onApprove: () => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

export const BaseUrlValidationAlerts: React.FC<BaseUrlValidationAlertsProps> = ({
  validation,
  approved,
  needsApproval,
  onApprove,
  t,
}) => (
  <>
    {validation.status === 'invalid' && (
      <p className="text-xs text-red-500 mt-1" role="alert">
        {t('settings.ai.base_url_invalid', { reason: validation.reason })}
      </p>
    )}
    {validation.status === 'csp' && (
      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1" role="alert">
        {t('settings.ai.base_url_csp_blocked', { origin: validation.origin })}
      </p>
    )}
    {needsApproval && validation.status === 'ok' && (
      <button
        type="button"
        className="mt-2 text-sm text-brand-accent underline focus:outline-none focus:ring-2 focus:ring-brand-accent rounded"
        onClick={onApprove}
      >
        {t('settings.ai.base_url_approve', { origin: validation.origin })}
      </button>
    )}
    {validation.status === 'ok' && approved === validation.origin && (
      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
        {t('settings.ai.base_url_approved', { origin: approved })}
      </p>
    )}
  </>
);
