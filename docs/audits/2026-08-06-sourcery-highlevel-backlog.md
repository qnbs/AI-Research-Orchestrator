# Sourcery high-level feedback backlog — 2026-08-06 (PR wave #228-233)

> **Status (2026-09-02 post-#290):** BACKLOG-P2-001 / 003 / 006 landed in **#290**. 002 / 004 / 005: sidebar sticky offset shared as `STICKY_BELOW_CHROME_CLASS`; LoadingIndicator cancel is caller-labeled; OrchestratorView uses that cancel during generate and keeps a streaming-only cancel after the indicator unmounts.

**Context:** Sourcery posts two kinds of feedback on a PR — inline review-thread comments
(tracked and resolved via the normal GraphQL `reviewThreads` correction loop) and **top-level
"high level feedback" review comments**, which are not threads and don't surface in a
`reviewThreads` sweep. This backlog exists because that second category was being missed by
the correction loop across PRs #228-233. Each PR's Sourcery review body was pulled directly
(`gh api graphql` on `reviews`, not `reviewThreads`) and triaged against current code. P2 IDs
below are **resolved** (kept for lookup). P3 remains deferred.

Severity: P2 = worth doing, not blocking · P3 = defer with rationale (cosmetic/low-risk)

---

## Resolved or false positive (not carried forward)

- **PR #232 — missing `scope="col"` on `ChartAccessibleTable` `<th>`** ("found 1 issue"):
  already fixed pre-merge in `f176ffc` (`fix(a11y): scope="col", stricter column typing...`).
  Verified present in `src/components/charts/ChartAccessibleTable.tsx:34` on `main`.
- **PR #230 — AgentDebugger `developerMode` gating "silently no-ops" forced-visible state**
  ("found 1 issue"): verified false positive. `setDebuggerVisible`/`completeTrace` dispatch
  directly into `agentDebugSlice` from `useResearchSession.ts` regardless of whether
  `AgentDebuggerPanel` is mounted (`src/app/useResearchSession.ts:193,303,312`) — Redux state
  updates are never conditional on a subscribing component being mounted. Toggling
  `developerMode` on later immediately reflects the already-accumulated `isVisible`/`history`
  state on next mount. Replied on the PR with this evidence.
- **PR #233 — `useMotionSafeLoop` transition object fully replaced, losing non-duration
  properties** ("found 1 issue"): fixed directly in this same PR (see commit that added this
  doc) — now preserves all transition keys and only overrides `duration`.

---

## P2 — resolved (IDs kept for lookup)

### BACKLOG-P2-001 — Centralize `developerMode` gating condition

| Field      | Value                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Source     | Sourcery, PR #230 (both reviews)                                                                                                           |
| Impact     | `settings.developerMode` is checked ad hoc in both `Header.tsx` and `AppLayout.tsx`; a third gate site would be easy to add inconsistently |
| Suggestion | Extract a `selectIsDeveloperToolsEnabled` selector or `isDeveloperToolsEnabled(settings)` helper                                           |
| Files      | `src/components/Header.tsx`, `src/app/AppLayout.tsx`                                                                                       |
| Status     | **Resolved (#290)** — `isDeveloperToolsEnabled()` in `settingsSlice.ts`; Header + AppLayout both call it.                                  |

### BACKLOG-P2-002 — Sticky offset constants duplicated/misaligned

| Field  | Value                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source | Sourcery, PR #230                                                                                                                                                                           |
| Impact | New sticky settings header uses `top-20 md:top-36`; existing sidebar uses `sticky top-24` — worth confirming intentional, otherwise centralize                                              |
| Files  | `src/components/SettingsView.tsx` and wherever the sidebar's `top-24` is defined                                                                                                            |
| Status | **Resolved** — Settings + KB sidebars share `STICKY_BELOW_CHROME_CLASS` (`md:sticky` + `md:top-[max(6rem,var(--chrome-height,0px))]`). Settings page header already uses `--chrome-height`. |

### BACKLOG-P2-003 — `validViews` hardcoded, can drift from `View` type

| Field      | Value                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source     | Sourcery, PR #229 (both reviews)                                                                                                                                   |
| Impact     | `useUrlSync`'s `validViews` array is a manually maintained string list separate from the `View` union type — adding/renaming a view won't get a compile error here |
| Suggestion | Derive `validViews` from `View` (e.g. `Object.values`/`as const` tuple shared with the type)                                                                       |
| Files      | `src/hooks/useUrlSync.ts`                                                                                                                                          |
| Status     | **Resolved (#290)** — `VIEWS` const tuple in `src/types/ui.ts`; `View` is `typeof VIEWS[number]`; `isView()` is the hash guard.                                    |

### BACKLOG-P2-004 — `LoadingIndicator` cancel-button i18n key is orchestrator-specific

| Field      | Value                                                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | Sourcery, PR #231                                                                                                                                                                                              |
| Impact     | `LoadingIndicator` is a shared/generic component but its cancel-button label is hard-wired to `orchestrator.cancel.button` — reusing it in another context (author/journal loading) would show the wrong label |
| Suggestion | Generic i18n key, or pass the label in via props                                                                                                                                                               |
| Files      | `src/components/LoadingIndicator.tsx`                                                                                                                                                                          |
| Status     | **Resolved** — `cancel?: { label; onClick }` is caller-supplied. Rapid Research already passed `research.cancel.button`; Orchestrator now passes `orchestrator.cancel.button`.                                 |

### BACKLOG-P2-005 — Possible duplicate cancel-button UI (OrchestratorView vs LoadingIndicator)

| Field      | Value                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | Sourcery, PR #231                                                                                                                                                                                                     |
| Impact     | `OrchestratorView` renders its own cancel button while `LoadingIndicator` now also wires in a cancel affordance for other contexts — worth confirming these don't both render simultaneously in the orchestrator flow |
| Suggestion | Reuse the shared control, or extract a `CancelButton` component                                                                                                                                                       |
| Files      | `src/components/OrchestratorView.tsx`, `src/components/LoadingIndicator.tsx`                                                                                                                                          |
| Status     | **Resolved** — Orchestrator generate-phase cancel is the LoadingIndicator control. The standalone button renders only while streaming after the indicator unmounts (cancel-mid-stream E2E).                           |

### BACKLOG-P2-006 — `ScientometricHub` a11y table reuses `dashboard.a11y.*` keys

| Field      | Value                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | Sourcery, PR #232                                                                                                                                                                  |
| Impact     | Implicit coupling between the dashboard and scientometrics feature areas via shared i18n keys — a dashboard-only wording change would silently affect ScientometricHub's table too |
| Suggestion | Introduce scientometrics-specific `a11y.*` keys                                                                                                                                    |
| Files      | `src/components/ScientometricHub.tsx`, `src/i18n/dashboardTranslations.ts`                                                                                                         |
| Status     | **Resolved (#290)** — `scientometrics.a11y.*` keys for scatter, timeline, and journal pie tables.                                                                                  |

---

## P3 — defer, low risk given current usage (single call site, no observed impact)

- **`useElementHeight` ref-reassignment/null-unmount/multi-entry defensiveness** (PR #228,
  both reviews) — the hook observes a single static header ref for the app's lifetime; no
  current call site reassigns the ref or observes multiple targets. Revisit if a second call
  site with different lifecycle needs is added. Files: `src/hooks/useElementHeight.ts`.
- **`DeveloperModeSettingsCard` `checked` defaulting to `?? false`** and **Header test's
  brittle label-text selector** (PR #230) — cosmetic robustness, not a current failure.
- **CollectionIcon stroke/viewBox consistency** and **mobile "More" menu className
  duplication** (PR #229) — cosmetic/DRY, no functional impact.
- **`ChartAccessibleTableColumn.key`/`rowKey` typing (`keyof T`/`React.Key`)** and **always-
  rendered empty `<tbody>`** (PR #232) — type-safety and edge-case polish, no observed defect.
- **`useMotionSafeLoop` unconditional hook init in `AgentDebuggerPanel`/`AgentDebuggerToggle`**
  and **no runtime assertion that `transition.repeat === Infinity`** (PR #233) — perf
  micro-optimization and type-safety nice-to-have, not a correctness issue.
