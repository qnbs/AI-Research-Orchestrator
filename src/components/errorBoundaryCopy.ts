export const errorBoundaryCopy = {
  title: 'Unexpected Application Error',
  description:
    'The application encountered an unexpected error. Your local data in IndexedDB is preserved. You can retry, return home, or reload the page.',
  tryAgain: 'Try Again',
  returnHome: 'Return Home',
  reloadPage: 'Reload Page',
  technicalDiagnostics: 'Technical Diagnostics',
  copyStackTrace: 'Copy Stack Trace',
  componentStackLabel: 'Component Stack',
  fallbackStack: 'N/A',
  errorCodeLabel: 'Error Code',
  copyFailureLog: 'Failed to copy error:',
} as const;
