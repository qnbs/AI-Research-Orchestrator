# Maintainer issue closure — #408 (Collections slice)

Cloud Agent integration **cannot** close GitHub issues (`403`). Use when **`main`** matches the evidence below.

**Reference `main`:** **`ad79048`** (post **#460**, 2026-11-05, Europe/Berlin). **Tag:** `v0.4.7`.

---

## [#408](https://github.com/qnbs/AI-Research-Orchestrator/issues/408) — Collections persistence / export

**Ready to close (acceptance slice)** when maintainer accepts:

1. **Dexie-backed collection membership** with KB delete pruning (`CHANGELOG` [0.4.7]).
2. **Local portable JSON export** (no fake share URLs).
3. **Blocking E2E:** `src/test/e2e/collections.spec.ts` on `main` (Chromium + cross-browser matrix).

**Close comment (copy-paste):**

> **Nov 2026 audit wave — disposition: close (Collections slice)**
>
> Collection membership persists to Dexie; KB deletes prune collection `entryIds`; portable JSON export only. Blocking Playwright `collections.spec.ts` on `main`. Evidence: **v0.4.7** CHANGELOG, P1 ledger `docs/audits/2026-11-04-p1-issue-disposition.md`.

---

## Verification (maintainer)

```bash
git fetch origin main && git checkout main && git pull
pnpm exec playwright test src/test/e2e/collections.spec.ts --project=chromium
```
