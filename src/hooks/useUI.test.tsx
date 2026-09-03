import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer, { setIsSettingsDirty } from '../store/slices/uiSlice';
import { useUI } from './useUI';

function makeStore() {
  return configureStore({ reducer: { ui: uiReducer } });
}

describe('useUI', () => {
  it('reads ui slice and dispatches actions', () => {
    const store = makeStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useUI(), { wrapper });
    expect(result.current.currentView).toBe('home');
    act(() => {
      result.current.setCurrentView('settings');
    });
    expect(store.getState().ui.currentView).toBe('settings');
  });

  it('requestViewChange defers when settings are dirty', () => {
    const store = makeStore();
    store.dispatch(setIsSettingsDirty(true));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => {
      result.current.requestViewChange('orchestrator');
    });
    expect(store.getState().ui.currentView).toBe('home');
    expect(store.getState().ui.pendingNavigation).toBe('orchestrator');
  });
});
