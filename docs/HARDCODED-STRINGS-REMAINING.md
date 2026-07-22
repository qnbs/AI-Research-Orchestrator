# Remaining Hardcoded Strings — Implementation Notes

## Overview

This document tracks hardcoded strings that still need extraction to the i18n system.

**2026-07-22 update:** re-validated against current `main` (post PR #67). The
`ApiKeySettings.tsx` and `OnboardingView.tsx` sections that used to live in this
document are **done** — every string this doc originally flagged in both files now goes
through `t()` (confirmed: `OnboardingView.tsx` has 12 `t()` call sites, zero hardcoded
strings remain). Both sections have been removed below rather than left as stale
"still needed" items.

The one section that is still fully accurate is `HelpView.tsx`, tracked below. It's
scoped as its own dedicated migration wave (Wave 8 of the i18n migration plan) rather
than folded into a broader pass, since it's the single largest hardcoded-content block
in the app (808 lines, zero `t()` calls today) and deserves an isolated, carefully
reviewed PR.

---

## HelpView.tsx — All Hardcoded Strings (still open)

`src/components/HelpView.tsx` has **zero** `t()` calls as of this writing. Everything
below is still hardcoded English:

- **About section**: app name/description, "Core Principles" (Privacy First, AI as
  Assistant, Traceability), disclaimer text.
- **Guide topics** (a `useMemo`'d list): "Understanding the Core Workflows", "Using the
  Orchestrator", "Using the Research Tab", "Using the Author Hub", "Using the Journal
  Hub", "Exporting Your Research", "Managing Your Knowledge Base", and each topic's full
  body prose.
- **FAQ items**: "Do I need an API key?", "Is my data private?", "How does the AI
  work?", and the rest of the FAQ list, questions and answers both.
- **Glossary items**: "Orchestrator", "Knowledge Base", "Author Hub", and the rest of
  the term/definition pairs.

**Plan:** migrate in full as its own PR (`help.*` translation keys), per the i18n
migration plan's Wave 8. Do not partially migrate — this doc should be deleted once
that PR lands, since at that point there will be nothing left to track here.

---

_Document created: 2026-07-18. Re-validated and pruned 2026-07-22._
