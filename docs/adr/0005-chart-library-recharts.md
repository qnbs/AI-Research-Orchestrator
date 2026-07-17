# ADR 0005: Consolidate charting on Recharts

## Status

Accepted (2026-07-16 Phase 2)

## Context

The app shipped with both **Chart.js** (+ `react-chartjs-2`) and **Recharts**. Dual chart stacks inflated the `vendor-charts` chunk (~550 kB raw / ~163 kB gzip) and forced maintainers to learn two APIs.

## Decision

Standardize on **Recharts** for all in-app charts (Dashboard, Scientometric Hub, Report timeline, Authors citation timeline, Journals topic/timeline).

Remove `chart.js` and `react-chartjs-2` from dependencies. Keep a single Vite `manualChunks` entry: `vendor-charts: ['recharts']`.

## Consequences

- Smaller chart vendor chunk after consolidation.
- Shared theming patterns (tick/grid colors from dark/light settings) across views.
- Doughnut charts become Recharts `Pie` with `innerRadius` (visual parity, not pixel-identical).
