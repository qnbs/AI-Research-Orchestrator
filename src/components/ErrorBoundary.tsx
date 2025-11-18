
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    // A simple way to reset is to reload the page.
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary p-4">
            <div className="max-w-lg w-full bg-surface border border-red-500/30 rounded-lg shadow-2xl p-8 text-center">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong.</h1>
                <p className="text-text-secondary mb-6">
                    A critical error occurred in the application, and it cannot continue. Please try refreshing the page.
                </p>
                {this.state.error && (
                     <details className="text-left bg-background p-3 rounded-md border border-border mb-6">
                        <summary className="cursor-pointer text-sm text-text-secondary">Error Details</summary>
                        <pre className="mt-2 text-xs whitespace-pre-wrap break-all text-red-400/80">
                            <code>
                                {this.state.error.toString()}
                            </code>
                        </pre>
                    </details>
                )}
                <button 
                    onClick={this.handleReset}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-accent hover:bg-opacity-90"
                >
                    Refresh Application
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
