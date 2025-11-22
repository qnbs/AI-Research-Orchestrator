
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BugAntIcon } from './icons/BugAntIcon';
import { HomeIcon } from './icons/HomeIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

// Inline Refresh Icon for self-containment
const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleSoftReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleHomeReset = () => {
    try {
        window.history.pushState(null, '', '#home');
    } catch (e) {
        window.location.hash = '#home';
    }
    // Dispatch a hashchange event to ensure routers pick it up if they rely on listeners
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  private handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.toString()}\n\nComponent Stack:\n${errorInfo?.componentStack || 'N/A'}`;
    navigator.clipboard.writeText(text).catch(err => console.error('Failed to copy error:', err));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary p-6 relative overflow-hidden">
            {/* Background Ambient Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
            </div>

            <div className="max-w-xl w-full bg-surface/80 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] p-8 text-center relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <BugAntIcon className="h-10 w-10 text-red-400 animate-pulse" />
                </div>
                
                <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">System Critical Failure</h1>
                <p className="text-text-secondary mb-8 max-w-md mx-auto leading-relaxed">
                    The application encountered an unexpected anomaly. <br/>
                    Our agents have been notified.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                    <button 
                        onClick={this.handleSoftReset}
                        className="inline-flex items-center justify-center px-5 py-2.5 border border-brand-accent text-brand-accent bg-brand-accent/5 hover:bg-brand-accent/10 rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
                    >
                        <RefreshIcon className="w-4 h-4 mr-2" />
                        Try Again
                    </button>
                    <button 
                        onClick={this.handleHomeReset}
                        className="inline-flex items-center justify-center px-5 py-2.5 border border-border text-text-primary bg-surface hover:bg-surface-hover rounded-lg font-medium transition-all duration-200"
                    >
                        <HomeIcon className="w-4 h-4 mr-2" />
                        Return Home
                    </button>
                    <button 
                        onClick={this.handleHardReload}
                        className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 rounded-lg font-medium transition-all duration-200"
                    >
                        Reload Page
                    </button>
                </div>

                {this.state.error && (
                     <div className="text-left">
                        <details className="group bg-background/50 rounded-lg border border-border overflow-hidden transition-all duration-300">
                            <summary className="flex items-center justify-between p-3 cursor-pointer text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
                                <span>Technical Diagnostics</span>
                                <span className="opacity-50 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-4 pt-0 border-t border-border/50 mt-2">
                                <div className="flex justify-end mb-2">
                                    <button 
                                        onClick={this.handleCopyError} 
                                        className="flex items-center text-[10px] text-brand-accent hover:text-brand-secondary uppercase tracking-wider font-bold"
                                    >
                                        <ClipboardIcon className="w-3 h-3 mr-1" /> Copy Stack Trace
                                    </button>
                                </div>
                                <pre className="text-[10px] leading-relaxed whitespace-pre-wrap break-all text-red-300 font-mono bg-black/20 p-3 rounded border border-red-500/10 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                    <strong className="block mb-2 text-red-400">{this.state.error.toString()}</strong>
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </div>
                        </details>
                    </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-border/50 text-xs text-text-secondary/50 font-mono">
                    Error Code: {this.state.error?.name || 'UNKNOWN'} | {new Date().toISOString()}
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
