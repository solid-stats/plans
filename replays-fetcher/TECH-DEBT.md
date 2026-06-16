# replays-fetcher — Tech-debt backlog

Durable list of known debt to clear later. Not a brief; no behavior changes implied.

## Watch daemon: dedup by `source_replay_id` BEFORE fetching bytes (latency + source load)

**Recorded:** 2026-06-17 (after the watch Deployment went live on staging).

**Observed.** The `watch` daemon polls page 1 continuously (interval=0). Dedup is
**checksum-after-download**, so every cycle it re-fetches all ~30 page-1 replays' bytes,
computes checksums, finds them all duplicates, and skips (`stored 0 / staged 0 / dup 30`).
Live cadence ≈ **~21 s/cycle**, a steady **~2.7 req/s** re-downloading the same ~30 replays
on sg.zone 24/7. Consequences: (a) new-replay detection latency ≈ one cycle ≈ ~21 s — works,
but undercuts the "моментально" goal; (b) constant redundant load on sg.zone + S3.

**Optimization.** In the page-1 cycle, skip any discovered candidate whose `source_replay_id`
is already present in staging **before** fetching its bytes (a cheap PG existence check). A
no-new-replay cycle then collapses to just the page-1 **list** fetch (~1 request, sub-second)
→ true near-instant detection + minimal source load. New (unknown-id) replays are fetched +
stored exactly as today.

**Risk to weigh (why not done unattended).** The pre-fetch skip must NEVER drop a genuinely
new replay — a bug here silently loses ingest coverage, the exact property this whole parity
effort secured. `source_replay_id` is a safe key (sg.zone replays are immutable), but this
needs careful tests + a new image + redeploy, and review with a human in the loop. Current
behavior is correct (fetches + checksums everything, cannot miss) — just wasteful. Deferred,
not implemented during the unattended session that deployed the watcher.

**Priority:** medium-high (it's the difference between ~21 s and sub-second detection, and it
removes sustained redundant load on the external source). Do via `gsd-quick` in `replays-fetcher`.

## Split the files that carry a file-level `oxlint-disable max-lines`

**Recorded:** 2026-06-16

**Problem.** Four source files exceed the `max-lines` limit and suppress it with a
file-level `/* oxlint-disable max-lines … */` instead of being split. This violates
`solidstats-fetcher-ts-conventions` §A lint-suppression policy:

> structural limits (max-lines, max-lines-per-function) are **split, never disabled** —
> `oxlint-disable max-lines` on a file is a smell that the file holds too many
> responsibilities.

It is the same anti-pattern the conventions already called out for `cli.ts` (which was
split). The suppressions were introduced during the Phase 16 oxlint migration (commit
`fd7e6f0` — "fix(16-03): clear all oxlint findings — lint exits 0"): the migration
disabled the rule per-file to get `lint` to exit 0 rather than splitting the files. The
debt was never cleared.

**Files (line counts on `replays-fetcher` master, 2026-06-16):**

| File | Lines | Band | Notes |
|------|-------|------|-------|
| `src/run/run-once.ts` | 1130 (→ ~1046 after the watch-daemon `ingestPage` extraction) | orchestration | the orchestrator god-file; flagged by the user 2026-06-16 |
| `src/discovery/discover.ts` | 702 | capability | |
| `src/discovery/source-client.ts` | 536 | adapter | |
| `src/storage/replay-byte-client.ts` | 491 | adapter | |

**Fix approach.** Pure refactor — split each file into cohesive modules **within its band**
(downward-only imports preserved) so the `oxlint-disable max-lines` can be removed honestly,
never re-disabled. Behavior must stay identical: `pnpm verify` green, 100% reachable-source
coverage preserved, depcruise fences intact. Do it through `solidstats-fetcher-ts-conventions`
(§A bands) + `solidstats-fetcher-ts-tests`.

Suggested seams for `run-once.ts` (the worst offender; the watch-daemon task already started
the decomposition by extracting `run/ingest-page.ts` — continue from there):

- **page-loop** — `runPageLoop`, `completeOkPage`, `processPage`, `applyRateLimitThrottle`,
  `emitPageRateLine` / `emitPageFailureEvent`, the page-rate derivations.
- **checkpoint-state** — `resolveResumeState`, `buildLoopState`, `buildCheckpoint` /
  `writePageCheckpoint` / `writeFinalCheckpoint`, `startFresh` / `resumeFrom`,
  `aggregatePageCounts`, `writeInput`.
- **assemble-result** — `assembleResult`, `writeEvidence`, the `derive*` helpers and the
  `*Option` builders.
- **runtime** — `buildRunRuntime`.

The other three files are smaller and independent — split each per its own band
responsibilities as separate, smaller tasks.

**Priority:** medium. Pure tech debt, no functional impact; safe to schedule after the
watch-daemon work lands (it touches `run/`).
