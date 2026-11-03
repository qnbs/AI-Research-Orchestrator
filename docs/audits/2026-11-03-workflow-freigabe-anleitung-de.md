# GitHub Actions auf Pull Requests freigeben (Maintainer)

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
3. **Settings** → **Actions** → **General** → **Workflow permissions**: „Read and write permissions“ für `GITHUB_TOKEN`, soweit org erlaubt.

Organisation: zusätzlich **Organization settings → Actions** prüfen (Budget, Disable Actions, Allowed actions).

## Schritt 4: Code Scanning (#397)

Unabhängig von Schritt 2:

1. **Settings** → **Code security and analysis** (oder **Security**)
2. **Code scanning** / **CodeQL** für dieses Repository **aktivieren**
3. Einen **Security**-Workflow-Lauf abwarten oder **Actions → Security → Run workflow** (Branch `main` oder PR-Branch, wenn erlaubt)

Ohne diesen Schritt bleibt CodeQL rot mit _„Code scanning is not enabled“_.

## Erfolg prüfen

- Tab **Checks** auf PR #407: alle **required** Kontexte aus `docs/ci-branch-governance.md` laufen und werden grün (kann 30–60+ Minuten dauern).
- In **Actions** erscheinen neue Runs mit Branch `cursor/p0-audit-recovery-nov2026-33e3`.

Englische technische Details: `docs/audits/2026-11-03-p0-operational-runbook.md`.
