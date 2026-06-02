import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface Props {
  children: ReactNode;
  /** Short feature label shown to the user (e.g. "Research Orchestrator"). */
  featureName: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Local error boundary so one feature failure does not blank the entire app.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[${this.props.featureName}]`, error, errorInfo);
  }

  private handleRetry = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
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
          {this.props.featureName} unavailable
        </h2>
        <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
          Something went wrong in this section. Your data in other areas is unaffected.
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 focus:ring-2 focus:ring-brand-accent focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }
}
