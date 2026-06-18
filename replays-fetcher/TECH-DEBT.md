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

## Discovery drops the listing game-date → `discoveredAt` / `replay_timestamp` unpopulated

**Recorded:** 2026-06-18 (surfaced by the golden run-once oracle on the real sg.zone corpus,
quick `260618-b43`).

**Observed.** `extractReplayRows` (`src/discovery/html.ts`) parses the mission link, world (map),
and server-id cells but **not** the listing's "Game date" column (the 4th `<td>`, format
`DD.MM.YYYY HH:MM`). So real sg.zone discovery never sets `candidate.discoveredAt`, and
`staging/payload.ts#toPayload` consequently omits `discoveredAt` from `promotion_evidence`.
Separately, the staging `replay_timestamp` column stays NULL for sg.zone rows whose filename does
not match the `YYYY_MM_DD__HH_MM_SS__` prefix. The golden run-once test originally asserted
`promotion_evidence.discoveredAt` was always present — true only for the hand-built fixtures in the
other integration tests; the real captured corpus proved it absent (the oracle's first real catch).

**Impact (cross-app).** `server-2` promotes `promotion_evidence` and `web` surfaces the replay date;
without a source-derived game date the canonical replay has only the filename-prefix timestamp (when
it matches) plus the fetcher's own `fetchedAt` (always recorded). This is a discovery-completeness
gap, not a correctness bug — nothing is corrupted, the date is just not captured.

**Fix approach.** Parse the "Game date" cell in `extractReplayRows` into an ISO timestamp and thread
it through candidate metadata → `promotion_evidence.discoveredAt` and/or the `replay_timestamp`
staging column. **Cross-app:** coordinate with `server-2` on which field is the canonical replay
date (staging schema + promotion_evidence consumer) before changing the contract. Once captured,
update the golden run-once oracle (`src/run/golden-e2e.integration.test.ts`) — it currently **pins
the absence** (`discoveredAt` `toBeUndefined`), so the assertion must flip when discovery starts
setting it.

**Priority:** medium. Operator/UI-visible metadata gap with `server-2`/`web` blast radius — plan it
(not an unattended fetcher-only change). Do via `gsd-quick` once the canonical-date field is agreed.
