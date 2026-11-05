# GitHub issue curation — 2026-11-05 (maintainer)

The Cloud Agent integration **cannot** post issue comments or close issues (`403`). Paste the sections below on GitHub when executing batch closes.

**Reference `main`:** **`ad79048`** (merge **#460**). After merging open doc PR **#461**, re-check `git rev-parse --short HEAD` and live About before closing **#404**.

**Index:** `docs/audits/2026-11-05-maintainer-close-pack-all.md`

---

## Already closed on GitHub (no action)

| Issue    | Note                                                                                        |
| -------- | ------------------------------------------------------------------------------------------- |
| **#409** | Closed on GitHub; dashboard slice evidence in `docs/audits/2026-11-05-issue-closure-409.md` |
| **#383** | Dependabot duplicate; superseded by **#398** (`0359cd0`)                                    |

---

## #404 — WS-10 Pages / PWA

**Action:** Close  
**Doc:** `docs/audits/2026-11-04-issue-closure-404-411.md` § #404

```markdown
**Nov 2026 audit wave — disposition: close**

External production smoke on **deployed SHA `ad79048`** recorded in `docs/audits/2026-11-04-github-pages-production-smoke.md` (Help → About **`v0.4.7 (ad79048)`**, HTTP 200, deploy run **41994485907**, plus blocking CI/PWA matrix). Consolidated close pack **#460**. Release **v0.4.7** (#447).
```

---

## #411 — WS-16 version / docs drift

**Action:** Close  
**Doc:** `docs/audits/2026-11-04-issue-closure-404-411.md` § #411

```markdown
**Nov 2026 audit wave — disposition: close**

Single-source version inventory on **0.4.7**: `package.json`, README badge (`check:docs-drift`), `CHANGELOG` [0.4.7], tag **`v0.4.7`**, `docs/project-facts.json`. Release truth: `docs/audits/2026-11-04-release-truth.md`.
```

---

## #408 — WS-13 Collections

**Action:** Close  
**Doc:** `docs/audits/2026-11-05-issue-closure-408.md`

```markdown
**Nov 2026 audit wave — disposition: close (Collections slice)**

Dexie-backed membership, KB delete pruning, portable JSON export (no fake share URLs). Blocking E2E `collections.spec.ts` on `main`. CHANGELOG [0.4.7].
```

---

## #396 — P0 security audit

**Action:** Close (high gate green; minimatch dev-only deferred)  
**Doc:** `docs/audits/2026-11-05-issue-closure-396.md`

```markdown
**Nov 2026 audit wave — disposition: close**

`pnpm audit --audit-level=high` exit 0 on `main`. `brace-expansion` via overrides (#441). `minimatch` deferred (dev eslint/LHCI chains) — `docs/audits/2026-11-05-minimatch-396-evidence.md`, `docs/dependabot-disposition.md`.
```

---

## #419 — WS-24 orchestrator invariants (slice)

**Action:** Close **in-scope slice** only  
**Doc:** `docs/audits/2026-11-04-issue-closure-419-421.md` § #419

```markdown
**Nov 2026 audit wave — disposition: close (in-scope slice)**

Matrix `docs/audits/2026-11-04-orchestrator-state-invariants.md` + unit + checkpoint E2E **#454**. **Deferred:** provider mid-run switch (**#403**), IndexedDB upgrade during stream / fuzz (**#406**).
```

---

## #421 — WS-26 Knowledge Base E2E (slice)

**Action:** Close  
**Doc:** `docs/audits/2026-11-04-issue-closure-419-421.md` § #421

```markdown
**Nov 2026 audit wave — disposition: close (WS-26 E2E slice)**

Blocking Playwright on `knowledge-base.spec.ts`: export/delete/reload/filter/pagination/virtualization (**#448–#452**, **#455**). P1 ledger updated.
```

---

## #410 — WS-15 correction lane + DeepSource

**Action:** **Partial** — post DeepSource slice comment; keep open for WS-15 process **or** close with explicit scope split

**DeepSource slice close comment** (`docs/audits/2026-11-05-issue-closure-410.md`):

```markdown
**Nov 2026 audit wave — DeepSource slice: done**

#436 global excludes fixed in **#439**; TOML JS off, Docker/Shell on, narrow Dockerfile exclude. Verification: `docs/audits/2026-11-05-deepsource-410-verification.md`. Optional: one-time DeepSource dashboard check for `.devcontainer/postCreate.sh`.

**WS-15 correction/perfection lane** remains a living process — track metrics separately if the issue stays open for that scope.
```

---

## #394 — Audit portfolio (parent)

**Action:** Comment only (refresh portfolio status)

```markdown
**Nov 2026 audit wave — portfolio checkpoint**

Merged **v0.4.7** recovery on `main` (`ad79048`). P1 slices ready for batch close: #404, #411, #408, #396, #419, #421; #409 closed; #410 DeepSource slice documented. Deferred: #403, #406. Session closeout: `docs/audits/2026-11-05-session-closeout.md`.
```

---

## Suggested close order

1. #404 + #411
2. #408
3. #396
4. #419 + #421 (cite #403/#406 deferred)
5. #410 (DeepSource comment or partial close)
6. Comment **#394**

---

## Labels / triage (optional)

No label changes required for this wave. If using portfolio labels, mark closed issues with release **`v0.4.7`** in the close comment for searchability.
