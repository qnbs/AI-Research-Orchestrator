# AI RESEARCH ORCHESTRATOR — NOVEMBER 2026 COMPOSER MASTER DIRECTIVE

## Evidence-Driven Recovery, Full-Scale Deep Audit, Critical Remediation, Scientific Integrity, App Quality and Sustainable Engineering Excellence

**Intended execution environment:** Cursor Cloud Agent — Composer (use the model offered by the current Cursor session; do not assume a specific Composer version).  
**Repository:** `qnbs/AI-Research-Orchestrator`  
**GitHub:** https://github.com/qnbs/AI-Research-Orchestrator  
**Document creation date:** 2026-11-03, Europe/Berlin  
**Captured baseline:** `main` = `e45847b4cc75d7cd3b867a4f2278968410941177` (2026-10-03 10:03:08 UTC)  
**Most recent release when audited:** `v0.4.6` (2026-10-03)  
**Published product URL to VERIFY:** https://qnbs.github.io/AI-Research-Orchestrator/  
**Central tracking issue:** https://github.com/qnbs/AI-Research-Orchestrator/issues/394  
**Child issues:** #395–#406  
**Original source-of-truth baseline:** GitHub repository and its live Actions logs; this prompt itself is **not** proof that any observation is still true after 2026-11-03.  
**Language requirements:** English for agent responses in the repository, code comments, PRs, issue descriptions, commit messages, release notes, plans and machine artifacts; maintain existing EN/DE locale parity and a bilingual README where established.  
**Execution contract:** This is an ACTION AND VALIDATION mandate, not a request for a speculative design manifesto or uncommitted audit report.

---

# 0. CORE MISSION — WHAT SUCCESS MEANS

Act as a meticulous, autonomous principal engineer, incident responder, security engineer, scientific software reviewer, frontend accessibility specialist, QA architect, release engineer and technical product steward. **Work on the live current repository**, not on a stale October handoff, and improve the application through reproducible evidence, minimal corrective changes, strong test coverage, reviewed PRs and measured post-merge results.

Prioritize in this sequence:

1. **Restore operational integrity:** Real required PR CI must run; all safety gates must be meaningful and correctly block broken changes. The October 19 scheduled security failure and CodeQL upload failure require specific repairs.
2. **Eliminate confirmed high/critical dependency vulnerabilities in the currently resolved graph,** respecting production reachability and avoiding blanket vulnerability suppression.
3. **Recover the stalled dependency backlog** of 18 overlapping, currently unmerged Dependabot PRs, using bounded, compatibility-aware consolidation rather than an unreviewable giant update or repeated cascading hotfix loops.
4. **Prove the current deployed PWA and GitHub Pages behavior** with actual dated browser/network evidence; repair discrepancies. Current deployment reachability is an UNKNOWN, not a verified outage or verified success.
5. **Audit and harden science-facing truth, retrieval, source attribution, inference provenance, privacy and local persistence**; fix newly reproduced defects rather than resurrecting historical, already closed bugs.
6. **Improve usability, accessibility, resilience, performance and documentation** through grounded, small high-impact PRs after release/security assurance is restored.
7. **Maintain one coherent, comprehensible backlog** in parent issue #394 and twelve child issues #395–#406, linking current findings, evidence, specific acceptance tests, PRs and final results. Avoid duplicating issue structures or creating churn merely to increase apparent progress.

The expected outcome is NOT to claim the app is “perfect,” “secure,” “scientifically verified,” “fully audited,” or “production ready” without sufficient external, reproducible evidence. Treat those as claims that require proof and limitations.

### 0.1 Non-negotiable integrity principles

- **Facts before remedies.** Reproduce the exact error, identify the owning code or configuration, explain the causal path, then change the smallest safe surface.
- **Current head before action.** Start by fetching the remote. Recompute SHA, PR list, runs, deployment state, and ruleset. Any discrepancy supersedes the captured snapshot.
- **Scientific honesty.** Distinguish retrieved source text, model-generated narrative, corpus-supported claim, negative/contradictory evidence, missing data, inaccessible source and synthetic educational demo. A citation is not automatically proof of a proposition.
- **Security without theater.** Never convert failing security checks into green no-op checks; never mask high/critical vulnerabilities with broad ignore rules. Distinguish dev-only dependency exposure from shipped browser code.
- **No untested/unaudited merges.** Required latest-head CI plus complete review quiescence. No direct pushes to main. No force-push to protected main. No admin-bypass merge as a shortcut for unavailable checks or reviewers. If repository documentation describes narrowly approved exceptional procedures, report the conflict and request maintainer resolution rather than silently assuming authority.
- **No sensitive identity disclosure.** Do not include real personal names or email addresses in commit authorship/message/body, issue or PR descriptions, labels, notes, logs or generated deliverables. Use repository-approved privacy-safe identity configuration; do not rewrite history without a separately approved, backed-up plan.
- **No destructive actions without a documented safety precondition:** preserve all user research, Dexie history, source provenance, release artifacts, existing branches and pending worktrees; do not purge caches, delete releases, close legitimate PRs or modify security settings simply because doing so clears red indicators.
- **No invented verification.** A historical green push run does not mean that a later scheduled Security job passes, nor does an `npm audit` printout prove a browser vulnerability. Report exact commit, date, job, exit condition, and tested scope for each assertion.
- **Use existing project governance.** Do not fork or silently overwrite the authoritative policy in `.cursor/rules/011-coderabbit-pr-gate.mdc` and `docs/pr-merge-gate.md`; reconcile inconsistencies explicitly.
- **Complete the work available.** Do not repeatedly stop for routine confirmation, PR creation, tests or ordinary reversible changes. Human-only account/plan security changes, destructive actions and missing permissions are true handoff points: write exact next steps and continue independent safe tasks.

---

# 1. BOOTSTRAP: RECONSTRUCT THE TRUE LIVE STATE (MUST EXECUTE FIRST)

**Never interpret the SHA in this prompt as a command to rewind, reset or cherry-pick.** It is an audit reference point. Reconcile recent changes from the actual latest remote branch. Keep any untracked files, working trees, unpushed local changes and unrelated branches intact.

## 1.1 Environment and repository safety

Read in this order before editing application or policy files:

1. `.github/copilot-instructions.md`;
2. `.cursor/index.mdc` and all applicable `.cursor/rules/*.mdc` (especially `000`, `001`, `010`, `011`, `012`, `013`, `100`–`102`, `200`, `300`, `800`, `850`);
3. `AGENTS.md` and `CLAUDE.md` (where conflict exists, follow `AGENTS.md` and the single authoritative merge predicate);
4. `docs/pr-merge-gate.md`, `docs/ci-branch-governance.md`, `docs/agent-execution-playbook.md`, `docs/audit-governance.md`, `docs/project-facts.json`;
5. `SECURITY.md`, `CONTRIBUTING.md`, `docs/release-policy.md`, `docs/product-truth-matrix.md`, ADR index and applicable ADRs 0001–0021;
6. October audit reports, especially `docs/audits/2026-10-02-full-scale-product-and-engineering-audit.md`, `2026-10-02-audit-progress.md` and `2026-10-02-composer-audit-closeout.md`;
7. The previous Composer handoff `docs/prompts/2026-10-02-cursor-composer-full-scale-audit-perfection-master-prompt.md` — **historical context only; this November prompt supersedes its stale state**.

Suggested discovery commands when terminal and GitHub CLI are available (adapt command syntax to installed CLI and access; do not fabricate output):

```bash
pwd
node --version
pnpm --version
git status --short --branch
git remote -v
git fetch --prune origin
MAIN_SHA="$(git rev-parse origin/main)"
printf 'main=%s\n' "$MAIN_SHA"
git log origin/main --date=iso-strict --pretty=format:'%h %ad %s' -n 40
gh repo view qnbs/AI-Research-Orchestrator --json nameWithOwner,visibility,defaultBranchRef
# Inspect the actual list and changed PR head SHAs, never assume 18 remain.
gh pr list --repo qnbs/AI-Research-Orchestrator --state open --limit 100 \
  --json number,title,headRefOid,baseRefOid,mergeStateStatus,isDraft,updatedAt,url
# Query fresh checks and workflow runs; paginate if results exceed defaults.
gh run list --repo qnbs/AI-Research-Orchestrator --limit 100 \
  --json databaseId,name,event,headSha,status,conclusion,createdAt,updatedAt,url
# Read-only ruleset inspection; owner/plan permissions may be needed.
gh api repos/qnbs/AI-Research-Orchestrator/rulesets/20291814
```

The direct GitHub REST API on 2026-11-03 reported **public visibility** (`visibility: public`, `private: false`) and `has_pages: true`. Verify that metadata remains current and independently check actual Pages HTTP availability; repository visibility does **not** explain the CodeQL upload failure on its own. Do not change visibility without explicit owner authorization. Never publish private user research or credentials.

## 1.2 Produce an immutable Phase-0 evidence snapshot

Capture in an audit note or report folder following current repo conventions:

