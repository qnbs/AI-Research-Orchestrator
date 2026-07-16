# Dependabot PR disposition (2026-07-16)

Consolidation PR: [#25](https://github.com/qnbs/AI-Research-Orchestrator/pull/25) (`cursor/dependabot-batch-eec8`, includes Phase 0 audit merge).

| PR  | Change                              | Disposition                                                           | Status              |
| --- | ----------------------------------- | --------------------------------------------------------------------- | ------------------- |
| #21 | dompurify 3.4.2 → 3.4.11            | **Superseded** — consolidated at **3.4.12** (security audit)          | Closed              |
| #20 | actions/checkout 4 → 7              | **Included** in deploy.yml + security.yml                             | Closed              |
| #17 | actions/upload-pages-artifact 3 → 5 | **Included**                                                          | Closed              |
| #15 | actions/configure-pages 4 → 6       | **Included**                                                          | Closed              |
| #14 | actions/deploy-pages 4 → 5          | **Included**                                                          | Closed              |
| #13 | actions/setup-node 4 → 6            | **Included** in deploy.yml + security.yml                             | Closed              |
| #12 | typescript-eslint 8.24.0 → 8.59.2   | **Included** (^8.59.2)                                                | Closed              |
| #11 | @google/genai 1.43.0 → 1.52.0       | **Included** (^1.52.0)                                                | Closed              |
| #10 | @vitest/coverage-v8 3.2.4 → 4.1.5   | **Deferred** — Vitest 4 major; stay on 3.2.7 until dedicated upgrade  | **Open** (tracking) |
| #9  | react 19.2.4 → 19.2.5               | **Included** (^19.2.5, with react-dom)                                | Closed              |
| #8  | @tailwindcss/postcss 4.2.1 → 4.2.4  | **Included** (^4.2.4)                                                 | Closed              |
| #7  | dexie 4.3.0 → 4.4.2                 | **Included** (^4.4.2)                                                 | Closed              |
| #5  | framer-motion 12.35.1 → 12.38.0     | **Included** (^12.38.0)                                               | Closed              |
| #4  | lucide-react 0.577.0 → 1.14.0       | **Included** (^1.14.0) — app uses custom icons primarily; gates green | Closed              |
| #2  | globals 15.14.0 → 17.6.0            | **Included** (^17.6.0)                                                | Closed              |
| #1  | terser 5.46.0 → 5.46.2              | **Included** (^5.46.2)                                                | Closed              |

Also: vite/vitest security pins via workspace overrides; high+ audit clean (1 moderate remaining in protobufjs transitive).

## Related non-Dependabot PRs

| PR  | Notes                                                                                         | Status |
| --- | --------------------------------------------------------------------------------------------- | ------ |
| #23 | Phase 0-only branch — fully included in #25                                                   | Closed |
| #24 | CodeRabbit UTG tests — useful cases absorbed into #25; original PR failed audit on stale main | Closed |
