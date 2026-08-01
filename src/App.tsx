import React from 'react';
import { SettingsProvider } from './contexts/SettingsContext';
import { PresetProvider } from './contexts/PresetContext';
import { KnowledgeBaseProvider } from './contexts/KnowledgeBaseContext';
import ErrorBoundary from './components/ErrorBoundary';
import { MemoizedAppLayout } from './app/AppLayout';

const App: React.FC = () => (
  <ErrorBoundary>
    <SettingsProvider>
      <PresetProvider>
        <KnowledgeBaseProvider>
          <MemoizedAppLayout />
        </KnowledgeBaseProvider>
      </PresetProvider>
    </SettingsProvider>
  </ErrorBoundary>
);

export default App;
