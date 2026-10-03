# Viewport capture artifacts (maintainer)

Optional **§48** screenshot grid for journey QA evidence. Not part of blocking CI.

## Run

```bash
pnpm exec playwright install chromium   # once
pnpm run capture:journey-viewports
```

Output defaults to `docs/audits/viewport-captures/latest/` (gitignored). Override:

```bash
JOURNEY_VIEWPORT_OUT_DIR=/opt/cursor/artifacts/journey-viewports pnpm run capture:journey-viewports
```

Captures the **home** shell after onboarding skip at seven viewports defined in `src/test/e2e/maintainer/viewport-grid.capture.spec.ts`.

See also `docs/audits/2026-10-02-journey-qa-evidence.md`.
