# replays-fetcher — Tech-debt backlog

Durable list of known debt to clear later. Not a brief; no behavior changes implied.

## ✅ RESOLVED — Watch daemon: dedup by `source_replay_id` BEFORE fetching bytes (latency + source load)

**Resolved:** 2026-06-23 via quick task `260623-x57` (commits `496aa3d` + `aba6a54`; integration-oracle
follow-up `3c2081f`). The fix went one band further than this entry proposed: the existence check is
threaded into **discovery** so an already-staged trustworthy `externalId` skips the per-row **detail
fetch** too — not just the byte download. A no-new-replay cycle now fetches only the page-1 list and runs
30 cheap PG existence checks; the skip is surfaced as a distinct `skippedPreDetail` count, the cannot-miss
guard (`isTrustworthyId`) is preserved, and the post-fetch DEDUP-01 gate stays as defense-in-depth.
Live staging cadence dropped from ~21 s/cycle to ~120 ms of real work per cycle (then governed by the
inter-cycle interval — see the new "watch cadence" debt item below). Original analysis kept for history:

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

## ✅ LIKELY RESOLVED (steady state) — Staging dedup inserts-and-catches → spams postgres `ERROR: duplicate key` logs

**Update 2026-06-23.** The `260623-x57` pre-detail dedup (item 1 above) skips already-staged rows
**at discovery**, so in a no-new-replay cycle they never reach `ingestPage` and **no `INSERT` is
attempted** — the duplicate-key ERROR spam should disappear for the steady-state case (live cycles now
report `skippedPreDetail: 30, staged: 0`, i.e. zero insert attempts). The `ON CONFLICT … DO NOTHING`
hardening is still worth doing for the genuinely-concurrent / untrustworthy-`externalId` paths that DO
insert, but the dominant noise source is gone. **Confirm in Loki** that the `solid-stats-staging` postgres
`duplicate key` ERROR stream has actually dried up before closing this fully. Original analysis kept below:

**Recorded:** 2026-06-19 (surfaced reading the staging postgres log stream in Loki during a
deploy-status check — it was the *only* ERROR-level stream in the namespace over 24 h).

**Observed.** Every watch cycle the staging-ingest dedup attempts an `INSERT` of each page-1
record and relies on the unique constraint `ingest_staging_records_checksum_object_key_key` to
reject duplicates (insert-and-catch-violation), rather than checking existence first. The app
handles the rejection correctly — the cycle reports `duplicate 30 / failed 0 / ok:true` — but
**postgres logs a `ERROR: duplicate key value violates unique constraint` line per rejected row**.
At ~30 duplicates every ~21 s cycle that is ~30 ERRORs/cycle, 24/7 — the dominant (effectively
only) ERROR stream in the `solid-stats-staging` postgres logs. Pure noise: nothing is lost or
corrupted, but it buries any genuine postgres error and inflates log volume.

