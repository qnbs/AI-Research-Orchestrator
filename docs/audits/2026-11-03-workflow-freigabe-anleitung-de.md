# GitHub Actions auf Pull Requests freigeben (Maintainer)

> **English (authoritative for CI facts):** `docs/audits/2026-11-03-workflow-approval-guide.md` — diese Datei ist eine parallele Kurzanleitung auf Deutsch.

Kurzanleitung für **PR #407** und alle anderen PRs, bei denen **keine** Jobs wie `Typecheck, Lint & Tests` oder `Playwright E2E` starten.

## Voraussetzungen

- Du bist **Maintainer** oder **Admin** im Repo `qnbs/AI-Research-Orchestrator`.
- Du bist in GitHub eingeloggt.

## Schritt 1: Pull Request öffnen

1. Browser: https://github.com/qnbs/AI-Research-Orchestrator/pull/407
2. Oben siehst du den Merge-Bereich und darunter den Bereich **Checks**.

## Schritt 2: Workflows genehmigen (falls angezeigt)

GitHub zeigt bei vielen Repos einen **gelben Hinweis**, z. B.:

- _„Some checks were not successful“_ **oder**
- _„Workflow runs awaiting approval from a maintainer“_ **oder**
- ein Button **„Approve and run workflows“** / **„Workflows genehmigen und ausführen“**

**So geht’s:**

1. Klicke auf den Tab **Checks** (neben _Conversation_ und _Files changed_).
2. Suche ganz oben oder in der Merge-Box nach **Approve and run workflows**.
3. Klicke darauf und bestätige.

Danach sollten innerhalb von 1–2 Minuten Runs erscheinen, u. a.:

- **Deploy to GitHub Pages** → `Typecheck, Lint & Tests`, `Production Build`
- **E2E Tests** → `Playwright E2E`
- **Security** → `CodeQL`, `pnpm audit (high+)`, …

## Schritt 3: Wenn der Button **nicht** erscheint

Dann blockiert meist eine **Repository- oder Organisations-Einstellung** (nicht der PR-Inhalt):

1. Repo → **Settings** → **Actions** → **General**
2. Unter **Fork pull request workflows** / **Workflow-Berechtigungen**:
   - **Actions permissions:** „Allow all actions and reusable workflows“ (oder eure org-konforme Variante)
   - Prüfen, ob **Genehmigung für externe Mitwirkende** so streng ist, dass **Dependabot- und Agent-PRs** hängen bleiben. Oft hilft: Genehmigung nur für **First-time contributors**, nicht pauschal für alle „outside collaborators“ — **org-Policy beachten**.
3. **Settings** → **Actions** → **General** → **Workflow permissions**: Repository default **`GITHUB_TOKEN` read-only** beibehalten (Least Privilege). Schreibrechte nur dort, wo Workflows sie explizit brauchen (z. B. `security-events: write` im CodeQL-Job in `security.yml`) — **nicht** pauschal „Read and write permissions“ für alle Workflows aktivieren.

Organisation: zusätzlich **Organization settings → Actions** prüfen (Budget, Disable Actions, Allowed actions).

## Schritt 4: Code Scanning (#397)

Unabhängig von Schritt 2:

1. **Settings** → **Code security and analysis** (oder **Security**)
2. **Code scanning** / **CodeQL** für dieses Repository **aktivieren**
3. Einen **Security**-Workflow-Lauf abwarten oder **Actions → Security → Run workflow** (Branch `main` oder PR-Branch, wenn erlaubt)

Ohne diesen Schritt bleibt CodeQL rot mit _„Code scanning is not enabled“_.

## Erfolg prüfen

- Tab **Checks** auf PR #407: alle **ruleset-** und **workflow-level** Kontexte aus `docs/ci-branch-governance.md` laufen und werden grün (kann 30–60+ Minuten dauern), einschließlich **`PWA service-worker registration`** (workflow-level, noch nicht im Ruleset #399).
- In **Actions** erscheinen neue Runs mit Branch `cursor/p0-audit-recovery-nov2026-33e3`.

Englische technische Details: `docs/audits/2026-11-03-p0-operational-runbook.md` und `docs/audits/2026-11-03-workflow-approval-guide.md`.

## Schritt 5: Wenn Workflows trotzdem nicht starten

Nach einer Settings-Änderung startet GitHub **nicht automatisch** alte PR-Commits neu. Entweder:

1. Am PR **Checks → Re-run all jobs** (falls sichtbar), **oder**
2. Einen neuen Commit auf den PR-Branch pushen (leerer Commit reicht), **oder**
3. PR kurz schließen und wieder öffnen (selten nötig).

PR `#407` wurde am 2026-11-03 nach Settings-Fix mit Commit `13d8c3f` (`ci: re-trigger PR workflows…`) erfolgreich neu angestoßen.