- UTC timestamp and timezone, `git rev-parse origin/main`, tag/release HEAD, repository visibility, Pages URL and last successfully deployed SHA (if verifiable).
- Main last N commits and their merged PR references; commit/PR chronology by day (distinguish PR create/update from **actual merge to main**).
- Open issue/PR index with labels, latest head SHA, draft state, merge state, GitHub required checks, completed/queued/missing statuses, bot activity and review threads.
- Recent runs by `push`, `pull_request`, `schedule`, and `workflow_dispatch` (including failed/cancelled/skipped jobs); show exact run and job URLs.
- GitHub rulesets and actual required contexts; compare to workflow job names and `docs/ci-branch-governance.md`.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, Actions workflow paths, PWA service worker, deploy config, CSP, app release metadata.
- Existing branch/PR assets and review comments, particularly overlapping Dependabot PRs, so no work is lost.
- Known limits: code scanning permissions, Actions resource quota, missing browser/sandbox, unavailable secrets, background bot rate limits.

Maintain evidence labels: **VERIFIED CURRENT**, **VERIFIED HISTORICAL**, **SOURCE-OBSERVED RISK**, **HYPOTHESIS**, **UNKNOWN**, **BLOCKED BY PERMISSION**. For every table, include sample date and SHA. Never transform a hypothesis into an incident without reproduction.

## 1.3 Mandatory freshness assertions

At the beginning of each workstream and immediately before every merge or status claim:

- Confirm `origin/main` SHA and PR head SHA again.
- Refresh only the relevant upstream changed files and review threads.
- Re-evaluate open/closed issue and PR states (several past P0 issues and previous PRs have already closed).
- Check whether the suspected problem was already corrected or superseded by another agent.
- If work was completed elsewhere, mark disposition `already resolved` with the actual commit/PR, do not create a duplicate PR.
- If the current PR head does not match the approved review/testing head, repeat affected verification.

---

# 2. VERIFIED NOVEMBER 3 INPUTS — NOT CURRENT TRUTH WITHOUT RECHECK

## 2.1 Main/Release history and the development stall

On November 3 the latest fetched main commit was:

- SHA: `e45847b4cc75d7cd3b867a4f2278968410941177`;
- Date: `2026-10-03T10:03:08Z`;
- Subject: `docs: v0.4.6 release ledger and closeout (#372) (#373)`;
- Last published GitHub release: `v0.4.6` (2026-10-03);
- Main push run family on that SHA (PWA E2E, Axe smoke, Security, E2E, cross-browser, Pages deployment) completed successfully **on October 3**, but later scheduled security jobs did not.

From October 1–3 a dense sequence of merged waves updated model policy, onboarding/UX and accessibility, heuristic evaluations, dependency consolidation, Node 24 CI, Workbox, Vite, and release tags `v0.4.3` through `v0.4.6`. Since October 3, no newer main commit surfaced in the fetched history while Dependabot opened further PRs. Treat this as an operational convergence failure to investigate, not evidence that the old development process was intrinsically wrong.

## 2.2 Security incident evidence

Scheduled Security workflow: https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/39209557969

On **2026-10-19**, `pnpm audit (high+)` FAILED after 3 attempts; the output reported **15 advisories**: 10 moderate, four high (two ignored), one critical. Three unignored advisory families were:

| Package / GHSA                          | Historical reported severity | Vulnerable range / fix threshold as of Oct19 | Observed dependency path                                                    |
| --------------------------------------- | ---------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| `proxy-addr` / `GHSA-jqcg-44mw-7w3h`    | Critical                     | `>=1.1.0 <2.0.8`; fix `>=2.0.8`              | `@lhci/cli > express > proxy-addr`                                          |
| `source-map-js` / `GHSA-68fv-2mgg-jv7q` | High                         | `>=1.0.0 <1.2.2`; fix `>=1.2.2`              | `@tailwindcss/postcss > @tailwindcss/node`; `vitest/coverage-v8 > magicast` |
| `compression` / `GHSA-vc2v-76pw-4v95`   | High                         | `<1.8.2`; fix `>=1.8.2`                      | `@lhci/cli > compression`                                                   |

**Critical interpretation:** `@lhci/cli` is development / CI infrastructure in this client-only PWA; do not claim a public Express server runs in production. Still patch vulnerable tooling and assess CI exploitation surface. Source-map tooling dependencies require their own reachability and supply-chain assessment. Refresh `pnpm audit` today; the October output does not establish the current count.

In the same October 19 Security run, CodeQL successfully scanned source but **SARIF upload failed**, with GitHub reporting `Code scanning is not enabled for this repository`. Gitleaks passed; Dependency Review was skipped because the trigger was schedule, not PR. October 12 exhibits the same security failures. The latest surfaced scheduled Security run was October 19 even though schedule says Monday 06:00 UTC; investigate missing Oct26/Nov2 runs rather than merely declaring schedules broken.

## 2.3 PR CI gap and 18-dependency backlog

At Nov3 capture, open PRs were:

`#375` Vite 8.3.2→8.3.3; `#376` actions/upload-artifact; `#377` actions/setup-node; `#379` @types/node 26.6.4→26.6.5; `#380` marked; `#381` codeql-action/autobuild; `#382` @google/genai 2.26→2.32; `#383` anthropics/claude-code-action; `#384` openai 7.27→7.45.1; `#385` codeql-action/init; `#386` jsdom; `#387` @types/node 26.6.4→26.6.6; `#388` react-redux; `#389` codeql-action/analyze; `#390` React and types; `#391` react-virtual; `#392` @vitejs/plugin-react; `#393` axe-core/playwright.

No open PR was recorded outside this Dependabot set. Overlap exists in #379 versus #387; #381/#385/#389 must be treated together as the same GitHub CodeQL action family. The #382/#384 SDK changes require provider conformance tests. All **18 head SHAs** returned only a small set of checks in the captured result, without the expected full required test/build/security jobs; sampled #375, #379, #384, #393 showed `mergeable_state=blocked`. Do not infer exact missing triggers until validated with GitHub Actions/permissions/approval settings. Recent PR-run discovery surfaced runs dated October 5, predating all these current PRs.

## 2.4 Ruleset drift and historical scientific P0s

Current ruleset read: https://github.com/qnbs/AI-Research-Orchestrator/rules/20291814

`mainrules` has strict required statuses and includes Typecheck/Lint & Tests, Production Build, Playwright E2E, cross-browser Firefox/WebKit/mobile Chrome, axe, CodeQL, Dependency Review, pnpm audit and gitleaks. But **`PWA service-worker registration` is not an enforced required context**, whereas `docs/ci-branch-governance.md` says it should be. Do not add it prematurely while PR workflows may be unable to run; correct both in dependency order.

Scientific-integrity issues #176–#181 (author bibliometrics, KB dedup/history, import trust, provenance, claim self-validation, journal OA/JIF) are **CLOSED since August**. Current code contains intended corrective paths. Do not reopen them without new, current-head reproduction. Add tests and fix regressions if present; honor work already merged.

---

# 3. P0 EXECUTION — RESTORE ACTUAL SAFETY SIGNALS BEFORE NORMAL MERGES

## WS-01 / Issue #395 — Repair missing/incomplete PR CI, preserve protections

Issue: https://github.com/qnbs/AI-Research-Orchestrator/issues/395

### Diagnostic tree

A. **Are PR workflows truly absent?** Inspect each PR’s Checks tab and check-runs/check-suites API with head SHA and `pull_request` event; compare PR's head ref vs synthetic merge refs. Fetch workflow-run collections with pagination and find check suites by app; avoid judging from a single first page. Categorize: not triggered, pending approval, skipped by `if`, intentionally filtered, disabled workflow, missing permission, Actions concurrency, resource quota, malfunctioning YAML, GitHub feature/entitlement, stale orphaned check, or genuine CI failure.

B. **Why the divergence after October 5?** Compare repo visibility, changes to `.github/workflows/{deploy,security,a11y,e2e,e2e-cross-browser,pwa-e2e}.yml`, Actions settings, Dependabot PR authorship, required checks/expected App IDs, CODEOWNERS and trust boundaries. Validate the event triggers on Dependabot-created branches and the repository policies for fork-like / bot PRs. Verify whether workflow permissions default changed; do not assume an installation can change security settings.

C. **Which checks are required and why?** Extract current `mainrules`, workflow names/job names, `docs/project-facts.json`, the documented PWA discrepancy and actual check-run context names. Compare _exact case-sensitive names_, not workflow file names alone.

D. **Reproduce safely.** Use one small, non-destructive PR or permitted `workflow_dispatch` (do not treat a manual run as sufficient replacement for pull_request coverage). Prove the exact current head receives real test/build/E2E/Security jobs. Examine logs and downstream artifacts, including cancelled/neutral/skipped outcomes.

E. **Repair the smallest causal surface.** Do not delete required checks, set `continue-on-error` on security, add green placebo jobs, use `--no-verify`, switch to direct main changes, or merge via bypass because PR CI appears inconvenient. If settings require human account action, document exact settings page and pending state, continue independent diagnosis/testing.

### Acceptance gate

- A new PR head actually receives **every expected blocking context** and its real tests execute; a deliberately failing validation produces a blocking failure in the relevant scope.
- PR checks are visible with exact head SHA and run links, not merely a local statement that checks were run.
- Pre-/post-fix evidence and root-cause timeline are documented, reviewed and linked to #395.

