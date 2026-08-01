import React from 'react';
import { useSettingsView } from './SettingsViewContext';
import { SettingCard } from '../SettingCard';
import { Toggle } from '../Toggle';
import { Tooltip } from '../Tooltip';
import { GlobeAltIcon } from '../icons/GlobeAltIcon';
import { SunIcon } from '../icons/SunIcon';
import { MoonIcon } from '../icons/MoonIcon';
import { InfoIcon } from '../icons/InfoIcon';
import { InstallIcon } from '../icons/InstallIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { BellIcon } from '../icons/BellIcon';
import { CogIcon } from '../icons/CogIcon';
import type { Settings } from '../../types';

const LanguageSettingsCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <SettingCard
      icon={<GlobeAltIcon className="w-6 h-6 text-brand-accent" />}
      title={t('settings.language')}
      description={t('settings.language.desc')}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={() => setTempSettings((s) => ({ ...s, appLanguage: 'en' }))}
          className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${tempSettings.appLanguage === 'en' ? 'border-brand-accent bg-brand-accent/5' : 'border-border hover:border-brand-accent/50'}`}
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
            EN
          </div>
          <div className="text-left">
            <span className="block font-medium text-text-primary">{t('settings.language.en')}</span>
            <span className="block text-xs text-text-secondary">
              {t('settings.language.en_hint')}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTempSettings((s) => ({ ...s, appLanguage: 'de' }))}
          className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${tempSettings.appLanguage === 'de' ? 'border-brand-accent bg-brand-accent/5' : 'border-border hover:border-brand-accent/50'}`}
        >
          <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-xs">
            DE
          </div>
          <div className="text-left">
            <span className="block font-medium text-text-primary">{t('settings.language.de')}</span>
            <span className="block text-xs text-text-secondary">
              {t('settings.language.de_hint')}
            </span>
          </div>
        </button>
      </div>
    </SettingCard>
  );
};

const CustomColorField: React.FC<{
  colorType: 'primary' | 'secondary' | 'accent';
}> = ({ colorType }) => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  const colorLabel = t(`settings.appearance.color.${colorType}`);
  const setColor = (value: string) =>
    setTempSettings((s) => ({
      ...s,
      appearance: {
        ...s.appearance,
        customColors: { ...s.appearance.customColors, [colorType]: value },
      },
    }));

  return (
    <div>
      <label htmlFor={`color-${colorType}`} className="block text-sm font-medium text-text-primary">
        {colorLabel}
      </label>
      <div className="mt-1 flex items-center gap-2 p-1.5 border border-border rounded-md bg-surface">
        <input
          type="color"
          id={`color-${colorType}`}
          value={tempSettings.appearance.customColors[colorType]}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
          aria-label={t('settings.appearance.color.picker_aria', { color: colorLabel })}
        />
        <input
          type="text"
          value={tempSettings.appearance.customColors[colorType]}
          onChange={(e) => setColor(e.target.value)}
          className="block w-full bg-transparent border-none focus-ring-aa sm:text-sm font-mono"
          aria-label={t('settings.appearance.color.hex_aria', { color: colorLabel })}
        />
      </div>
    </div>
  );
};

const AppearanceSettingsCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <SettingCard
      icon={<SunIcon className="w-6 h-6 text-accent-amber" />}
      title={t('settings.appearance')}
      description={t('settings.appearance.desc')}
    >
      <div className="flex items-center flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTempSettings((s) => ({ ...s, theme: 'light' }))}
          className={`p-2 rounded-lg border-2 ${tempSettings.theme === 'light' ? 'border-brand-accent' : 'border-transparent'}`}
          aria-label={t('settings.theme.light_aria')}
        >
          <div className="w-20 h-12 bg-[#eef3f7] rounded-md flex items-center justify-center border border-border">
            <SunIcon className="h-6 w-6 text-warning" />
          </div>
          <span className="text-sm mt-1 block text-text-primary">{t('settings.theme.light')}</span>
        </button>
        <button
          type="button"
          onClick={() => setTempSettings((s) => ({ ...s, theme: 'dark' }))}
          className={`p-2 rounded-lg border-2 ${tempSettings.theme === 'dark' ? 'border-brand-accent' : 'border-transparent'}`}
          aria-label={t('settings.theme.dark_aria')}
        >
          <div className="w-20 h-12 bg-[#070b12] rounded-md flex items-center justify-center border border-border">
            <MoonIcon className="h-6 w-6 text-brand-accent" />
          </div>
          <span className="text-sm mt-1 block text-text-primary">{t('settings.theme.dark')}</span>
        </button>
        <button
          type="button"
          onClick={() => setTempSettings((s) => ({ ...s, theme: 'matrix' }))}
          className={`p-2 rounded-lg border-2 ${tempSettings.theme === 'matrix' ? 'border-brand-accent' : 'border-transparent'}`}
          aria-label={t('settings.theme.matrix_aria')}
        >
          <div className="w-20 h-12 bg-[#020805] rounded-md flex items-center justify-center border border-success/40">
            <span className="text-success font-mono text-xs font-semibold">
              {t('settings.theme.matrix').toUpperCase()}
            </span>
          </div>
          <span className="text-sm mt-1 block text-text-primary">{t('settings.theme.matrix')}</span>
        </button>
      </div>
      <div className="pt-4 mt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="block text-sm font-medium text-text-primary">
            {t('settings.appearance.density')}
          </span>
          <Tooltip content={t('settings.appearance.density_tooltip')}>
            <InfoIcon className="h-4 w-4 text-text-secondary cursor-help" />
          </Tooltip>
        </div>
        <div
          className="flex w-full max-w-xs bg-surface p-1 rounded-lg border border-border"
          role="group"
          aria-label={t('settings.appearance.density')}
        >
          <button
            type="button"
            onClick={() =>
              setTempSettings((s) => ({
                ...s,
                appearance: { ...s.appearance, density: 'comfortable' },
              }))
            }
            aria-pressed={tempSettings.appearance.density === 'comfortable'}
            className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${tempSettings.appearance.density === 'comfortable' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface-hover'}`}
          >
            {t('settings.appearance.density.comfortable')}
          </button>
          <button
            type="button"
            onClick={() =>
              setTempSettings((s) => ({
                ...s,
                appearance: { ...s.appearance, density: 'compact' },
              }))
            }
            aria-pressed={tempSettings.appearance.density === 'compact'}
            className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${tempSettings.appearance.density === 'compact' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface-hover'}`}
          >
            {t('settings.appearance.density.compact')}
          </button>
        </div>
      </div>
      <div className="pt-4 mt-4 border-t border-border">
        <label htmlFor="font-family" className="block text-sm font-medium text-text-primary mb-2">
          {t('settings.font.label')}
        </label>
        <select
          id="font-family"
          value={tempSettings.appearance.fontFamily}
          onChange={(e) =>
            setTempSettings((s) => ({
              ...s,
              appearance: {
                ...s.appearance,
                fontFamily: e.target.value as Settings['appearance']['fontFamily'],
              },
            }))
          }
          className="block w-full max-w-xs bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="Figtree">{t('settings.font.figtree')}</option>
          <option value="Sora">{t('settings.font.sora')}</option>
          <option value="IBM Plex Sans">{t('settings.font.ibm_plex')}</option>
          <option value="JetBrains Mono">{t('settings.font.jetbrains')}</option>
          <option value="Inter">{t('settings.font.legacy_inter')}</option>
        </select>
      </div>
      <div className="pt-4 mt-4 border-t border-border">
        <Toggle
          checked={tempSettings.appearance.customColors.enabled}
          onChange={(checked) =>
            setTempSettings((s) => ({
              ...s,
              appearance: {
                ...s.appearance,
                customColors: { ...s.appearance.customColors, enabled: checked },
              },
            }))
          }
        >
          {t('settings.appearance.custom_colors')}
        </Toggle>
        {tempSettings.appearance.customColors.enabled ? (
          <div
            className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn"
            style={{ animationDuration: '300ms' }}
          >
            {(['primary', 'secondary', 'accent'] as const).map((colorType) => (
              <CustomColorField key={colorType} colorType={colorType} />
            ))}
          </div>
        ) : null}
      </div>
    </SettingCard>
  );
};

