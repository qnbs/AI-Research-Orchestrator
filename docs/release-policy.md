# Release and version discipline (P1-6)

Production deploys on every merge to `main` (GitHub Pages). Package version and git tags are **not** bumped on every merge — they track user-facing releases.

## When `package.json` version changes

Bump semver in `package.json` when shipping a **named release** (typically after a remediation wave or feature milestone):

- **Patch** — bug fixes, non-breaking internal changes users should know about in CHANGELOG.
- **Minor** — new features, Dexie migrations that preserve import compatibility, notable UX changes.
- **Major** — breaking IndexedDB import/export shapes, removed provider support, or incompatible report schema.

Between named releases, `main` may advance many commits while `package.json` stays at e.g. `0.4.0`.

## Git tags and CHANGELOG

1. Move entries from `CHANGELOG.md` `[Unreleased]` into a dated version section.
2. Create an annotated tag: `git tag -a v0.4.2 -m "v0.4.2"`.
3. Push tag: `git push origin v0.4.2`.

Tags are optional for every `main` deploy but **required** when promoting `[Unreleased]` to a version section.

## Deploy identity (always available)

| Surface            | What users see                                                         |
| ------------------ | ---------------------------------------------------------------------- |
| Help → About       | `v{packageVersion} ({shortSha})` via `formatReleaseLabel()`            |
| JSON export `meta` | `appVersion`, `buildCommitSha`, `dexieSchemaVersion`, `swCacheVersion` |
| PDF cover          | `formatReportReleaseLabel(report)` (report provenance when present)    |
| PDF footer         | `formatReleaseLabel()` (current build)                                 |
| Research reports   | `generationProvenance` on completed orchestrator runs                  |

Build injection: `scripts/build-meta.mjs` → Vite/Vitest `define` (`__APP_VERSION__`, `__BUILD_COMMIT_SHA__`). CI uses `GITHUB_SHA`; local dev uses `git rev-parse --short HEAD` or `dev`.

## Report provenance

`ResearchReport.generationProvenance` is stamped in `useResearchSession` when a run completes:

- `appVersion`, `buildCommitSha`, `dexieSchemaVersion`, `swCacheVersion`
- `generatedAt`, `inferenceMode`, `providerId`, `model`

Legacy reports without provenance remain valid; exports still include current build meta in the JSON wrapper.

## Schema compatibility

- **Dexie:** bump `DEXIE_SCHEMA_VERSION` in `src/lib/appVersionConstants.ts` and add a migration in `databaseService.ts`. Must match the latest `db.version(N)` number.
- **Imports:** KB JSON import uses `isKnowledgeBaseEntry`; breaking shape changes require a migration path or version gate in import UI.
- **Reports:** optional fields (`generationProvenance`, `groundedSynthesis`, `articleId`) — older exports import when shapes match validators.

## Service worker / cache

- Bump `CACHE_VERSION` in `public/sw.js` when runtime cache names or strategies change.
- Keep `SW_CACHE_VERSION` in `appVersionConstants.ts` in sync (documented here; `sw-integrity.test.ts` guards naming).
- Asset hashes from Vite build provide JS/CSS cache busting on each deploy.

## Rollback

GitHub Pages rollback:

1. Identify the last good commit on `main` (deploy SHA in Help → About or export meta).
2. Prefer `git revert` of the bad merge commit(s) on `main` — avoid force-push `reset` on the shared branch. Cherry-pick fixes forward when revert is impractical.
3. Wait for `deploy.yml` to complete on the restored commit.
4. Users with open tabs may need to accept the service-worker update prompt.

There is no server-side rollback — all state is local IndexedDB.

## Release notes

- User-facing notes: `CHANGELOG.md` (English).
- PR disposition comments for large bot review batches (see rule `013`).
- Audit remediation: `docs/audits/` and `docs/prompts/` master prompts.

## CI

Blocking gates: `deploy.yml` plus E2E / cross-browser / a11y / security (see `docs/ci-branch-governance.md`). Merge to `main` also requires review quiescence on the same head (`docs/pr-merge-gate.md`). DeepSource JavaScript analyzer is **off** (`docs/project-facts.json` → `staticAnalysis.deepsourceJavaScriptEnabled: false`); ESLint + `deploy.yml` are authoritative for TS/TSX — see `docs/deepsource-setup.md`. After high-risk scientific or security merges, prefer one green `main` deploy before stacking unrelated large features.

## Related

- `docs/pr-merge-gate.md` — dual merge gate (CI + review quiescence)
- `CONTRIBUTING.md` — PR correction loop before merge
- `.cursor/rules/013-pr-review-correction-loop.mdc`
- `docs/ci-branch-governance.md` — required checks, concurrency, artifacts
- `docs/deepsource-disposition.md` — static analysis disposition
