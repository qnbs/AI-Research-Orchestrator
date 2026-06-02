import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import OrchestratorView from './OrchestratorView';
import uiReducer from '../store/slices/uiSlice';
import themeReducer from '../store/slices/themeSlice';
import { defaultSettings } from '../store/slices/settingsSlice';

vi.mock('../contexts/KnowledgeBaseContext', () => ({
  useKnowledgeBase: () => ({
    knowledgeBase: [],
    getRecentResearchEntries: () => [],
  }),
}));

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../contexts/PresetContext', () => ({
  usePresets: () => ({ presets: [], savePreset: vi.fn(), deletePreset: vi.fn() }),
}));

const baseSettings = defaultSettings;

const store = configureStore({
  reducer: { ui: uiReducer, theme: themeReducer },
});

describe('OrchestratorView', () => {
  it('renders idle welcome when no report is active', () => {
    render(
      <Provider store={store}>
        <OrchestratorView
          reportStatus="idle"
          currentPhase=""
          error={null}
          report={null}
          researchInput={null}
          isCurrentReportSaved={false}
          settings={baseSettings}
          prefilledTopic={null}
          handleFormSubmit={vi.fn()}
          handleSaveReport={vi.fn()}
          handleNewSearch={vi.fn()}
          onPrefillConsumed={vi.fn()}
          handleViewReportFromHistory={vi.fn()}
          handleStartNewReview={vi.fn()}
          onUpdateResearchInput={vi.fn()}
          handleTagsUpdate={vi.fn()}
          chatHistory={[]}
          isChatting={false}
          onSendMessage={vi.fn()}
        />
      </Provider>,
    );

    expect(screen.getByLabelText(/primary research topic/i)).toBeInTheDocument();
  });
});