## WS-02 / Issue #396 — Fix actual high/critical advisory paths, not vulnerability display

Issue: https://github.com/qnbs/AI-Research-Orchestrator/issues/396

1. Re-run `pnpm install --frozen-lockfile` on a clean, correct Node/pnpm toolchain. Run `pnpm audit --audit-level=high`, capture complete report and exit code, `pnpm why proxy-addr`, `pnpm why source-map-js`, `pnpm why compression`, and check the exact installed paths in the lockfile. Refresh advisory fixes and exposure, including ALL new advisories, not only October’s three.
2. Verify whether parent dependency updates or regenerated lockfile can bring patched versions. Prefer upstream, compatible fixes; only use scoped `pnpm.overrides` when necessary, explain why, and run applicable integration/e2e tests. Avoid blind `pnpm update --latest` or override that violates peer dependencies.
3. Differentiate application-runtime, build-time, CI-only and test-only exposure. Do not downgrade priority solely because a package is dev-only: runner tools and uploaded artifacts form a legitimate attack surface.
4. Verify `pnpm audit --audit-level=high` actually passes in CI. Existing two ignored highs must have explicit narrowly scoped justification, owners and expiry/reevaluation; run `pnpm run check:audit-ignore-paths` and ensure no new arbitrary ignore category.
5. Test LHCI, production build, frozen install, Workbox vendor drift, bundle budget, CSS/Tailwind, Playwright/axe, the generated GitHub Pages payload and any security gates touched.
6. Consider whether scheduled audit will automatically rerun, or trigger a manual audit with same permissions to gather immediate evidence. No claim of remediation until the actual current lockfile audit is green.

**Completion:** verified current-head clean high/critical audit (or explicitly approved scoped exceptions with original advisory provenance) plus full suite regression evidence and PR/review gate satisfaction. Maintain advisory/impact table in #396.

## WS-03 / Issue #397 — Restore CodeQL and scheduled security operations

Issue: https://github.com/qnbs/AI-Research-Orchestrator/issues/397

1. Read CodeQL job logs around upload. The recorded failure is **GitHub code scanning not enabled**; do not waste cycles debugging TypeScript extraction or introducing arbitrary source changes. Check repo type/visibility and eligible GitHub Advanced Security/Code Security features, owner/org restrictions, Security > Code scanning and analysis settings, permissions for `security-events: write`, and whether the CodeQL action API is accessible.
2. Repository visibility was PUBLIC at the November 3 recheck. Determine whether the Code Scanning feature, dashboard configuration, org policy, or the integration permission changed around October; distinguish evidence from conjecture. If the connector lacks security-settings access (branch-protection REST previously returned 403), prepare exact human UI actions. NEVER modify billing or repo visibility without explicit human authorization.
3. Once enabled, execute a fresh CodeQL scan; verify **source extraction, queries, upload, dashboard ingestion, finding triage and success of the `CodeQL` required check**. Passing a no-op stub is not acceptable.
4. Investigate why scheduled Security jobs expected October 26 and November 2 are not visible in the retrieved schedule history. Audit schedule retention, workflow enablement, event/run pagination, default-branch changes, repository Actions settings and incident timeline.
5. Assess the three CodeQL action upgrade PRs #381/#385/#389 as one consistency-dependent batch after core scanning and PR checks are understood; do not merge them merely to mask an entitlement failure.
6. If CodeQL cannot be enabled under existing account conditions, report the exact unmet prerequisite and safe, equivalent interim scanner(s) with explicit maintainer approval. Keep GitHub truth green/red accurate, no undocumented gate suppression.

**Completion:** new result actually appears in code-scanning dashboard, job green and PR check present; scheduled assurance demonstrably reactivated or separately flagged as external blocker with owned follow-up.

---

# 4. P1 DEPENDENCY CONVERGENCE AND MERGE GOVERNANCE

## WS-04 / Issue #398 — Resolve the 18-PR Dependabot queue

Issue: https://github.com/qnbs/AI-Research-Orchestrator/issues/398

After WS-01/02/03 restore credible green checks, construct a **dependency DAG**. Map each PR to package/version, transitive impact, open competing PR, failing gates, behavior surface, release impact, urgency and required tests. Start with overlapping lockfiles; avoid rebasing every PR in a perpetual loop while previous PR heads are invalidated.

Suggested wave composition, adjust to facts:

- **Wave D1 security/build baseline:** urgent transitive remedies, Vite #375 and build system dependencies if tightly coupled, but keep a manageable diff; ensure no fresh audit failure.
- **Wave D2 GitHub Actions:** #376, #377 and CodeQL trio #381/#385/#389; verify pinned SHAs, tag annotations, permissions, workflow triggers and CodeQL entitlement independently.
- **Wave D3 provider SDKs:** #382 (`@google/genai`) and #384 (`openai`); strong contract/streaming/cost/cancel tests, correct model IDs, structured JSON schemas, versions and privacy egress; do not combine with a broad frontend redesign.
- **Wave D4 React/runtime:** #388 (react-redux), #390 (React/type), #391 (virtualization), as compatibility allows; validate store hydration, route/view transitions, memory and accessibility.
- **Wave D5 test/doc tooling:** #380 marked, #386 jsdom, #387 @types/node, #392 plugin-react, #393 axe-core; #383 Claude action separately if governance/security-sensitive.
- **Explicit duplication decision:** #379 older @types/node versus #387 newer target. Choose a single supported resolution; document closure/supersession of obsolete PR, never merge both blindly.

Do not rewrite Dependabot history or close PRs unrelated to the merged replacement. If bot PR cannot be edited, create a focused maintainer consolidation PR with explicit `Replaces #...` tracking; keep originals open until replacement validation and explain closure. Respect code ownership and review bots. A passing incremental PR may be merged when **both** repository-specific gates are satisfied; validate main after each merge before moving forward.

### Anti-cascade PR design

- One coherent goal per PR; ≤15 commits preferred (read current repository rules first), keep diffs reviewable and explain test scope. A successor PR is preferable to unbounded continuation, but successors may not be stacked against unverified main.
- Batch reviewer issues once after review arrival, not one commit per bot nit; reject speculative bot suggestions after checking current code.
- No perfunctory empty “fix review” commits, cleanup-only PRs for each comment, duplicated governance docs, repeated follow-up issue churn or PR trains with no material user or security value.
- Reserve release summary after validated merges; no release solely to clear cosmetic changelog noise.

## WS-05 / Issue #399 — Align enforced branch policy without deadlocking the repo

Issue: https://github.com/qnbs/AI-Research-Orchestrator/issues/399

- Compare actual `mainrules` ruleset, documented CI job names and observed latest-head check contexts. Strictly preserve security and fail-closed behavior.
- `PWA service-worker registration` is currently described as blocking but not enforced: add it to required checks **only once WS-01 proves PR event execution is reliable**. Test the branch rule behavior on a controlled PR.
- Evaluate required approvals (currently zero in the captured ruleset), stale reviews, bypass actors, CODEOWNERS and bot/API permissions. Propose safe strengthening with project constraints and maintainer authorization rather than forcing platform changes.
- Reconcile `docs/ci-branch-governance.md`, `docs/project-facts.json`, `AGENTS.md`, `.cursor/rules/011` and `.cursor/rules/013` without creating another authoritative merge predicate.

### Exact dual merge predicate

**Latest PR head SHA must satisfy both:**

1. **Deterministic blocking CI:** all required check names and security/a11y/e2e gates genuinely green on that head, no stale or skipped required job or unreviewed head shift; optional/advisory checks correctly distinguished.
2. **Review quiescence:** no active latest-head human or bot `CHANGES_REQUESTED`; no in-progress bot arrival; all GraphQL unresolved threads resolved, all actionable top-level/outside-diff/body-only findings dispositioned; required DeepSource `@deepsourcebot review` attempt after current-head pushes; respect CodeRabbit rules, rate limits and current-head conditions. CodeRabbit “review rate limited” is **not** an unlimited reason to stall, and equally is not a passed real review. Source of truth: `.cursor/rules/011-coderabbit-pr-gate.mdc` clause (a)/(b)/(c)/(d) and `docs/pr-merge-gate.md`; do not invent a weaker local substitute.

Do not bypass branch rules, fake passing checks, waive active reviews or merge on outdated CI because a tool reports `mergeable=true` while `mergeable_state=blocked`.

---

# 5. ENGINEERING AND SCIENTIFIC AUDIT MAP: INSPECT ACTUAL CURRENT CODE

This is a risk-based investigation map, not an assertion that every listed risk is present. For each module: locate its callers, read tests, inspect implementation from current SHA, formulate an invariant, build a failing fixture if warranted, then patch narrowly. Do not produce enormous audit docs without closing high-priority executable defects.

## 5.1 Scientific evidence, research retrieval, and citations (WS-06 / #400)

**Representative modules:**

