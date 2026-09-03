import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InputForm } from './InputForm';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

vi.mock('../contexts/PresetContext', () => ({
  usePresets: () => ({
    presets: [],
    addPreset: vi.fn(),
  }),
}));

vi.mock('../hooks/useFocusTrap', () => ({
  useFocusTrap: () => undefined,
}));

vi.mock('../contexts/UIContext', () => ({
  useUI: () => ({ setCurrentView: vi.fn() }),
}));

vi.mock('./ProviderStatusLine', () => ({
  ProviderStatusLine: () => null,
}));

const defaults = {
  maxArticlesToScan: 20,
  topNToSynthesize: 5,
  autoSaveReports: false,
  defaultDateRange: '5',
  defaultSynthesisFocus: 'overview',
  defaultArticleTypes: [] as string[],
};

describe('InputForm educationalDemoMode', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('defaults educationalDemoMode to unchecked when restored state omits it', () => {
    sessionStorage.setItem(
      'aiResearchFormState',
      JSON.stringify({
        researchTopic: 'topic',
        dateRange: '5',
        articleTypes: [],
        synthesisFocus: 'overview',
        maxArticlesToScan: 20,
        topNToSynthesize: 5,
      }),
    );

    render(
      <InputForm
        onSubmit={vi.fn()}
        isLoading={false}
        defaultSettings={defaults}
        prefilledTopic={null}
        onPrefillConsumed={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('inputForm.options'));
    expect(screen.getByLabelText('inputForm.sources.educationalDemo')).not.toBeChecked();
    expect(screen.queryByText('inputForm.sources.educationalDemo_hint')).toBeNull();
  });

  it('shows the hint when enabled and persists true on submit', () => {
    const onSubmit = vi.fn();
    render(
      <InputForm
        onSubmit={onSubmit}
        isLoading={false}
        defaultSettings={defaults}
        prefilledTopic={null}
        onPrefillConsumed={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('inputForm.options'));
    const checkbox = screen.getByLabelText('inputForm.sources.educationalDemo');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('inputForm.sources.educationalDemo_hint')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('inputForm.topic.label'), {
      target: { value: 'aspirin cardiovascular' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'inputForm.submit' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        educationalDemoMode: true,
        researchTopic: 'aspirin cardiovascular',
      }),
    );
    const saved = JSON.parse(sessionStorage.getItem('aiResearchFormState') ?? '{}') as {
      educationalDemoMode?: boolean;
    };
    expect(saved.educationalDemoMode).toBe(true);
  });

  it('sample chips fill the topic and Cmd+Enter submits defaults', () => {
    const onSubmit = vi.fn();
    render(
      <InputForm
        onSubmit={onSubmit}
        isLoading={false}
        defaultSettings={defaults}
        prefilledTopic={null}
        onPrefillConsumed={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'inputForm.chip.covid' }));
    const form = screen.getByRole('search');
    fireEvent.keyDown(form, { key: 'Enter', metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        researchTopic: 'inputForm.chip.covid',
        dateRange: '5',
        educationalDemoMode: false,
      }),
    );
  });

  it('does not start a run on Cmd+Enter when the topic is empty', () => {
    const onSubmit = vi.fn();
    render(
      <InputForm
        onSubmit={onSubmit}
        isLoading={false}
        defaultSettings={defaults}
        prefilledTopic={null}
        onPrefillConsumed={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole('search'), { key: 'Enter', metaKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exposes a restored topN error while submit stays disabled', () => {
    sessionStorage.setItem(
      'aiResearchFormState',
      JSON.stringify({
        researchTopic: 'topic',
        dateRange: '5',
        articleTypes: [],
        synthesisFocus: 'overview',
        maxArticlesToScan: 20,
        topNToSynthesize: 25,
      }),
    );

    render(
      <InputForm
        onSubmit={vi.fn()}
        isLoading={false}
        defaultSettings={defaults}
        prefilledTopic={null}
        onPrefillConsumed={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('orchestrator.error.topn_exceeds_max');
    expect(screen.getByRole('button', { name: 'inputForm.submit' })).toBeDisabled();
    expect(screen.getByLabelText('inputForm.workload.top_n')).toHaveAttribute(
      'aria-describedby',
      'input-form-topn-error',
    );
  });
});
