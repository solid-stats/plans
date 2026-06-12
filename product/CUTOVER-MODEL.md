# Solid Stats 2 — Cutover Model (parallel run + validation)

**Last updated:** 2026-06-13

How legacy and the new `-2` runtime coexist during the switch, and what
"validation" can and cannot mean given the two stacks are **not identical**.
Refines the cutover bar in [RELEASE-PLAN.md](RELEASE-PLAN.md) and the diff
contract in the `infrastructure` repo's `docs/diff-readiness.md`.

## Premise: the parsers are intentionally non-identical

v2 is a deliberate redesign of the legacy stack (`replays-parser` + `server`),
verified for correctness against legacy — **not a byte-for-byte port**. The new
`replay-parser-2` / `server-2` compute statistics differently on purpose.

**Consequence:** old-vs-new comparison **cannot** be an automated equality
check. Divergence in computed values is expected behaviour, not a defect. Any
model that treats "values differ ⇒ bug" is wrong for this product.

## Two distinct traffics — "parallel" means different things

The system has two separate flows, and running them "in parallel" has different
mechanics and different limits for each.

### 1. Ingest traffic (replays → stats) — true parallel

```
one replay feed
   ├──→ legacy parser        → legacy DB → legacy stats
   └──→ replay-parser-2       → new DB    → new stats
```

Both stacks consume the **same replays** live and independently build their own
stat databases. Users never see this directly. This is genuine parallel
operation and is what makes the new DB ready (backfilled) at cutover.

### 2. Serving traffic (API reads) — one answer to the user

A user must get **one** answer; you cannot show two different stat values. So
serving parallelism is **shadow/mirror**, not dual-serve:

```
user request → nginx ──→ legacy   → response to user
                    └····→ server-2 (mirror copy, response discarded / observed)
```

The user is served by legacy until the cutover lever flips. The mirror exists
for observation, not for answering the user twice.

## What can and cannot be auto-validated

Because values diverge by design, automated checks are limited to invariants
that must hold **regardless of parser logic**:

| Auto-detected (`strict_failures`) | Human review (`allowlisted_known_differences`) |
|-----------------------------------|------------------------------------------------|
| missing matches / replays vs legacy | intentional changes to aggregation / scoring |
| missing players                   | rating / formula redesigns                     |
| parser errors / crashes on replays legacy handled | new or dropped fields by design |
| aggregate totals outside a **declared tolerance** | known diffs (e.g. `deaths.byTeamkills`) |

This is exactly the split already encoded in the `infrastructure` repo's
`docs/diff-readiness.md`: automation catches **coverage / integrity
regressions**; the values themselves are a human-reviewed gate with an allowlist
and an expiry/review date per entry. The decision stays `review_required`, never
`approved_for_cutover`.

## What the parallel run is actually for

Since value-equality is impossible, the parallel run's value is **not** "catch
discrepancies." It is:

1. **Backfill** — the new DB accumulates real stats so it is not empty at cutover.
2. **Rollback safety** — legacy is kept warm; the cutover lever (a single nginx
   `upstream` edit) reverts in one move while legacy still serves.
3. **Load proof** — the new stack is shown to handle real production volume.
4. **Coverage check** — the *only* thing auto-compared (no data lost vs legacy).

## Cutover sequence

```
now           legacy = prod;  new = staging (no user traffic)
parallel ─┐   both live: same replay feed ingested by both; API mirrored to new
          ├─ flip nginx upstream → users on new; legacy kept WARM (rollback)
          ├─ post-cutover smoke check + observe coverage/load on live traffic
          └─ retire legacy ONLY after the new prod proves stable (not at flip)
```

The lever and warm-legacy rollback are the `infrastructure` v2 milestone's
Phase 11.

## Open decision — cutover timing gate

The real question is **not** "how long to compare for equality" (impossible) but
**how long to accumulate new stats and observe coverage + load before flipping**,
and how long to keep legacy warm after.

Currently unspecified in the roadmap — it is left to operator judgement. Recommend
making it an explicit Phase 11 gate, e.g. "flip only after N days of green
coverage diff + stable load + passing smoke check; retire legacy only after M
days green on live traffic." Pick concrete N/M when planning Phase 11.

## Cross-references

- [RELEASE-PLAN.md](RELEASE-PLAN.md) — pre-production decisions and the cutover bar.
- `infrastructure` repo: `docs/diff-readiness.md` (diff contract),
  `infrastructure/briefs/v2-backend-parity-and-full-run.md` (Phase 4 diff evidence).
- [archive/product/V2-CUTOVER-REVIEW.md](../archive/product/V2-CUTOVER-REVIEW.md) —
  archived historical gap analysis.
