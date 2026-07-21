# E2E-in-CI backlog (2026-07-21)

`.github/workflows/e2e.yml` runs the two existing Playwright specs (`src/test/e2e/smoke.spec.ts`, `src/test/e2e/agent-flow.spec.ts`) on every push/PR to `main`. It is **non-blocking** (`continue-on-error: true`) because this is its first time running against GitHub's actual hosted runners rather than a local machine — local passes don't guarantee runner-environment stability (headless Chromium sandboxing, timing under shared CPU, etc.).

## Promotion trigger

Flip `continue-on-error` to `false` once the job has run clean (no flakes, no runner-specific failures) for **2 consecutive weeks** of normal PR activity, or after **10 consecutive green runs**, whichever comes first. Whoever does the flip should also remove this backlog note's promotion section and fold a one-line mention into `AUDIT.md`'s next dated entry.

## Deferred specs

Two specs are referenced in earlier audit notes as deferred and remain unwritten — the CI job does not (cannot) run them yet:

- `src/test/e2e/provider-flow.spec.ts` — exercise the multi-provider selection flow (Settings -> provider dropdown -> Gemini/OpenAI/Anthropic/Ollama/Heuristic -> a research run against each, mocked).
- `src/test/e2e/journal-hub.spec.ts` — Journal Hub elevation coverage (profile generation, disambiguation, impact metrics UI).

No target date is set for writing these; whoever picks this up should follow the existing spec patterns in `agent-flow.spec.ts` (stable `getByRole` selectors, mocked network via the patterns already established there).
