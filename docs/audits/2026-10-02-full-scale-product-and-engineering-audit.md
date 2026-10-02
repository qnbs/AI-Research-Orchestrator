# 2026-10-02 full-scale product and engineering audit (Phase 0)

**Repository:** `qnbs/AI-Research-Orchestrator`  
**Capture SHA:** `d8da84b9dd8fa4a6a88af60fa05d1c814960cafc` (post Wave G on `main`)  
**Execution prompt:** `docs/prompts/2026-10-02-cursor-composer-full-scale-audit-perfection-master-prompt.md` (landed with Wave H **#356** on `main`).

This Phase-0 snapshot supplements the frozen **2026-10-01** baseline (`docs/audits/2026-10-01-full-scale-baseline.md`). It records verified gaps for Wave A+ without rewriting historical tables.

## P1 — Settings model catalog drift

| Finding                                                                           | Evidence                                        | Wave                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| Curated Gemini suggestions included `gemini-3-pro-preview` and `gemini-2.0-flash` | `src/services/providers/provider.ts` pre–Wave A | **A** — `modelCatalog.ts` + policy doc |
| Curated Anthropic suggestions included retired `claude-opus-4-1`                  | same                                            | **A**                                  |
| No regression guard for reintroducing retired IDs                                 | missing test                                    | **A** — `modelCatalog.test.ts`         |

Defaults remain **`gemini-2.5-flash`** and **`claude-sonnet-4-5`** (cost-aware; no automatic flagship bump).

## P1 — Orchestrator loading copy (i18n + honesty)

| Finding                                                          | Evidence               | Wave                                     |
| ---------------------------------------------------------------- | ---------------------- | ---------------------------------------- |
| Legacy sub-phase strings hardcoded English in `OrchestratorView` | `LEGACY_PHASE_DETAILS` | **A** — `orchestratorTranslations` EN+DE |
| Loading footer hardcoded English; “AI is…” overclaim             | `footerText` prop      | **A** — `orchestrator.loading.footer`    |

## P2 — Supply chain maturity (resolved Wave H)

| Finding                                        | Status                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `vite@8.3.2` / `@google/genai@2.25.0` excludes | **#355 / #356** — see `docs/audits/2026-10-02-audit-progress.md` |

## P1 — Governance (maintainer token)

| Finding                                                      | Status                                      |
| ------------------------------------------------------------ | ------------------------------------------- |
| Ruleset PWA required check + `dismiss_stale_reviews_on_push` | **Open** — 403 from Cloud Agent integration |

## Next slices (ordered)

1. **Wave B** — capability-state matrix / copy (`InferenceMode` vs retrieval vs Ollama).
2. **Journey QA** — browser evidence matrix (Phase-0 gap in baseline).
3. **Heuristic eval** — continue corpus expansion under `check:agent-eval`.

Progress ledger: `docs/audits/2026-10-02-audit-progress.md`.