- `src/lib/claimValidation.ts`, `src/lib/claimEvidenceMatcher.ts`, `src/lib/citationGrounding.ts`, `src/lib/groundedSynthesis.ts`, `src/lib/claimEvidenceConflicts.ts`, `src/lib/sourceIdentifier.ts`, `src/lib/articleSourceClass.ts`;
- `src/services/pubmedUtils.ts`, `src/services/pubmedXmlParser.ts`, `src/services/arxivUtils.ts`, `src/services/liveResearchReportStream.ts`, `src/services/nonAi/*`, `src/services/literatureAiTools.ts`;
- `src/components/ReportDisplay.tsx`, `ReportArticleCard.tsx`, `ReportPublicationChart.tsx`, `src/components/authors/*`, `src/components/journals/*`;
- `src/lib/agentEval*.test.ts`, `heuristicEval.test.ts`, `liveOrchestratorEval.test.ts`, citation/claim tests.

### Scientific guarantees and hostile fixture catalog

- **Identifiers:** PMID, PMCID, DOI and arXiv IDs must remain typed and distinct; no synthetic `arxiv:...` display identifiers may be falsely represented as literal PubMed PMIDs. Compare identifiers robustly across case, prefixes, versions and collision/conflicts.
- **Source of evidence:** The source abstract and title belong to the retrieved corpus; model-generated `aiSummary` is interpretation and **cannot verify itself**. A claim may cite an in-corpus paper while the evidence _contradicts_ it. Generated synthesis cannot be promoted to source fact simply because it echoes itself.
- **Claim validation:** Test citation with no backing text; two common words overlap; negation near key terms; changed endpoint/outcome, dosage, date, population, effect direction, statistically non-significant result, missing abstract, correction/retraction notice, review vs randomized trial, out-of-corpus IDs and inaccessible full text. Evidence must be labeled by method and uncertainty.
- **No fabricated metrics:** User-visible author citation timelines, author h-index, journal impact factor and estimated citation counts must be directly sourced to a credible current bibliometric source and period or explicitly shown as `unavailable` / clearly marked model draft. Do not use random/formula/LLM estimates as observed citation metrics.
- **Author identity:** Identical surnames, initials, transliteration, name changes, affiliations and ambiguous authorship must not silently merge identities. Prefer corpus-bound clusters and explicit identity confidence.
- **Journal semantics:** Distinguish article open access, journal OA, licensed access status and preprint. No falsely binary `isOpenAccess` fact when underlying data is uncertain.
- **Relevance:** Heuristic BM25+ 0–100 is a relative display scale, not calibrated probability or live model semantic estimate. Provider scores likewise require disclosed source/method and are not objective truth.
- **Evidence strength:** Do not claim systematic-review completeness without reproducible search date, coverage, inclusion/exclusion criteria and limitations.
- **Result provenance:** Record source identifier, query, retrieval timestamp, provider/mode/model or heuristic, ranking/explanation, citation support state, partial/failed source, and demo/real corpus origin in report and export where appropriate.

Write a deterministic adversarial test matrix and measure before/after. Avoid assigning a scientific “verified” badge based solely on lexical overlap; preserve source uncertainty. Respect existing closed issues #176–#181 by testing the already-merged fixes first.

## 5.2 Retrieval outcomes and failure transparency (WS-07 / #401)

Observed code risk: `src/services/arxivUtils.ts` comments it returns empty arrays on CORS/network/parse errors. This could conflate **empty results** and **unavailable source**. Examine the entire call path before changing signatures.

Design typed status semantics that do not break stable API consumers:

- `success_with_results`, `success_empty`, `unavailable`, `blocked_by_cors`, `timeout`, `rate_limited`, `offline`, `cancelled`, `parse_failure`, `partial` (names may follow repo style; distinguish source attempts and final report aggregate).
- Use status objects/data fields where compatibility allows, not ambiguous return `[]` plus an implicit log line.
- Preserve PubMed success when optional arXiv fails, but show **partial coverage** if arXiv was requested; never claim “all sources returned no results” from one unavailable network origin.
- Use explicit transport vs model-inference mode: online heuristic still may contact PubMed; local Ollama does not mean PubMed retrieval is offline or that remote Ollama endpoints never send data to the LAN.
- Ensure retry/AbortSignal semantics: no retries on cancellation; honor `Retry-After`; classify 429 vs 5xx; bounded timeouts; circuit breaker keyed by source/provider; prevent duplicate records on retry.
- Validate XML/Atom parsers against malformed/hostile responses and truncation; source identifiers from untrusted metadata must be sanitized.
- Avoid leaking optional NCBI key through workbox cache, analytics or logs. Review actual code and synthetic capture tests; no real credentials.

Test individual failure modes and mixed-source partial reports in Chromium and deterministic mocked fetches.

## 5.3 Provider architecture, runtime truth, and model capabilities (WS-12 / #406)

Inspect `src/services/providers/{factory,types,provider,gemini,openai,anthropic,ollama,heuristic,modelCatalog}.ts`, `src/services/researchOrchestratorAdapter.ts`, inference mode resolver, `src/lib/promptRegistry.ts`, `src/lib/promptBudget.ts`, `src/lib/providerPricing.ts`, `src/lib/ollamaContextBudget.ts`, `src/lib/groundedSynthesis.ts`, and streaming/cancel paths.

Verify:

- Correct per-provider REST transport semantics: prompt roles, structured output, schema validation, tool calls only if implemented, rate-limit headers, stream fragments, abort behavior, partial token accounting, deadline and retry caps, lazy-load and no API-key dead ends.
- Actual model catalog IDs and retired suggestions use source evidence; **do not** unilaterally upgrade default Gemini or Anthropic models to expensive flagships.
- No vendor API endpoint or bearer token embedded into rendered bundle or a `VITE_*` env variable. Credentials remain in the approved AES-GCM vault (read actual threat model before revising claims).
- Model switch during in-flight requests, key rotation, offline transitions, mid-stream cancellation, duplicate retries and report checkpoint/resume are identity- and cost-safe.
- User-facing cost estimates are clearly estimates, not provider-confirmed charges. Token budgets, context truncation, missing source evidence, unreachable provider and budget exceeded have accurate UI states.
- Conceptual phase names in Agent Debugger must not imply five independent autonomous background agents; report factual sequential pipeline boundaries, actual request spans, statuses and source provenance.
- Deterministic offline heuristic is not silently substituted for user-selected live inference without a prominent, accurate status and persisted provenance.
- Provider conformance test suites have stable fake HTTP server behavior and fail against actual contract breaches rather than snapshots of misleading success copy.

Compare pre/post measured outputs on fixed fixtures; do not use a model to validate its own unsupported conclusions.

## 5.4 Browser security, local privacy and untrusted content (WS-08 / #402)

Inspect `SECURITY.md`, `src/services/apiKeyService.ts`, `src/lib/endpointPolicy.ts`, `src/lib/promptSanitize.ts`, `src/lib/untrustedDataFraming.ts`, `src/lib/safeLog.ts`, `src/lib/exportSafety.ts`, `src/lib/settingsImport.ts`, `src/services/export*.ts`, `src/components/SettingsView.tsx`, `src/components/settings/*`, `public/sw.js`, `index.html`, `scripts/patch-csp-hashes.mjs`, `src/lib/externalFetch.ts`, `src/services/pubmedUtils.ts`, `src/services/arxivUtils.ts`.

Threat scenarios:

1. Imported knowledge base / scientific XML title/abstract contains prompt injection, data-exfiltration instructions or malicious HTML/script. Validate input-to-prompt delimiting, type validation and output trust state.
2. Model output contains HTML, Markdown links, images, CSV formulas, URLs, dangerous PDF metadata or scripts. Sanitize through DOMPurify and export-safe escaping, contextual URL validation and CSV formula-injection prevention.
3. Browser XSS accesses live decrypted keys. Recognize AES-GCM and non-extractable key mitigate offline theft but **cannot** provide active-session isolation against same-origin XSS; preserve CSP and avoid overpromising.
4. NCBI API key in query string appears in browser caches, SW, client logs or referrers. Verify cache skip and migration cleanup from real SW code, with fixtures for `api_key`, `key`, `authorization`, and case/encoding variants.
5. Custom base URLs redirect from approved to non-approved origin, bypass allowed schemes or leak provider keys. Apply origin approval and CSP/connect-src coherently; localhost vs LAN/remote Ollama must be accurately distinguished. Avoid overbroad allowlists or arbitrary insecure HTTP.
6. Repository workflow supply-chain exfiltration through compromised actions or PR contexts. Use pinned action SHAs, least privileged `GITHUB_TOKEN`, trusted PR events and scoped secrets. Dependabot PRs must not inherit secrets beyond their permission needs.
7. IndexedDB migrations, report JSON export or service-worker cache includes private research or provider identifiers unexpectedly. Audit consent, data minimization and straightforward deletion/export mechanisms.
8. Error/log trace, observability or CI artifact contains API key-shaped strings or identifiable personal data. Reuse `safeLogError/safeLogWarn`, no verbose production console dumps.

Classify finding severity by credible attack path (threat actor, preconditions, asset, reachability, exploit mechanics, remediation, verification and residual risk). Never paste actual secrets into issues/PRs. Ensure CodeQL/Dependency Review/gitleaks are truly active as independent gates, not security theater.

