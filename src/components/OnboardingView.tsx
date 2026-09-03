import React, { useEffect, useRef } from 'react';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { AppBrandMark } from './AppBrandMark';
import { useTranslation } from '../hooks/useTranslation';
import { useSettings } from '../contexts/SettingsContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { cycleTheme, selectCurrentTheme } from '../store/slices/themeSlice';
import type { View } from '../types/ui';

export interface OnboardingCompleteOptions {
  nextView?: View;
  prefillTopic?: string;
}

interface OnboardingViewProps {
  onComplete: (options?: OnboardingCompleteOptions) => void;
}

const StepCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="bg-surface/30 backdrop-blur-sm p-6 rounded-xl border border-border text-left shadow-lg h-full">
    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30 mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
    <p className="text-sm text-text-secondary leading-relaxed">{children}</p>
  </div>
);

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { t, lang } = useTranslation();
  const { updateSettings } = useSettings();
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector(selectCurrentTheme);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  const toggleLanguage = () =>
    updateSettings((prev) => ({ ...prev, appLanguage: prev.appLanguage === 'en' ? 'de' : 'en' }));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 80% at 10% -20%, var(--aurora-1), transparent), radial-gradient(ellipse 80% 80% at 90% -20%, var(--aurora-2), transparent)',
        }}
      />
      <div className="w-full max-w-4xl mx-auto text-center relative z-10 bg-surface/50 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-8 sm:p-12">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 py-2 text-xs font-bold text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-hover focus-ring-aa"
            aria-label={t('chrome.aria.toggle_language')}
          >
            <GlobeAltIcon className="h-4 w-4" />
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => dispatch(cycleTheme())}
            className="inline-flex items-center min-h-11 px-3 py-2 text-xs font-bold text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-hover focus-ring-aa"
            aria-label={
              currentTheme === 'dark'
                ? t('chrome.theme.switch_light')
                : currentTheme === 'light'
                  ? t('chrome.theme.switch_matrix')
                  : t('chrome.theme.switch_dark')
            }
          >
            {currentTheme === 'dark'
              ? t('settings.theme.light')
              : currentTheme === 'light'
                ? t('settings.theme.matrix')
                : t('settings.theme.dark')}
          </button>
        </div>

        <div className="mb-6 flex items-center justify-center">
          <AppBrandMark size="lg" showEmoji idPrefix="onboarding-logo" aria-hidden />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
          {t('onboarding.welcome_prefix')}{' '}
          <span className="brand-gradient-text">{t('onboarding.welcome_highlight')}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-text-secondary mb-4">
          {t('onboarding.subtitle')}
        </p>
        <p className="max-w-xl mx-auto text-sm text-text-secondary mb-10">
          {t('onboarding.modePreview')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
          <StepCard icon={<PencilIcon className="h-6 w-6" />} title={t('onboarding.step1.title')}>
            {t('onboarding.step1.desc')}
          </StepCard>
          <StepCard icon={<SparklesIcon className="h-6 w-6" />} title={t('onboarding.step2.title')}>
            {t('onboarding.step2.desc')}
          </StepCard>
          <StepCard icon={<DatabaseIcon className="h-6 w-6" />} title={t('onboarding.step3.title')}>
            {t('onboarding.step3.desc')}
          </StepCard>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            ref={primaryRef}
            type="button"
            onClick={() => onComplete()}
            className="inline-flex items-center min-h-11 px-8 py-3 border border-transparent text-base font-bold rounded-md shadow-lg text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-accent-cyan hover:shadow-xl hover:shadow-brand-accent/30 focus:outline-none focus-ring-aa focus:ring-offset-2 focus:ring-offset-background"
          >
            {t('onboarding.start')}
          </button>
          <button
            type="button"
            onClick={() =>
              onComplete({
                nextView: 'orchestrator',
                prefillTopic: t('onboarding.sampleTopic'),
              })
            }
            className="inline-flex items-center min-h-11 px-4 py-2 text-sm font-medium text-brand-accent hover:text-brand-secondary underline-offset-4 hover:underline focus-ring-aa rounded-md"
          >
            {t('onboarding.startSample')}
          </button>
        </div>
        <div className="mt-8 flex items-center justify-center text-xs text-text-secondary">
          <LockClosedIcon className="h-4 w-4 mr-2 shrink-0" />
          <p className="max-w-lg text-balance">{t('onboarding.privacy')}</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
