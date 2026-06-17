# Docs Audit — 2026-06-17

Staleness audit of the `plans` repo against the 2026-06-17 reality (SG coverage parity
closed and accepted at the replay-ID level; SG value parity re-measured to +0.5% with deaths
fixed; F9/F5 deployed to staging; F14 deferred to v4; fetcher watch-daemon + nightly CronJob
deployed). All changes left in the working tree for human review — no commit, no push.

## Summary counts

- **Updated:** 4 files
- **Archived:** 1 file (`git mv` into `archive/`)
- **Delete candidates:** 0
- **Cross-ref fixes:** 7 link/path corrections across 4 files

## Updated files (what changed)

- `product/PARITY-BASELINE-FINDINGS.md` — corrected the header Status (F9/F5 now DEPLOYED on
  image `0fe3326`, 1Gi pod + `--max-old-space-size=768`; coverage accepted by user); inserted a
  dated **Update 2026-06-17** note superseding the stale -1.4%/-13% figures (coverage 2117 =
  2111 +8 -2; value +0.5% games/kills/deaths, +0.9% players, deaths -13% -> +0.5%, zero
  non-rename player >=40 kills; F14 -> v4); marked the F9 and F5 rows Resolved/deployed.
- `replays-fetcher/briefs/fetcher-architecture-conventions.md` — appended an **Update 2026-06-17**
  note to the DRAFT/PENDING Status line: convergence is DONE (decided in
  `skills/decisions/0002-replays-fetcher-architecture.md`, encoded in the
  `solidstats-fetcher-ts-conventions` skill); brief retained for provenance.
- `replays-fetcher/briefs/fetcher-architecture-code-followups.md` — fixed 4 broken depcruise
  paths (now point at `plans/archive/replays-fetcher/briefs/...`); added an **Update 2026-06-17**
  note to the STATUS block (god-file splits now tracked in `replays-fetcher/TECH-DEBT.md`,
  `run-once.ts` ~1046 lines; only the single shared S3/pg client item remains open).
- `infrastructure/briefs/v2-backend-parity-and-full-run.md` — added an **Update 2026-06-17** note
  (infra v2.0 shipped 2026-06-13, only production flip deferred; parity measured/accepted);
  marked Global Sequence steps 2 (replays-fetcher) and 3 (infrastructure) `✅ shipped`; corrected
  the Phase 4 acceptance line — deaths divergence resolved (+0.5%), carried known-difference is
  now the F14 identity re-partition. **Note: disposition override below.**

## Archived files (old -> new path)

- `replays-fetcher/briefs/v2-backend-parity-and-full-run.md`
  -> `archive/replays-fetcher/briefs/v2-backend-parity-and-full-run.md`
  Reason: milestone delivered — full-corpus ingest resilience shipped (cap-truncation root cause
  fixed via uncapped re-crawl + stop-on-all-duplicate `truncated` RunStatus; watch Deployment +
  nightly run-once CronJob on staging; corpus 23556 -> 23682; SG coverage parity closed and
  user-accepted). Prepended an `ARCHIVED 2026-06-17` banner; added a row to `archive/README.md`.
  Its sibling/self links keep their original pre-archive paths per the archive convention.

## Cross-ref fixes

1. `product/RELEASE-PLAN.md:167` — replays-fetcher brief link -> `../archive/replays-fetcher/...`
   (archived 2026-06-17).
2. `infrastructure/briefs/v2-backend-parity-and-full-run.md:13` — Cross-App Briefs reference ->
   `plans/archive/replays-fetcher/...`.
3. `web/briefs/v2-backend-parity-and-full-run.md:13` — Cross-App Briefs reference ->
   `plans/archive/replays-fetcher/...`.
4-7. `replays-fetcher/briefs/fetcher-architecture-code-followups.md` (lines ~72, 73, 96, 119) —
   four `plans/replays-fetcher/briefs/fetcher-dependency-cruiser.cjs` /
   `fetcher-depcruise-notes.md` references repointed to their actual location under
   `plans/archive/replays-fetcher/briefs/`.

Archived sibling copies (`archive/server-2/...`, `archive/replay-parser-2/...`) that reference
`plans/replays-fetcher/briefs/v2-backend-parity-and-full-run.md` were intentionally left
unchanged: per the archive convention documented in `archive/README.md`, archived files keep
their original pre-archive repo-relative paths as a frozen historical record.

## Disposition overrides (conservative)

- `infrastructure/briefs/v2-backend-parity-and-full-run.md` — the per-file plan contained **two
  conflicting dispositions** for this path: one `archive` (status `superseded`) and one `update`
  (status `stale-fixable`). The `update` entry carried the stronger, more detailed reasoning and
  explicitly argued against archiving (Phase 3 re-parity per RELEASE-PLAN is not fully closed; the
  kept `web` and `replays-fetcher` briefs still link to this as an active sequence step). Per the
  instruction to override conservatively and prefer keep over more destructive actions, this file
  was **kept and updated**, not archived. This also avoids breaking the inbound links from kept
  docs.

## Delete candidates (await human confirm)

None. No file in the disposition plan was marked `delete`.
