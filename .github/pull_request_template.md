# Summary

<!-- What does this PR do and why? -->

## Test plan

<!-- How was this verified? typecheck / lint / test:coverage / build / bundle:budget / manual check -->

## Checklist

- [ ] `CHANGELOG.md` updated if this PR changes user-facing behavior or adds/removes a feature
- [ ] Dual merge gate (`docs/pr-merge-gate.md`): all required CI checks are green on this head
- [ ] Dual merge gate: real latest-head CodeRabbit review (`APPROVED`/`COMMENTED`) **or** `011` **(b)**/**(c)** stand-in **or** documented rate-limit / no-review clause **(d)**
- [ ] `@deepsourcebot review` posted (first line exact) after open / every fix push
- [ ] Arrival wait complete — no in-scope bot still “Reviewing” on this head
- [ ] GraphQL threads resolved **and** body-only / outside-diff / human review-body findings disposed (`fixed` / `replied` / `deferred` with rationale)
- [ ] No active human `CHANGES_REQUESTED` on this head

## Theme visual QA (`NOW-P1-THEME-QA`)

Check **exactly one** path: **N/A**, or the contrast + theme items that apply. Do **not** add a screenshot suite to CI.

- [ ] N/A — this PR does not change UI chrome, overlays, charts, or theme tokens (leave the items below unchecked)
- [ ] `pnpm run check:contrast` — required when tokens, chrome colors, **or overlay/glass colors** change
- [ ] Default (`dark`): primary CTA, header, bottom nav / More sheet, dialogs, empty states, charts and their accessible table twins — text and `border-border` readable
- [ ] Light: same surfaces; no leftover `border-white/*` on glass; overlays still WCAG 2.2 AA
- [ ] Matrix: same surfaces; status is not color-only; focus rings visible
- [ ] Charts (when Recharts surfaces change): labels, axes, legends, tooltip/focus, accessible table twin; status is not color-only