## 5.5 Local persistence, schema migrations, history and exports (WS-09 / #403)

Representative modules: `src/services/databaseService.ts`, `src/contexts/KnowledgeBaseContext.tsx`, `src/lib/knowledgeBaseDedup.ts`, `src/lib/knowledgeBaseValidation.ts`, `src/lib/knowledgeBaseImport.ts`, `src/lib/researchCheckpoint.ts`, `src/lib/reportExportProvenance.ts`, `src/lib/demoCorpusMigration.ts`, `src/lib/synthesisTrustMigrationV7.ts`, `src/services/export{Service,Csv,Text,Pdf}.ts`, settings import and `src/store/slices/*`.

**Required invariants:**

- Each persisted Dexie schema version upgrades correctly from the version actually present in existing user browsers. Write migration tests with representative pre-migration fixtures; migration is atomic or explicitly recoverable and repeatable. Any persistent shape change increments schema version, documents migration, and respects changelog/release policy.
- Historical research report snapshots, citations, synthesizer context and saved provenance must be immutable when deduplicating the **derived knowledge-base view** or pruning separate article indexes. No implicit destructive global deletion, hidden orphan references or trust promotion.
- Imports must validate a versioned envelope and nested structures, constrain count/size/recursion, reject prototype-pollution keys, quarantine invalid/ambiguous data and **downgrade rather than blindly trust** imported elevated evidence states. Preserve user evidence for review without silently treating unknown data as verified.
- JSON/CSV/RIS/BibTeX/PDF export must preserve source identifiers, research date, execution provenance, synthetic demo watermark and partial/cancelled state. Test every serialized format rather than assuming common helper coverage implies equality.
- Cancelled, interrupted or checkpoint-restored reports remain `partial` unless truly completed under the application's established state machine. No reset/reload can transform partial into done merely because a cached object exists.
- Cloud research prompts and provider API keys should not accidentally leave the approved vault via exported KB/report/settings. Any intentional export of sensitive fields requires an explicit opt-in and unmistakable user-facing warning.
- Concurrent tabs and concurrent writes should not race Dexie transactions, break counts, reorder stable records or create inconsistent collections. Test `QuotaExceededError`, transaction abort and reload recovery with realistic fake-indexeddb / browser setups.
- Synthetic educational demo records remain distinct from retrieved PubMed/arXiv records through import, migration, display, search and export. Never let synthetic data backfill inaccessible retrieval without an explicit demo mode and label.

**Acceptance:** a cross-version and cross-format round-trip matrix, automated failing-then-passing fixtures for each true defect, no history loss, and documented limitations for unavailable browser support.

## 5.6 PWA, GitHub Pages and release integrity (WS-10 / #404)

Documented URL: https://qnbs.github.io/AI-Research-Orchestrator/ — **HTTP reachability, latest deploy SHA and current installability have not yet been independently verified**. GitHub REST API returned public visibility and `has_pages: true` on Nov3; neither proves current HTTP reachability. Inspect `public/sw.js`, app registration hooks, `index.html`, `404.html`, `sitemap.xml`, `manifest`/`public/*`, base path `/AI-Research-Orchestrator/`, `scripts/generate-deployment-artifacts.mjs`, Workbox pinned vendoring, CSP hash patching, the deploy workflow and GitHub Pages settings.

Produce browser/network evidence for:

1. HTTP response/status of main URL, deep-link entry point and fallback `404.html`; source identity and main release commit in served assets (if metadata exists).
2. Build on current main, generated route paths, asset URLs, content-type, caching headers, service-worker scope and manifest validity; no CDN reintroduction or unsafe CSP relaxation.
3. Fresh browser session and previously installed app upgrade: offline after successful first visit, stale cache invalidation, sw update notification, no infinite reload, PWA offline fallback, no secret-bearing request persistence.
4. Cross-browser contexts (Chromium desktop, Firefox, WebKit, mobile Chrome) with accessible critical journeys and no red console/network errors masked as harmless.
5. Lighthouse and Core Web Vitals on an actual named environment and fixed metrics with date, browser/head SHA and measurement variance; production and preview results are distinct.
6. GitHub Pages deployment permissions, actual repository publishing settings and served deployment; never switch visibility or billing without explicit authorization, never claim success because an old deployment job was green.
7. Release readiness: changelog, tags pointing to intended commit, artifacts, PWA version metadata, rollback procedure, fixes classified as released vs merged-but-not-deployed, and crisp known limitations.

If production access is blocked, record exact URL/status/browser trace and distinguish Pages configuration, origin, routing, cache and asset issues. A GitHub Pages 404 may have several causes: test, do not guess.

## 5.7 User experience, inclusive design and product honesty (WS-11 / #405)

Primary user journeys: onboarding and education, provide/rotate a cloud key, select safe model, connect/check Ollama, no-key heuristic mode, launch a complete literature review, inspect live/partial/retrieval status, read ranked sources, evaluate citations, save to KB, browse author/journal profiles, run quick research assistant, manage collections/history, export and revisit a report, offline PWA update and recover from errors.

Systematically inspect:

- Clear separation between full literature review and rapid research assistant; progressive disclosure of advanced settings, task-state intelligibility and actionable empty states.
- i18n completeness: EN and DE labels, errors, loading, partial/cancelled/retry, exports, onboarding, Help, keyboard palette, virtualized lists, and existing bilingual README product truth.
- Dark/light/matrix theme contrast, color token compatibility with Tailwind v4, WCAG 2.2 AA, 200%/400% zoom, forced colors where feasible, touch target size and 320/360/390px no horizontal clipping.
- Keyboard semantics, focus order and visible ring, dialogs and return focus, escape key, skip link, aria-live announcements, accessible status color redundancy, chart data table alternatives, motion reduction and scroll/virtualized list focus stability.
- Offline, local Ollama, remote Ollama, live/cloud, heuristic, educational demo, unavailable citation and incomplete report copy match the **actual** execution state. Do not write “everything remains local” if selected provider receives prompts, or “verified research” for a narrative draft.
- Reproducible responsive screenshots and screen reader/axe/manual notes with exact tested browsers and limitations. Green axe does not prove whole WCAG standard compliance.

Prioritize actual broken paths and user harm. Keep existing design system recognizable; avoid a blanket visual rewrite or decorative effects with performance/a11y regressions.

## 5.8 Performance, test infrastructure and cost discipline (WS-12 / #406)

- Measure load, bundle split, dynamic provider chunking, chart payload, Workbox assets, LCP/INP/CLS where available; compare to existing budget scripts and Lighthouse gates.
- Profile number of render cycles on large result sets, virtualized KB scroll, dashboard charts, memory pressure, IndexedDB startup, provider stream updates, polling/backoff and event loops.
- Do not propose unmeasured speedups. Record baseline, device/viewport/browser, before/after, success threshold and confidence interval or trial variability where relevant.
- Keep deterministic AI evaluation fixtures isolated from provider-dependent network. Add fixture corpus provenance and scoring rubric with known ground truth, negative controls and non-English scientific terms where relevant.
- Validate PWA test assets and mocked network matches real browser semantics; CI should catch empty-data/retry/cancel regressions, not just snapshot text changes.
- Consolidate duplicate tooling/docs only where it reduces maintenance load without lowering observability. Keep the repo's **single** authoritative merge policy.

---

# 6. REPRODUCIBLE QUALITY AND VERIFICATION PROTOCOL

Use the repository's actual `package.json` scripts and current toolchain. As of the captured baseline: Node >=22.12 / CI Node 24; pnpm 11, pinned through `packageManager: pnpm@11.13.1`; TypeScript 6 strict; Vite 8, React 19, Vitest 5 and Playwright; backendless PWA. Do not upgrade pnpm major just because a newer one exists. Validate current CI/action Node compatibility before toolchain migrations.

## 6.1 Local check tiers

