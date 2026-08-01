import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { translateSync } from '../i18n/translate';

interface Props {
  children: ReactNode;
  /** Short feature label shown to the user (e.g. "Research Orchestrator"). */
  featureName: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Local error boundary so one feature failure does not blank the entire app.
 * Absorbed from superseded PR #19 (v0.2.0 deep audit).
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[${this.props.featureName}]`, error, errorInfo);
  }

  private handleRetry = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center"
      >
        <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-red-400 mb-3" aria-hidden />
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          {translateSync('error.feature.unavailable', { feature: this.props.featureName })}
        </h2>
        <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
          {translateSync('error.feature.body')}
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 focus-ring-aa"
        >
          {translateSync('error.feature.retry')}
        </button>
      </div>
    );
  }
}
