# Architecture Decision Records

Index of ADRs for AI-Research-Orchestrator. Each record captures one significant architectural decision, its context, and consequences. Newest decisions supersede older ones where noted.

| #                                                   | Title                                                   | Status   | Date       | Notes                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------- |
| [0001](0001-state-management-strategy.md)           | State Management Strategy                               | Accepted | 2026-07-16 |                                                                                             |
| [0002](0002-agent-orchestration-pattern.md)         | Agent Orchestration Pattern                             | Accepted | 2026-07-16 |                                                                                             |
| [0003](0003-security-model-client-side-keys.md)     | Security Model — Client-Side API Keys                   | Accepted | 2026-07-16 | Key storage hardened to a non-extractable `CryptoKey` in 0.4.0                              |
| [0004](0004-pwa-offline-strategy.md)                | PWA Offline Strategy                                    | Accepted | 2026-07-16 |                                                                                             |
| [0005](0005-chart-library-recharts.md)              | Consolidate charting on Recharts                        | Accepted | 2026-07-16 |                                                                                             |
| [0006](0006-prompt-versioning.md)                   | Prompt versioning registry                              | Accepted | 2026-07-16 |                                                                                             |
| [0007](0007-heuristic-inference-layer.md)           | Heuristic Inference Layer (Offline / No-API-Key)        | Accepted | 2026-07-17 | Superseded in part by 0009 (heuristic layer becomes a delegator to the consolidated engine) |
| [0008](0008-multi-provider-architecture.md)         | Multi-Provider AI Architecture                          | Accepted | 2026-07-19 | OpenRouter-via-`openai`-baseURL path (§3) superseded by 0010                                |
| [0009](0009-non-ai-programmatic-research-engine.md) | Consolidated Non-AI Programmatic Research Engine        | Accepted | 2026-07-22 | Consolidates the three deterministic layers into one; `services/heuristics/` deleted        |
| [0010](0010-openrouter-free-model-primacy.md)       | First-Class OpenRouter Provider with Free-Model Primacy | Proposed | 2026-07-21 | Promotes OpenRouter to a first-class provider; supersedes 0008 §3                           |

## Conventions

- Filenames: `NNNN-kebab-case-title.md`, numbered contiguously (no gaps).
- Status lifecycle: `Proposed → Accepted` (or `Rejected` / `Superseded`). A `Proposed` ADR is a decision awaiting sign-off; flip it to `Accepted — <date>` once approved.
- When a decision replaces an earlier one, mark the older ADR's relevant scope as superseded in the Notes column above and reference the superseding ADR in-file.
