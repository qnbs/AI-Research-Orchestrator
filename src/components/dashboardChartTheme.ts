/** Chart colors for the Research Instrument dashboard (theme-aligned teal slate). */
export const DASHBOARD_CHART_COLORS = [
  '#2dd4bf',
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#94a3b8',
  '#5eead4',
  '#7dd3fc',
  '#86efac',
  '#fcd34d',
] as const;

export const DASHBOARD_ACCENT = '#2dd4bf';

export const dashboardAccentFill = (opacity: number): string =>
  `color-mix(in srgb, var(--color-brand-accent) ${Math.round(opacity * 100)}%, transparent)`;
