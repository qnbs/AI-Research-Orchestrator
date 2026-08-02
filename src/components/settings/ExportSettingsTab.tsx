import React from 'react';
import { useSettingsView } from './SettingsViewContext';
import { SettingCard } from '../SettingCard';
import { Toggle } from '../Toggle';
import { ExportIcon } from '../icons/ExportIcon';
import { CSV_EXPORT_COLUMNS, type CsvExportColumn } from '../../types';
import type { Settings } from '../../types';
import type { TranslationKey } from '../../i18n/translations';

const CSV_COLUMN_LABEL_KEYS: Record<CsvExportColumn, TranslationKey> = {
  pmid: 'settings.export.csv.column.pmid',
  pmcId: 'settings.export.csv.column.pmcId',
  title: 'settings.export.csv.column.title',
  authors: 'settings.export.csv.column.authors',
  journal: 'settings.export.csv.column.journal',
  pubYear: 'settings.export.csv.column.pubYear',
  summary: 'settings.export.csv.column.summary',
  aiSummary: 'settings.export.csv.column.aiSummary',
  relevanceScore: 'settings.export.csv.column.relevanceScore',
  relevanceExplanation: 'settings.export.csv.column.relevanceExplanation',
  keywords: 'settings.export.csv.column.keywords',
  customTags: 'settings.export.csv.column.customTags',
  sourceTitle: 'settings.export.csv.column.sourceTitle',
  isOpenAccess: 'settings.export.csv.column.isOpenAccess',
  articleType: 'settings.export.csv.column.articleType',
  URL: 'settings.export.csv.column.URL',
  PMCID_URL: 'settings.export.csv.column.PMCID_URL',
};

const usePdfPatch = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  const pdf = tempSettings.export.pdf;
  const setPdf = (patch: Partial<Settings['export']['pdf']>) =>
    setTempSettings((s) => ({
      ...s,
      export: { ...s.export, pdf: { ...s.export.pdf, ...patch } },
    }));
  return { pdf, setPdf, t };
};

const PdfLayoutToggles: React.FC = () => {
  const { pdf, setPdf, t } = usePdfPatch();
  return (
    <>
      <Toggle checked={pdf.includeCoverPage} onChange={(c) => setPdf({ includeCoverPage: c })}>
        {t('settings.export.pdf.cover')}
      </Toggle>
      <Toggle checked={pdf.includeToc} onChange={(c) => setPdf({ includeToc: c })}>
        {t('settings.export.pdf.toc')}
      </Toggle>
      <Toggle checked={pdf.includeHeader} onChange={(c) => setPdf({ includeHeader: c })}>
        {t('settings.export.pdf.header')}
      </Toggle>
      <Toggle checked={pdf.includeFooter} onChange={(c) => setPdf({ includeFooter: c })}>
        {t('settings.export.pdf.footer')}
      </Toggle>
    </>
  );
};

const PdfPreparedForField: React.FC = () => {
  const { pdf, setPdf, t } = usePdfPatch();
  return (
    <div className="pt-4 border-t border-border">
      <label htmlFor="pdf-preparedFor" className="block text-sm font-medium text-text-primary mb-1">
        {t('settings.export.pdf.prepared_for')}
      </label>
      <input
        id="pdf-preparedFor"
        type="text"
        value={pdf.preparedFor}
        onChange={(e) => setPdf({ preparedFor: e.target.value })}
        className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
      />
    </div>
  );
};

const PdfSectionsField: React.FC = () => {
  const { pdf, setPdf, t } = usePdfPatch();
  return (
    <fieldset className="pt-4 border-t border-border space-y-3">
      <legend className="text-sm font-medium text-text-primary mb-2">
        {t('settings.export.pdf.sections')}
      </legend>
      <Toggle checked={pdf.includeSynthesis} onChange={(c) => setPdf({ includeSynthesis: c })}>
        {t('settings.export.pdf.synthesis')}
      </Toggle>
      <Toggle checked={pdf.includeInsights} onChange={(c) => setPdf({ includeInsights: c })}>
        {t('settings.export.pdf.insights')}
      </Toggle>
      <Toggle checked={pdf.includeQueries} onChange={(c) => setPdf({ includeQueries: c })}>
        {t('settings.export.pdf.queries')}
      </Toggle>
    </fieldset>
  );
};

