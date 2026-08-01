import React from 'react';
import { useSettingsView } from './SettingsViewContext';
import { SettingCard } from '../SettingCard';
import { DatabaseIcon } from '../icons/DatabaseIcon';
import { TrashIcon } from '../icons/TrashIcon';
import type { Settings } from '../../types';

const DisplayDefaultsCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <SettingCard
      icon={<DatabaseIcon className="w-6 h-6 text-brand-accent" />}
      title={t('settings.kb.display.title')}
      description={t('settings.kb.display.desc')}
    >
      <div className="space-y-6">
        <div>
          <label htmlFor="kb-view" className="block text-sm font-medium text-text-primary mb-1">
            {t('settings.kb.view')}
          </label>
          <select
            id="kb-view"
            value={tempSettings.knowledgeBase.defaultView}
            onChange={(e) =>
              setTempSettings((s) => ({
                ...s,
                knowledgeBase: {
                  ...s.knowledgeBase,
                  defaultView: e.target.value as Settings['knowledgeBase']['defaultView'],
                },
              }))
            }
            className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="grid">{t('settings.kb.view.grid')}</option>
            <option value="list">{t('settings.kb.view.list')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="kb-sort" className="block text-sm font-medium text-text-primary mb-1">
            {t('settings.kb.sort')}
          </label>
          <select
            id="kb-sort"
            value={tempSettings.knowledgeBase.defaultSort}
            onChange={(e) =>
              setTempSettings((s) => ({
                ...s,
                knowledgeBase: {
                  ...s.knowledgeBase,
                  defaultSort: e.target.value as Settings['knowledgeBase']['defaultSort'],
                },
              }))
            }
            className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="relevance">{t('settings.kb.sort.relevance')}</option>
            <option value="newest">{t('settings.kb.sort.newest')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="kb-page" className="block text-sm font-medium text-text-primary mb-1">
            {t('settings.kb.per_page')}
          </label>
          <select
            id="kb-page"
            value={tempSettings.knowledgeBase.articlesPerPage}
            onChange={(e) =>
              setTempSettings((s) => ({
                ...s,
                knowledgeBase: {
                  ...s.knowledgeBase,
                  articlesPerPage: parseInt(
                    e.target.value,
                    10,
                  ) as Settings['knowledgeBase']['articlesPerPage'],
                },
              }))
            }
            className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </SettingCard>
  );
};

const CleaningToolsCard: React.FC = () => {
  const { setModalState, t } = useSettingsView();
  return (
    <SettingCard
      title={t('settings.kb.cleaning.title')}
      description={t('settings.kb.cleaning.desc')}
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setModalState({ type: 'merge' })}
          className="w-full text-left p-3 rounded-md bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          <h4 className="font-semibold text-text-primary">{t('settings.kb.merge.title')}</h4>
          <p className="text-xs text-text-secondary mt-1">{t('settings.kb.merge.desc')}</p>
        </button>
        <button
          type="button"
          onClick={() => setModalState({ type: 'prune' })}
          className="w-full text-left p-3 rounded-md bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          <h4 className="font-semibold text-text-primary">{t('settings.kb.prune.title')}</h4>
          <p className="text-xs text-text-secondary mt-1">{t('settings.kb.prune.desc')}</p>
        </button>
      </div>
    </SettingCard>
  );
};

const PresetsCard: React.FC = () => {
  const { presets, setModalState, t } = useSettingsView();
  return (
    <SettingCard title={t('settings.kb.presets.title')} description={t('settings.kb.presets.desc')}>
      {presets.length > 0 ? (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between p-2 bg-surface rounded-md border border-border"
            >
              <span className="text-sm font-medium text-text-primary">{preset.name}</span>
              <button
                type="button"
                onClick={() => setModalState({ type: 'deletePreset', data: preset })}
                className="p-1.5 rounded-full text-text-secondary hover:bg-surface-hover hover:text-red-400"
                aria-label={t('settings.kb.presets.delete_aria', { name: preset.name })}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary italic">{t('settings.kb.presets.empty')}</p>
      )}
    </SettingCard>
  );
};

export const KnowledgeBaseSettingsTab: React.FC = () => (
  <div className="space-y-8">
    <DisplayDefaultsCard />
    <CleaningToolsCard />
    <PresetsCard />
  </div>
);