const PwaSettingsCard: React.FC = () => {
  const { handleInstallPwa, isPwaInstalled, installPromptEvent, t } = useSettingsView();

  let body: React.ReactNode;
  if (isPwaInstalled) {
    body = (
      <div className="flex items-center gap-3 text-green-400 font-medium">
        <CheckCircleIcon className="h-6 w-6" />
        <span>{t('settings.pwa.installed')}</span>
      </div>
    );
  } else if (installPromptEvent) {
    body = (
      <div>
        <button
          type="button"
          onClick={handleInstallPwa}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90"
        >
          <InstallIcon className="h-5 w-5 mr-2" />
          {t('settings.pwa.install_cta')}
        </button>
        <p className="text-xs text-text-secondary mt-2">{t('settings.pwa.install_hint')}</p>
      </div>
    );
  } else {
    body = (
      <div className="flex items-center gap-3 text-text-secondary text-sm">
        <InfoIcon className="h-5 w-5 flex-shrink-0" />
        <span>{t('settings.pwa.install_unavailable')}</span>
      </div>
    );
  }

  return (
    <SettingCard
      icon={<InstallIcon className="w-6 h-6 text-brand-accent" />}
      title={t('settings.pwa.title')}
      description={t('settings.pwa.desc')}
    >
      {body}
    </SettingCard>
  );
};

const NotificationsSettingsCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <SettingCard
      icon={<BellIcon className="w-6 h-6 text-accent-cyan" />}
      title={t('settings.notifications.title')}
      description={t('settings.notifications.desc')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="notif-pos" className="block text-sm font-medium text-text-primary mb-1">
            {t('settings.notifications.position')}
          </label>
          <select
            id="notif-pos"
            value={tempSettings.notifications.position}
            onChange={(e) =>
              setTempSettings((s) => ({
                ...s,
                notifications: {
                  ...s.notifications,
                  position: e.target.value as Settings['notifications']['position'],
                },
              }))
            }
            className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="bottom-right">
              {t('settings.notifications.position.bottom_right')}
            </option>
            <option value="bottom-left">{t('settings.notifications.position.bottom_left')}</option>
            <option value="top-right">{t('settings.notifications.position.top_right')}</option>
            <option value="top-left">{t('settings.notifications.position.top_left')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="notif-dur" className="block text-sm font-medium text-text-primary mb-1">
            {t('settings.notifications.duration')}
          </label>
          <input
            type="number"
            id="notif-dur"
            step="500"
            min="1000"
            value={tempSettings.notifications.duration}
            onChange={(e) =>
              setTempSettings((s) => ({
                ...s,
                notifications: { ...s.notifications, duration: parseInt(e.target.value, 10) },
              }))
            }
            className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
        </div>
      </div>
    </SettingCard>
  );
};

const PerformanceSettingsCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <SettingCard
      icon={<CogIcon className="w-6 h-6 text-text-secondary" />}
      title={t('settings.performance.title')}
      description={t('settings.performance.desc')}
    >
      <Toggle
        checked={tempSettings.performance.enableAnimations}
        onChange={(checked) =>
          setTempSettings((s) => ({
            ...s,
            performance: { ...s.performance, enableAnimations: checked },
          }))
        }
      >
        {t('settings.performance.enable_animations')}
      </Toggle>
    </SettingCard>
  );
};

export const GeneralSettingsTab: React.FC = () => (
  <div className="space-y-8">
    <LanguageSettingsCard />
    <AppearanceSettingsCard />
    <PwaSettingsCard />
    <NotificationsSettingsCard />
    <PerformanceSettingsCard />
  </div>
);