const PdfExportCard: React.FC = () => {
  const { t } = useSettingsView();
  return (
    <SettingCard
      icon={<ExportIcon className="w-6 h-6 text-brand-primary" />}
      title={t('settings.export.pdf.title')}
      description={t('settings.export.pdf.desc')}
    >
      <div className="space-y-4">
        <PdfLayoutToggles />
        <PdfPreparedForField />
        <PdfSectionsField />
      </div>
    </SettingCard>
  );
};

const CsvDelimiterField: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <div>
      <label htmlFor="csv-delimiter" className="block text-sm font-medium text-text-primary mb-1">
        {t('settings.export.csv.delimiter')}
      </label>
      <select
        id="csv-delimiter"
        value={tempSettings.export.csv.delimiter}
        onChange={(e) =>
          setTempSettings((s) => ({
            ...s,
            export: {
              ...s.export,
              csv: {
                ...s.export.csv,
                delimiter: e.target.value as Settings['export']['csv']['delimiter'],
              },
            },
          }))
        }
        className="block w-full max-w-xs bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        <option value=",">{t('settings.export.csv.delimiter.comma')}</option>
        <option value=";">{t('settings.export.csv.delimiter.semicolon')}</option>
        <option value={'\t'}>{t('settings.export.csv.delimiter.tab')}</option>
      </select>
    </div>
  );
};

const CsvColumnToggle: React.FC<{ col: CsvExportColumn }> = ({ col }) => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <Toggle
      checked={tempSettings.export.csv.columns.includes(col)}
      onChange={(checked) => {
        setTempSettings((s) => {
          const current = s.export.csv.columns;
          const columns = checked ? [...current, col] : current.filter((item) => item !== col);
          return {
            ...s,
            export: { ...s.export, csv: { ...s.export.csv, columns } },
          };
        });
      }}
    >
      {t(CSV_COLUMN_LABEL_KEYS[col])}
    </Toggle>
  );
};

const CsvColumnsField: React.FC = () => {
  const { handleSelectAllCsvColumns, handleDeselectAllCsvColumns, t } = useSettingsView();
  return (
    <fieldset className="pt-4 border-t border-border">
      <div className="flex justify-between items-center mb-2">
        <legend className="text-sm font-medium text-text-primary">
          {t('settings.export.csv.columns')}
        </legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAllCsvColumns}
            className="text-xs font-semibold text-brand-accent hover:underline"
          >
            {t('settings.export.csv.select_all')}
          </button>
          <button
            type="button"
            onClick={handleDeselectAllCsvColumns}
            className="text-xs font-semibold text-brand-accent hover:underline"
          >
            {t('settings.export.csv.deselect_all')}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CSV_EXPORT_COLUMNS.map((col) => (
          <CsvColumnToggle key={col} col={col} />
        ))}
      </div>
    </fieldset>
  );
};

const CsvExportCard: React.FC = () => {
  const { t } = useSettingsView();
  return (
    <SettingCard title={t('settings.export.csv.title')} description={t('settings.export.csv.desc')}>
      <div className="space-y-4">
        <CsvDelimiterField />
        <CsvColumnsField />
      </div>
    </SettingCard>
  );
};

const CitationExportCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  const citation = tempSettings.export.citation;
  const setCitation = (patch: Partial<Settings['export']['citation']>) =>
    setTempSettings((s) => ({
      ...s,
      export: { ...s.export, citation: { ...s.export.citation, ...patch } },
    }));

  return (
    <SettingCard
      title={t('settings.export.citation.title')}
      description={t('settings.export.citation.desc')}
    >
      <div className="space-y-3">
        <Toggle
          checked={citation.includeAbstract}
          onChange={(c) => setCitation({ includeAbstract: c })}
        >
          {t('settings.export.citation.abstract')}
        </Toggle>
        <Toggle
          checked={citation.includeKeywords}
          onChange={(c) => setCitation({ includeKeywords: c })}
        >
          {t('settings.export.citation.keywords')}
        </Toggle>
        <Toggle checked={citation.includeTags} onChange={(c) => setCitation({ includeTags: c })}>
          {t('settings.export.citation.tags')}
        </Toggle>
        <Toggle checked={citation.includePmcid} onChange={(c) => setCitation({ includePmcid: c })}>
          {t('settings.export.citation.pmcid')}
        </Toggle>
      </div>
    </SettingCard>
  );
};

export const ExportSettingsTab: React.FC = () => (
  <div className="space-y-8">
    <PdfExportCard />
    <CsvExportCard />
    <CitationExportCard />
  </div>
);
