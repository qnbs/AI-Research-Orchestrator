# 2026-10-02 full-scale product and engineering audit (Phase 0)

**Repository:** `qnbs/AI-Research-Orchestrator`  
**Capture SHA:** `d8da84b9dd8fa4a6a88af60fa05d1c814960cafc` (post Wave G on `main`)  
**Execution prompt:** `docs/prompts/2026-10-02-cursor-composer-full-scale-audit-perfection-master-prompt.md` (landed with Wave H **#356** on `main`).

This Phase-0 snapshot supplements the frozen **2026-10-01** baseline (`docs/audits/2026-10-01-full-scale-baseline.md`). It records verified gaps for Wave A+ without rewriting historical tables.

## P1 — Settings model catalog drift

| Finding                                                                           | Evidence                 | Wave            |
| --------------------------------------------------------------------------------- | ------------------------ | --------------- |
| Curated Gemini suggestions included `gemini-3-pro-preview` and `gemini-2.0-flash` | `provider.ts` pre–Wave A | **Done (#357)** |
| Curated Anthropic suggestions included retired `claude-opus-4-1`                  | same                     | **Done (#357)** |
| No regression guard for reintroducing retired IDs                                 | missing test             | **Done (#357)** |

Defaults remain **`gemini-2.5-flash`** and **`claude-sonnet-4-5`** (cost-aware; no automatic flagship bump).

## P1 — Orchestrator loading copy (i18n + honesty)

| Finding                                                          | Evidence               | Wave            |
| ---------------------------------------------------------------- | ---------------------- | --------------- |
| Legacy sub-phase strings hardcoded English in `OrchestratorView` | `LEGACY_PHASE_DETAILS` | **Done (#357)** |
| Loading footer hardcoded English; “AI is…” overclaim             | `footerText` prop      | **Done (#357)** |

## P1 — Capability vs retrieval (Wave B)

| Finding                                                                      | Evidence                           | Wave                                            |
| ---------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| `InferenceMode` alone conflates provider path with PubMed/arXiv reachability | `inferenceMode.ts` + status chrome | **B** — `researchCapabilities.ts` + status copy |

## P2 — Supply chain maturity (resolved Wave H)

| Finding                                        | Status                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `vite@8.3.2` / `@google/genai@2.25.0` excludes | **#355 / #356** — see `docs/audits/2026-10-02-audit-progress.md` |

## P1 — Governance (maintainer token)

| Finding                                                      | Status                                      |
| ------------------------------------------------------------ | ------------------------------------------- |
| Ruleset PWA required check + `dismiss_stale_reviews_on_push` | **Open** — 403 from Cloud Agent integration |

## Next slices (ordered)

| Phase-0 journey QA gap | No browser matrix on baseline | **Recorded** — `docs/audits/2026-10-02-journey-qa-evidence.md` (Wave C) |

## Disposition

| Phase-0 gap                   | Status                |
| ----------------------------- | --------------------- |
| Journey / browser QA evidence | **Recorded** (Wave C) |

Progress ledger: `docs/audits/2026-10-02-audit-progress.md`.
