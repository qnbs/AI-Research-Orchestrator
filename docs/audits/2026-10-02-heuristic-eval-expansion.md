# 2026-10-02 heuristic eval expansion (master prompt Wave E)

**Gate:** `pnpm run check:agent-eval` (Vitest: `agentEval`, `agentEval.adversarial`, `heuristicEval`, `liveOrchestratorEval`)

## New offline fixtures (`heuristicEval.ts`)

| ID | Intent |
| --- | --- |
| `heuristic-query-de-mi` | German **Herzinfarkt** → `Myocardial Infarction` MeSH |
| `heuristic-query-de-diabetes` | **Zuckerkrankheit** → `Diabetes Mellitus` MeSH |
| `heuristic-query-en-covid` | Long COVID topic → `COVID-19` MeSH |
| `heuristic-query-en-heart-attack` | English lay term → `Myocardial Infarction` MeSH |
| `heuristic-demo-covid-rank` | COVID query ranks `demo:mrna-variants-2022` in demo corpus |

## New unit assertions (`heuristicEval.test.ts`)

- Non-demo corpus synthesis declares **extractive template** (not live-model draft).
- Demo corpus synthesis declares **EDUCATIONAL SYNTHETIC DEMO** (honesty split).

## Disposition

| Risk | Coverage |
| ---- | -------- |
| DE lay-term MeSH regression | Extended beyond stroke/hypertension/oncology |
| Demo vs retrieved synthesis copy | Explicit tests for both paths |
| COVID demo fixture rank drift | `mustRankPmids` on demo mRNA article |

Update ledger: `docs/audits/2026-10-02-audit-progress.md`.