**Tier A: safe quick checks, always after relevant edits**

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run check:conflict-markers
pnpm run check:docs-drift
```

**Tier B: targeted functional checks and invariants**

```bash
pnpm exec vitest run src/lib/claimValidation.test.ts
pnpm exec vitest run src/lib/claimEvidenceMatcher.test.ts
pnpm exec vitest run src/lib/knowledgeBaseImport.test.ts
pnpm exec vitest run src/lib/researchCheckpoint.test.ts
pnpm exec vitest run src/services/providers/providerConformance.test.ts
pnpm exec vitest run src/services/databaseService.upgrade.test.ts
pnpm run check:agent-eval
pnpm run check:coverage-floors
pnpm run check:log-redaction
pnpm run check:audit-ignore-paths
pnpm run i18n:ratchet
pnpm run check:csp-endpoint-drift
```

**Tier C: deployment artifacts, safety, E2E and release gates**

```bash
pnpm run build
pnpm run bundle:budget
pnpm run check:no-cdn-scripts
pnpm run check:workbox-vendor-drift
pnpm run check:contrast
pnpm audit --audit-level=high
pnpm run test:coverage
# On a capable runner, with browsers installed:
pnpm exec playwright test src/test/e2e/smoke.spec.ts
pnpm run test:e2e:pwa
```

IMPORTANT: Follow `CLAUDE.md` and `AGENTS.md` guidance that full coverage and full browser shards should normally run in CI rather than on constrained local hardware. A local pass is not a substitute for the required GitHub current-head check. A documented failure to run a command locally must be reported as **not run**, not silently counted as green. Review CI logs and test artifacts for all blocking workflows; ensure the test fixture is actually executed by that workflow.

## 6.2 GitHub blocking matrix

Use **live ruleset** as authority for enforced checks and `docs/ci-branch-governance.md` for intended additional checks. Captured required names:

| Gate                            | Source                  | Mandatory behavior                                                                                    |
| ------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Typecheck, Lint & Tests         | `deploy.yml`            | TypeScript strict, ESLint zero warning, format, doc drift, translation, tests + coverage, evaluations |
| Production Build                | `deploy.yml`            | Build, CSP, bundle budget, Workbox vendor, contrast, Lighthouse                                       |
| Playwright E2E                  | `e2e.yml`               | Browser test execution, not a fake status                                                             |
| Cross-browser (firefox)         | `e2e-cross-browser.yml` | Real browser-specific validation                                                                      |
| Cross-browser (mobile-chrome)   | `e2e-cross-browser.yml` | Responsive/device path                                                                                |
| Cross-browser (webkit)          | `e2e-cross-browser.yml` | Safari engine compatibility                                                                           |
| Axe critical/serious smoke      | `a11y.yml`              | Automated a11y smoke                                                                                  |
| CodeQL                          | `security.yml`          | Source scanning and SARIF upload **both** succeed                                                     |
| Dependency Review               | `security.yml` (PR)     | Genuine diff-based dependency risk analysis                                                           |
| pnpm audit (high+)              | `security.yml`          | Current frozen lockfile, no unignored high/critical                                                   |
| Secret scan (gitleaks)          | `security.yml`          | Full appropriate history/diff scan, real result                                                       |
| PWA service-worker registration | `pwa-e2e.yml`           | Documented blocking intent; ruleset did not yet require this context on Nov3                          |

Do not assume an `if: always()` artifact upload step means the quality test passed; read step conclusions. Distinguish skipped/advisory (Codecov or Claude jobs depending on trigger) from required. Before merging or closing an issue, provide a list of **actual** run/job IDs for current PR head and post-merge main.

## 6.3 Test strategy and confidence standards

For each confirmed defect:

1. Write a **minimal reproducible failing test** before the code change when feasible. Test should fail against original code and pass against remediation, with relevant failure output preserved.
2. Exercise positive, negative, adversarial, cancellation and network error paths. Avoid overfitted fixtures that only match the new branch implementation.
3. Run static checks plus targeted tests, then required current-head CI; if the change affects public UI/PWA/provider behavior, test critical Playwright journey and required browser matrix.
4. Inspect mutation or boundary tests when historical failure was a trust-state regression or falsified provenance, not simply the rendering.
5. Validate on _merged main_ and published Pages for deploy-facing fixes, ideally a fresh session and an upgrade scenario.
6. If a test is flaky, collect repetitions and cause, use quarantine only with explicit owner and deadline; do not disable a safety test as a default “fix”.
7. Record what was **not** executed or was blocked, including unavailable browser/credential/CI plan limitations.

---

# 7. RISK REGISTER, PRIORITIZATION AND EVIDENCE-BASED DECISIONS

Create and maintain one living audit register linked from #394. Avoid parallel competing truth ledgers. Each row:

| Field                       | Contract                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------- |
| ID / issue                  | Stable child-issue link, or a single new issue only if scope is independent and missing |
| Timestamp / main SHA        | Date, UTC time, source ref and code base                                                |
| Status                      | Current verified, historical verified, hypothesis, disproven, blocked, resolved         |
| Component / owner           | Affected feature/module, maintainer lane                                                |
| Reproduction                | Exact commands, sample data/fixture, observable failing output, link to source/log      |
| Severity / likelihood       | Separate impact, affected audience, exploitability and probability; do not invent CVSS  |
| Exposure                    | Production PWA, provider egress, local IndexedDB, development runner, or only docs      |
| Proposed minimal repair     | Bounded changes and prevention test                                                     |
| Test/evidence               | Before/after assertion and CI links on the correct head                                 |
| PR / review disposition     | URL, tracked body-only review comments, final merge SHA                                 |
| Residual risk / next action | Explicit unknowns and approved deferrals                                                |

### Prioritization model

**P0:** required safety checks cannot execute, confirmed critical/high security hygiene prevents reliable releases, active data loss or actual untrusted-content exploit with reproducible path, missing CodeQL result ingestion with enforced gate blocked, real production outage if independently established. Reclassify on proof, do not treat every advisory or hypothetically reachable dependency as a deployed exploit.

**P1:** production-facing correctness or research-truth ambiguity, citation/provenance regression, source outage conflated with empty set, unbounded provider/security-risk exposure, PWA upgrade breakage, high-impact accessibility/task completion, unreviewable dependency buildup, governance drift.

**P2:** non-blocking UI ergonomics, perf not breaching budgets, minor i18n, refactor debt, optimization and instrumentation after urgent stability has been restored.

**P3:** aspirational features and speculative architecture changes. No expensive explorations without evidence that they serve user value.

Severity may differ from issue prefix as new facts emerge. Update issue and parent with the reason and correct snapshot, never maintain contradictory histories.

### Explicit hypothesis falsification

For each risk, actively seek a counterexample: if arXiv typed status already propagates through a higher adapter, close as solved with code/test evidence; if all PR checks are present through a different API pagination, correct #395; if a package is no longer in the current lockfile, mark the October finding superseded and report exact updated commit. A false-positive disposition is engineering progress, not a failure.

---

# 8. MULTI-WAVE IMPLEMENTATION PROGRAM AND DEPENDENCIES

Organize work into bounded safe slices; the following is an **execution order**, not permission to run unsafe changes simultaneously against an unstable base.

## Wave 0 — Refresh, diagnose, triage (immediate)

**Inputs:** latest remote refs, all open PRs/issues/reviews, workflows/ruleset, current Security runs, production URL if accessible.  
**Outputs:** committed or issue-attached snapshot with exact SHA, timeline, cause hypotheses, P0 owner matrix, known blocked settings and issue #394 update.  
**Stop condition:** none for safe evidence gathering. Do not merge merely to show progress.

## Wave 1 — Restore the production safety pipeline (P0)

**Order:** WS-01 PR check execution diagnostic; WS-03 CodeQL entitlement/settings diagnostic; WS-02 dependency vulnerability repair can be prepared concurrently on an isolated branch but merged only after required checks are live.  
**Outputs:** fully observable PR workflow, real high+ security audit passing, CodeQL analysis and upload passing, reliable schedule or precise external permission blocker.  
**Parallelization constraint:** UI/API entitlement steps may require maintainer; continue dependency analysis, test hardening and PR preparation while blocked. Do not weaken mandatory checks to move ahead.

## Wave 2 — Converge dependencies and main governance (P1)

**Order:** WS-04 dependency DAG, dedup, action baseline, SDK batch, runtime batch; WS-05 ruleset and PWA required context after workflow restoration; WS-10 Pages verification.  
**Outputs:** manageable open PR queue, each with disposition, fresh green main after each merge, accurate ruleset, pages/manifest/SW smoke.  
**Anti-churn criterion:** prefer stable main over keeping all bot PRs freshly rebased; avoid multiple simultaneous dependent changes to lockfile.

## Wave 3 — Scientific data integrity and retrieval truth (P1)

**Order:** WS-06 citation support & author/journal metrics regression; WS-07 typed retrieval status and partial evidence; provider/heuristic cross-flow tests.  
**Outputs:** deterministic evaluations and source provenance fixtures, no demonstrated trust elevation, transparent partial/offline states.  
**Preserve:** existing successful closed August P0 remediations and data model compatibility.

## Wave 4 — Privacy, KB, export and resilience (P1)

**Order:** WS-08 secure browser trust boundaries, then WS-09 migration/history/export invariants; integrate source status into checkpoint and export where necessary.  
**Outputs:** focused adversarial and migration tests with reproducible results, explicit user consent and no data destruction.

## Wave 5 — Inclusive product experience and measurable performance (P2)

**Order:** WS-11 EN/DE, screen reader, mobile, themes, workflow clarity; WS-12 provider conformance, load/perf, deterministic benchmark coverage and instrumentation.  
**Outputs:** measured before/after quality, accessible journey evidence, no inflated performance or “verification” claims.

## Wave 6 — Release readiness and durable handover

**After** the requisite PRs converge and all release blockers are verified closed, stage a release candidate. Follow `docs/release-policy.md` rather than fabricating new tags, dates or changelog; ensure installed PWA update paths and release metadata match the delivered build. Validate deployment and records, then close only actually completed issues. Any remaining risk must be explicitly deferred with evidence, severity and owner.

### Daily/iteration loop (bounded)

1. Fetch new main, PRs, comments and run status; do not operate on stale commits.
2. Select highest-priority unblocked child issue with a testable definition of done.
3. Reproduce the problem and failing test; scope the smallest change.
4. Commit with approved privacy-safe identity and normal hooks; no `--no-verify`.
5. Open focused PR and link child issue; request required bots in compliance with current policy.
6. Wait for bot arrival only as required; while pending, perform independent safe evidence work or prepare next unconflicted plan. Keep PR review loops finite and relevant.
7. Resolve **all** actionable current-head review findings, including outside-diff and body-only, with a `fixed/replied/deferred` ledger; follow current-head CodeRabbit and DeepSource rules.
8. Verify required latest-head CI and review quiescence, then merge **normally** if authorized. Do not bypass for speed.
9. Validate merged main and deployment where appropriate; update issue, parent and changelog/ADR only when needed. Proceed to next issue.

---

# 9. BRANCH/PR GOVERNANCE, REVIEW-BOT QUOTA AND PRIVACY CONTRACT

## 9.1 Worktree, branch and history hygiene

- No direct pushes to `main`. Use an isolated feature branch created from the **currently fresh** main after confirming no uncommitted work. Never reset or delete another agent’s worktree.
- Reconcile branches from other agents and existing open PRs. Do not duplicate fixes already in flight.
- Keep ordinary PRs small and single-purpose, favor one coherent correction wave over many tiny nit commits; stay under the repository/user's commit guidance (historically ≤15 per PR) and create a successor only where justified.
- Do not open Draft PRs merely as progress placeholders unless current repository policy explicitly requires them (the project previously avoided Draft PR cascades).
- Never include personal real name/email in PR/commit authored-by, co-authored-by, body, comments or issue text. Check git user/author/committer identity **before** committing; maintain privacy-safe automated identity per repository guidance.
- No secrets in environment dumps, PR bodies, screenshots, markdown, test artifacts or CI logs. Honor `.env.example` and `SECURITY.md`.

## 9.2 Review process and realistic bot expectations

- GitHub **latest-head** is the relevant unit; compare review commit IDs and arrival states against the exact candidate PR head.
- Collect GraphQL unresolved review threads, review bodies, outside-diff findings and top-level comments; pagination required. Record separate disposition for body-only findings.
- Execute current repository bot policy: `@deepsourcebot review` on open/new heads where required, best-effort `@coderabbitai review` as documented, `@sourcery-ai review` only when not quota-exhausted and current head lacks real review. Observe other bot feedback (CodeAnt, CodeScene, Copilot, etc.) without treating API rate limit / “Reviewing...” as final approval.
- **CodeRabbit rate limited:** interpret policy clause (d): lack of real review due quota is not automatically an endless wait; do not spam. But a latest-head `CHANGES_REQUESTED` is never waived, even on quota. External service checks are not substitutes for current-head testing.
- Avoid review-cascade traps: group findings by root cause, implement a bounded consolidated fix, inspect full responses and only retrigger required bots after meaningful changes. One documentation-only iteration after each PR is not necessary if all requirements are already satisfied.
- If a bot recommends conflicting changes, compare to current architecture/docs, run tests and document the technically sound disposition; do not accept a comment merely because it is automated.
- **Merge only after the dual predicate truly holds** and GitHub allows the authorized normal merge. If a stale review or permission mismatch blocks, preserve code, document exact blocker and request maintainer action; no unexplained admin override or force merge.

## 9.3 Post-merge discipline

- Poll and verify merged `main` checks, including schedule ramifications; current green PR checks can differ from main deploy/Pages permissions.
- Re-run relevant smoke after a build or service-worker change. Where user data migrations apply, ensure old local storage can upgrade without loss.
- Update the child issue with exact original failing evidence, commit/PR, fixed tests and post-merge SHA. Only close once the issue's own acceptance criteria are met.
- Avoid creating another “closeout PR” that itself triggers a new review/check storm unless the change materially preserves a necessary release/audit record.

---

# 10. ISSUE HYGIENE: ONE PORTFOLIO, TWELVE DEDICATED LANES

Use these **existing issues; they were created expressly for this work**. Refresh their statuses before editing. Avoid duplicating their scopes by issuing new top-level issues on every pass.

| Lane      | Issue                                                               | Priority | Objective                                                    |
| --------- | ------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| Portfolio | [#394](https://github.com/qnbs/AI-Research-Orchestrator/issues/394) | Control  | Audit source, risk index, dependency/closure progress        |
| WS-01     | [#395](https://github.com/qnbs/AI-Research-Orchestrator/issues/395) | P0       | Reactivate authentic PR CI and required check execution      |
| WS-02     | [#396](https://github.com/qnbs/AI-Research-Orchestrator/issues/396) | P0       | Resolve high/critical audited dependency paths               |
| WS-03     | [#397](https://github.com/qnbs/AI-Research-Orchestrator/issues/397) | P0       | Restore CodeQL SARIF upload and scheduled Security assurance |
| WS-04     | [#398](https://github.com/qnbs/AI-Research-Orchestrator/issues/398) | P1       | Triage/converge 18 Dependabot PRs and overlaps               |
| WS-05     | [#399](https://github.com/qnbs/AI-Research-Orchestrator/issues/399) | P1       | Rule enforcement, PWA gate and review quiescence alignment   |
| WS-06     | [#400](https://github.com/qnbs/AI-Research-Orchestrator/issues/400) | P1       | Citation and scientific integrity regressions                |
| WS-07     | [#401](https://github.com/qnbs/AI-Research-Orchestrator/issues/401) | P1       | Retrieval outcome/partial coverage transparency              |
| WS-08     | [#402](https://github.com/qnbs/AI-Research-Orchestrator/issues/402) | P1       | Browser secrets/CSP/SW/prompt trust boundaries               |
| WS-09     | [#403](https://github.com/qnbs/AI-Research-Orchestrator/issues/403) | P1       | Dexie history, import trust, migrations and exports          |
| WS-10     | [#404](https://github.com/qnbs/AI-Research-Orchestrator/issues/404) | P1       | Live Pages/PWA smoke and release truth                       |
| WS-11     | [#405](https://github.com/qnbs/AI-Research-Orchestrator/issues/405) | P2       | Accessible user journeys, responsive themes, EN/DE           |
| WS-12     | [#406](https://github.com/qnbs/AI-Research-Orchestrator/issues/406) | P2       | Provider/eval/performance/observability excellence           |

### 10.1 Updating each child issue

Append **status evidence** rather than rewriting away its original verification baseline. A concise child issue comment or explicit updated status section must include:

```text
Status: investigation | confirmed | implementing | PR open | blocked | verified on main | closed
Observed: UTC YYYY-MM-DD, main SHA, PR head SHA
Reproduction: exact command/fixture/run URL and expected vs actual
Root cause: evidence path (or UNKNOWN)
Change: focused PR URL, scope and rationale
Tests: names, outcome, runner and SHA, outstanding/blocked checks
Review: bot arrival complete, thread and body-only finding disposition ledger URL
Post-merge: merge SHA, main CI URL, deployed commit and smoke (if applicable)
Residual risk: clear limitation or next action/owner
```

Only create a new issue when it represents a genuinely independent and consequential defect outside the current 12 scopes; search open and closed issues and existing PRs before creation, link its parent/dependencies and avoid duplicate audit reports. Keep child issues human-usable and actionable rather than dumping entire test logs into issue bodies.

### 10.2 Parent #394 operational dashboard

Maintain a short rollup:

- current main head SHA, last merge, last release, last successful main CI, last successful scheduled Security run, last successful Pages deploy SHA;
- open PRs by status and age; stale/overlapping/upgraded/superseded count;
- P0 incident state and blockers (CI, audit, CodeQL), including human account-setting prerequisites;
- child statuses, PR URLs, tests, verified releases and residual risk;
- concrete next one to three highest-leverage actions, each with acceptance test.

Avoid a duplicate Linear board unless the repository/user explicitly requests it and a connected workspace is available. GitHub issues in this repo are the primary execution ledger for this request.

---

# 11. PRODUCT TRUTH: REQUIRED FAILURE-STATE AND TRUST-STATE UX

A biomedical literature-review tool is only useful if it tells the user **what actually happened**. Validate through tests and UI evidence, not through text review alone.

| Scenario                                   | Required truthfulness                                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heuristic mode, online PubMed retrieval    | Local **heuristic ranking/synthesis** may coexist with live online literature retrieval; don't label entire task “offline” or “live AI.”           |
| Forced heuristic with configured cloud key | User explicitly forced heuristic; do not call provider by accident.                                                                                |
| No provider key / offline mode             | No blank/dead-end `NO_API_KEY`; explain what works locally, what online search requires and what remains unavailable.                              |
| Ollama loopback                            | Local generation only on loopback; PubMed/arXiv still use network when available.                                                                  |
| Remote LAN/custom Ollama                   | Generation may leave device; explicit endpoint approval and CSP clarity.                                                                           |
| PubMed results zero, arXiv unavailable     | Show zero PubMed hits **and** arXiv unavailable; not “0 records from both sources.”                                                                |
| arXiv network/CORS failure                 | Explicit unavailable status when requested, optional fallback without false completeness.                                                          |
| Synthetic educational corpus               | Clearly labeled demo everywhere including charts and export; never disguised as live retrieved literature.                                         |
| Cancelled/reloaded report                  | Still partial; distinct visual/status/export marking.                                                                                              |
| Model-generated narrative cites paper      | Citation available in corpus does **not** prove claim; separate supported/contradicted/undetermined.                                               |
| Author/journal quantitative metrics        | Verified measurement source, period and methodology, else unavailable/estimated clearly disclosed; never use randomized plausible values as facts. |
| Historical report loaded after KB dedup    | Original snapshot/retrieval/provenance preserved; derived index may deduplicate.                                                                   |
| Scientific retraction/ambiguous identity   | Explicit uncertainty / correction status; no silent identity conflation.                                                                           |
| Download/export                            | Filename, contents, trust/source/partial/demo status consistent, privacy and CSV safety preserved.                                                 |

Propose a compact canonical source/result state machine where existing types are insufficient. Use a gradual migration and compatibility adapter rather than a large uncontrolled schema redesign.

---

# 12. DOCUMENTATION, POLICY DRIFT AND RELEASE CONTROL

**What to update if the implementation actually changes:**

- `AGENTS.md` / `CLAUDE.md` for developer commands and current architecture, without duplicated contradictory instructions.
- `.cursor/rules/*.mdc` only for durable enforcement or an explicit rule change; obey rule file length, English description and numbering per `000-cursor-rules.mdc`. Prefer links to implementation, not copy-pasted giant rulebooks.
- `docs/project-facts.json`, CI/runbook docs and `docs/product-truth-matrix.md` where observable behavior or checks change; run the docs-drift gate.
- ADRs when architecture-level decisions truly change, not for each minor fix; preserve accepted historical ADRs and create superseding decisions where needed.
- `SECURITY.md` for actual security model, residual XSS risk, provider egress and local storage behavior; never assert AES-GCM vault means no exposed cloud requests.
- `README.md`, Help and EN/DE user copy for actual delivered functionality; no future-tense capability marketed as shipped.
- `CHANGELOG.md` and release notes for user-visible fixes; verify tag, released commit and deployed artifact rather than assuming merge implies release.
- Dependency security exception ledger only with evidence and expiry; no accidental permanent broad advisory ignore.

**Release/no-release criterion:** Do not publish a release while unresolved P0 security/CI assurance blocks genuine validation. After stable main and production smoke, perform a coherent release if appropriate under `docs/release-policy.md` and authorized environment; never fabricate signing, notarization or secrets and never ask to disable mandatory CI just to publish a version.

---

# 13. EXTERNAL/BROWSER/MAINTAINER LIMITATIONS — CONTINUE SAFELY

Common limits and expected response:

- **No admin access to Code Security/plan settings:** gather exact CodeQL error and current repo visibility, document narrowly scoped human configuration steps, do not toggle billing/security and do not claim fixed. Continue evidence gathering, dependency fixes and tests in branches.
- **GitHub CI unavailable because of quota/permissions:** distinguish platform restrictions from code failures, prepare a minimal maintainer action and a reproducible PR-trigger test, never replace required checks with green no-ops or a local manual check.
- **Review bot rate limits:** honor repo’s clause (a)/(b)/(c)/(d) with documented rate-limit handling; do not block forever or bypass active latest-head `CHANGES_REQUESTED`.
- **Cursor Cloud Agent cannot open PRs:** preserve commit/branch, inspect token/installation/policy, provide exact branch SHA and safe manual PR URL or patch handoff; do not push directly to main as a workaround. Continue independent safe tasks.
- **No live production browser access:** do not claim web availability or Lighthouse green; attach a reproducible headless/browser QA plan and mark production-check result `NOT VERIFIED` until a real run occurs.
- **Provider credentials unavailable:** use deterministic fake transport and mock server for conformance without fabricating live provider results; mark live integration tests not run. Never request that secrets be pasted into an issue or a public prompt.
- **Codebase moved during execution:** rebase/merge current main into isolated branch according to repo policy; if scope overlaps another PR, coordinate and stop conflicting writes rather than overwriting work.
- **Task too broad for one PR/session:** prioritize measurable P0/P1, use successor issue/PR handoff under #394 with exact current SHA, steps and pending blockers; do not create unbounded PR stacks.

---

# 14. FINAL OUTPUT CONTRACT — WHAT MUST BE LEFT BEHIND

At meaningful milestones and at the end of the available work, provide **facts tied to evidence**. The agent should not end after presenting a beautifully formatted audit with no code tests or change attempts when safe implementation was possible.

## 14.1 Required artifacts

1. **Current-state audit note:** precise timestamp/main SHA, current open PRs/issues, CI/deploy/release evidence, current code risk register, clearly labeled unknowns and historical-only findings.
2. **P0 incident RCA and acceptance evidence:** real PR CI jobs on latest head; latest genuine `pnpm audit` with full severity/graph; CodeQL upload/security-entitlement status; scheduled Security run diagnostics; every blocker has a live issue and owner.
3. **Reviewable source changes:** small PRs linked to #395–#406, demonstrated failure-before/fix-after tests, privacy-safe commits, no main direct pushes, no fabricated review approvals.
4. **Review ledger:** current-head threads, outside-diff findings, CodeRabbit/DeepSource attempts and arrivals, tested disposition, latest-head checks and normal merge status.
5. **Post-merge/production proof:** exact main merge SHA, required CI run URLs, affected Pages screenshot/browser/network/lighthouse artifacts and deployed SHA when available; explicitly mark what could not be checked.
6. **Backlog hygiene:** update #394 and child issues with current state and relevant PRs; deduplicate stale PRs, close only after acceptance, preserve historical closed scientific P0s and real work history.
7. **Release readiness/handoff:** clear release/no-release decision with evidence, known limitations, future owner actions, and concise next prioritized independent action.

## 14.2 Reporting template

```markdown
# Execution report — AI Research Orchestrator

Snapshot: YYYY-MM-DDTHH:mm:ssZ
Repository / base SHA: qnbs/AI-Research-Orchestrator / <full main SHA>
Live release / deployed SHA: <verified values or NOT VERIFIED>

## Current P0 state

- CI on current PR heads: VERIFIED PASS / FAIL / MISSING / BLOCKED, evidence URL
- Frozen-lockfile high+ dependency audit: PASS / FAIL / NOT RUN, issues and CI URL
- CodeQL SARIF upload: VERIFIED PASS / FAIL / BLOCKED BY ENTITLEMENT, URL
- Scheduled Security: latest run and date / expected cadence gap

## Completed and merged work

| Issue | PR | Commit SHA | Before failure | After test | Latest-head CI | Review gate | Main/production verification |
| ... |

## In-progress safe work

| Issue | Current PR head | Last verified result | Actual blocker | Next action |
| ... |

## Scientific and product truth

- Source/citation evidence states, heuristic/live/demo/partial distinctions, actual tests
- Data migrations/import/export status and remaining risk
- Accessibility/user journey and release impact with measured evidence

## Risks and explicit unknowns

- No unsupported claims, no guessing, owner and reproduction path

## Next execution order

1. ...
2. ...
3. ...
```

## 14.3 Definition of operational success

The project must return to a state where **testable code and security claims can be trusted**: all required workflows actually execute; high/critical audit findings are repaired or justifiably scoped and reviewed; CodeQL scan and upload work; dependency upgrades are test-backed and paced; the actual PWA can be verified; scientific findings clearly distinguish evidence from generation; existing browser research data remains intact; and GitHub issues reflect real completion rather than document-only claims.

If any external blocker persists, **record it accurately and continue all independent authorized work**. Do not mask it, make up results or hold the entire engineering program hostage to a single bot’s quota.

---

# 15. IMMEDIATE FIRST EXECUTION — DO NOT SUBSTITUTE A STATUS MESSAGE

On receiving this prompt, perform these actions in sequence:

1. **Refresh** `main`, repository visibility, all open PRs, issues #394–#406, ruleset 20291814, Actions by event and the most recent scheduled Security jobs. Record timestamp and latest SHA. Detect and reconcile any change since Nov3.
2. **Inspect** #395 and reproduce precisely why the current Dependabot heads are missing required CI checks; inspect `.github/workflows/*`, GitHub App/Dependabot event permissions and GitHub Actions settings. Write a plausible, falsifiable root-cause matrix backed by run links.
3. **Investigate** #397 actual CodeQL feature entitlement and `Code scanning is not enabled` error. If a human settings change is needed, leave exact steps and a narrow blocker; never claim a source-code fix resolves it.
4. **Run or arrange a current frozen-lockfile security audit** for #396, identify all unignored current advisories and patch them via the smallest compatibility-safe dependency graph change. Do not bundle an unrelated UI refactor.
5. **Prepare/open the first focused remediation PR** on a fresh isolated branch, run locally appropriate checks and force the test to prove the original bug; then require real current-head CI/review convergence before any merge.
6. **Keep #394 and the relevant children updated** with reproducible evidence, opened PRs and new state; classify old defects/resolved work correctly.
7. **Continue autonomously** into the next unblocked highest-value workstream after each verified merge, while keeping main safe and all historical user data protected.

**Action > speculation. Evidence > confidence language. Stable green checks > bypassed green badges. Scientific integrity > impressive generated prose. Bounded verified progress > endless PR/reviewer cascades.**
