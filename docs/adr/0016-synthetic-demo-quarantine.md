# ADR 0016: Synthetic Demo Quarantine

- **Status:** Accepted — 2026-08-02
- **Date:** 2026-08-02
- **Supersedes (in part):** ADR 0007 / ADR 0009 silent offline/empty-result demo corpus substitution

## Context

The Non-AI research stream previously fell back to a curated `demo:*` corpus when PubMed/arXiv returned no results, threw, or the browser was offline. Synthesis text still claimed “PubMed and arXiv sources,” identifiers were labeled as PMID (including fake PubMed URLs), and extractive-template trust assessment could mark claims `verified` against synthetic abstracts.

That path made educational fixtures indistinguishable from retrieved literature — a scientific-integrity failure.

## Decision

1. Introduce `ArticleSourceClass` and `ReportCorpusClass` on articles/reports.
2. Require explicit `ResearchInput.educationalDemoMode` to load the synthetic demo corpus.
3. Empty retrieval, retrieval failure, and offline-without-demo produce an `empty-retrieval` report — never silent demo substitution.
4. Demo reports use honest synthesis language, `Demo ID` labels (no PubMed URLs), permanent UI/export watermark, and never a `verified` trust label.
5. Dexie schema v6 migrates persisted `demo:*` rows to `sourceClass: demo-synthetic` / `corpusClass: demo-only`.

## Consequences

- Offline heuristic research without the educational-demo checkbox is empty until the user reconnects or opts in.
- First-run KB demo seed remains an explicit educational surface (`demo-` entry ids + banner).
- ADR 0007/0009 “offline falls back to demo corpus” guidance is superseded for research runs; the demo corpus itself remains as an opt-in educational fixture.
