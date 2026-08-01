import React from 'react';
import { useSettingsView } from './SettingsViewContext';
import { SettingCard } from '../SettingCard';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { TrashIcon } from '../icons/TrashIcon';

const StorageUsageCard: React.FC = () => {
  const { storageUsage, t } = useSettingsView();
  return (
    <SettingCard
      icon={<ShieldCheckIcon className="w-6 h-6 text-green-500" />}
      title={t('settings.data.storage.title')}
      description={t('settings.data.storage.desc')}
    >
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-base font-medium text-brand-accent">
            {t('settings.data.storage.used')}
          </span>
          <span className="text-sm font-medium text-text-primary">
            {t('settings.data.storage.quota', {
              used: storageUsage.totalMB,
              quota: storageUsage.quotaMB,
            })}
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-2.5">
          <div
            className="bg-brand-accent h-2.5 rounded-full"
            style={{ width: `${storageUsage.percentage}%` }}
          ></div>
        </div>
      </div>
    </SettingCard>
  );
};

const DataBackupCard: React.FC = () => {
  const {
    handleExportHistory,
    handleExportKnowledgeBase,
    fileInputRef,
    knowledgeBase,
    uniqueArticles,
    t,
  } = useSettingsView();
  return (
    <SettingCard
      title={t('settings.data.backup.title')}
      description={t('settings.data.backup.desc', {
        reports: knowledgeBase.length,
        articles: uniqueArticles.length,
      })}
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleExportHistory}
          className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          {t('settings.data.backup.export_history')}
        </button>
        <button
          type="button"
          onClick={handleExportKnowledgeBase}
          className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          {t('settings.data.backup.export_kb')}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          <UploadIcon className="h-4 w-4 mr-2" />
          {t('settings.data.backup.import')}
        </button>
      </div>
    </SettingCard>
  );
};

const SettingsBackupCard: React.FC = () => {
  const { handleExportSettings, settingsFileInputRef, t } = useSettingsView();
  return (
    <SettingCard
      title={t('settings.data.settings_backup.title')}
      description={t('settings.data.settings_backup.desc')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleExportSettings}
          className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          {t('settings.data.settings_backup.export')}
        </button>
        <button
          type="button"
          onClick={() => settingsFileInputRef.current?.click()}
          className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"
        >
          <UploadIcon className="h-4 w-4 mr-2" />
          {t('settings.data.settings_backup.import')}
        </button>
      </div>
    </SettingCard>
  );
};

const DangerZoneCard: React.FC = () => {
  const { setModalState, t } = useSettingsView();
  return (
    <SettingCard
      icon={<TrashIcon className="w-6 h-6 text-red-500" />}
      title={t('settings.data.danger.title')}
      description={t('settings.data.danger.desc')}
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setModalState({ type: 'clear' })}
          className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          {t('settings.data.danger.clear_kb')}
        </button>
        <button
          type="button"
          onClick={() => setModalState({ type: 'reset' })}
          className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          {t('settings.data.danger.reset')}
        </button>
      </div>
    </SettingCard>
  );
};

export const DataSettingsTab: React.FC = () => {
  const { fileInputRef, settingsFileInputRef, handleImport, handleImportSettings } =
    useSettingsView();

  return (
    <div className="space-y-8">
      <StorageUsageCard />
      <DataBackupCard />
      <SettingsBackupCard />
      <DangerZoneCard />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={settingsFileInputRef}
        onChange={handleImportSettings}
        accept=".json"
        className="hidden"
      />
    </div>
  );
};