**Fix approach.** Make the dedup non-throwing: `INSERT … ON CONFLICT (checksum, object_key) DO
NOTHING` (or a `SELECT` existence check before insert). The conflict is then resolved silently in
the DB with no ERROR log line. **This is the same root cause as the first item above** ("dedup by
`source_replay_id` BEFORE fetching bytes"): if that pre-fetch existence check lands, no duplicate
`INSERT` is ever attempted and this log noise disappears as a side effect — so prefer folding the
two into one change rather than patching `ON CONFLICT` separately.

**Priority:** low (cosmetic — log hygiene only, no functional impact), but trivial to clear and it
restores signal to the postgres error log. Do via `gsd-quick` in `replays-fetcher`, ideally bundled
with the `source_replay_id` pre-fetch dedup work.

## Watch cycle no longer throttled by `requestSpacingMs` — pacing floor doesn't bound a single list read (Cloudflare collision risk)

**Recorded:** 2026-06-23 (surfaced right after the `260623-x57` pre-detail dedup made the cycle cheap).

**Observed.** Before `260623-x57`, each cycle's 30 spaced detail fetches were the de-facto throttle —
they stretched a cycle to ~21 s, so the page-1 list URL on sg.zone was hit only ~once / 21 s. With the
detail fetches gone, the cycle is just one list read + 30 PG checks (~120 ms), and at `intervalMs=0` the
loop spun at **~3.2 cycles/s** (measured: mean gap 315 ms, min 116 ms) — a steady ~3.2 req/s, ~270k
req/day, to a **Cloudflare-fronted, `cache-control: no-store` / `cf-cache-status: DYNAMIC`** URL (so every
poll reaches origin). That is exactly the pattern Cloudflare rate-limiting / Bot Fight Mode flags; on a
403/429 the fetcher would then retry (`REPLAY_SOURCE_RETRY_ATTEMPTS=8`) and make it worse.

**Root-cause smell (the real bug).** The deployment runs `REPLAY_SOURCE_REQUEST_SPACING_MS=500`, whose
pacer floor was supposed to cap the loop at ≤2 cycles/s — but the measured 315 ms gaps / 116 ms minimum
are **below** that floor, i.e. the spacing floor is **not** bounding the single per-cycle list read. The
floor was masked for years by the 30 detail fetches; now the list read is the only request and it slips
the floor. Worth a `gsd-debug`: confirm whether the watch-loop `createPacer(requestSpacingMs)` /
`pacer.awaitFloor()` actually persists across cycles for the list fetch, or whether a fresh paced client
per cycle resets the "first call never sleeps" rule so the floor never applies.

**Mitigation already applied (live, by hand — see drift item below).** Set
`REPLAY_WATCH_INTERVAL_MS=3000` on the staging deployment → cadence dropped to ~1 cycle / 3.2 s
(~0.31 req/s, ~27k req/day), still well within "detect new replays within seconds". This is a band-aid
on the symptom; the pacing-floor bug remains and would re-bite if anyone sets `interval=0` again.

**Fix approach.** (1) `gsd-debug` the spacing-floor-on-single-list-read bug so `requestSpacingMs` actually
bounds the list poll regardless of `intervalMs`. (2) Decide the intended steady-state cadence as an
explicit config default (interval and/or a list-read floor), not an emergent side effect of how many
fetches a cycle happens to make. Coordinate the chosen rate with whoever owns the sg.zone relationship.

**Priority:** high — it is live external-source load against a Cloudflare origin; mitigated but not fixed.

## Fetcher sends no custom `User-Agent` (Cloudflare bot-flag risk)

**Recorded:** 2026-06-23.

**Observed.** `src/discovery/source-client.ts:71` issues a bare `fetch(url, { signal })` with no headers,
so every source request carries Node/undici's **default** `User-Agent`. sg.zone is Cloudflare-fronted
(confirmed: `server: cloudflare`, `cf-ray`), and the codebase already anticipates CF responses
(`src/discovery/source-client-error.ts:123` checks `cf-ray` + handles `retry-after`). A default runtime UA
is a first-order bot-flag signal — combined with the steady polling above, it raises the odds of a
challenge/block.

**Fix approach.** Send a stable, identifying `User-Agent` (e.g. `solidstats-replays-fetcher/<version>
(+contact)`) on every source request, ideally from config so it can be tuned without a rebuild. Small,
local, fetcher-only change — `gsd-fast`/`gsd-quick` in `replays-fetcher` per `solidstats-fetcher-ts-conventions`.

**Priority:** medium — cheap insurance against the Cloudflare-collision risk above; do it alongside the
cadence fix.

## Live-cluster drift: watch Deployment image + `REPLAY_WATCH_INTERVAL_MS` set by hand, not in any repo manifest

**Recorded:** 2026-06-23.

**Observed.** The `solid-stats-staging` `deployment/replays-fetcher-watch` is **not** described by any
manifest in `replays-fetcher` — the repo's only k8s file is `deploy/k8s/staging/cronjob.yaml`, which is the
**run-once** CronJob (`args: ["watch"]` lives only on the live Deployment). During this session two changes
were applied directly to the cluster: `kubectl set image …:3c2081f…` (roll to the new code) and
`kubectl set env REPLAY_WATCH_INTERVAL_MS=3000` (the throttle above). Neither is captured in git, so the
next `kubectl apply` / GitOps reconcile from wherever the watch Deployment's source-of-truth lives will
**revert both** — re-pinning the old image and dropping the interval back to its flooding default.

Separately: the CD workflow (`.github/workflows/cd.yml`) only publishes `:<sha>` and `:<branch>` tags — no
`:latest`. The run-once CronJob manifest pins `:latest`, which CD never pushes, so that manifest is also
stale relative to what CD produces.

**Fix approach.** Find the watch Deployment's actual source-of-truth (likely `infrastructure` or a chart —
cross-check `plans/infrastructure/TECH-DEBT.md`) and codify there: the image tag/rollout strategy and
`REPLAY_WATCH_INTERVAL_MS=3000` (and the real spacing once the pacing bug is fixed). Reconcile the image-tag
story between CD's `:sha`/`:branch` output and what the manifests pin. **Cross-app:** infrastructure-owned.

**Priority:** high — until codified, every reconcile silently reintroduces the Cloudflare-flooding behavior
we just mitigated.
