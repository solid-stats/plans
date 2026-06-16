# replays-fetcher — Architecture decisions

## ADR 2026-06-16: always-on `watch` daemon runtime (alongside `run-once`)

**Status:** accepted — user-approved override of the prior run-once-only runtime shape.

**Why this lives here, not in the conventions skill.** `solidstats-fetcher-ts-conventions`
§A ("Runtime shape: a scheduled run-once job … no always-on crawler") is sourced from the
separate `solid-stats/skills` repo and vendored read-only into projects (`skills-lock.json`,
sha-pinned). It must not be edited in-project. This ADR records the override; the §A wording
should be updated **in `solid-stats/skills`** as a follow-up.

**Context.** New replays appear newest-first on source page 1. A scheduled cron has
minute-or-worse detection latency. We want new replays ingested within seconds.

**Decision.** Add a `watch` command: an always-on loop that runs a **page-1-only** ingest
cycle continuously, alongside `run-once` (which stays the full crawl). This is a deliberate
addition to the run-once-only shape. It is a background loop, **not** an HTTP server — the
"no web framework" invariant still holds.

**Runtime contract**
- Command: `replays-fetcher watch`.
- `REPLAY_WATCH_INTERVAL_MS` — inter-cycle idle sleep. **Default 0** (continuous: the next
  cycle starts immediately after the previous finishes). Bounded `0 … 600000`. At 0 the loop
  self-paces via the existing source throttle (`REPLAY_SOURCE_REQUEST_SPACING_MS` /
  `REPLAY_SOURCE_CONCURRENCY`) on the page-1 fetch — so "no sleep" cannot flood the source
  or CPU-spin.
- **Page-1 only** per cycle; never page 2. The nightly full `run-once` catches anything that
  appeared off page 1.
- **Checkpoint-independent**: the watch path never reads or advances the source checkpoint
  (depcruise fences out the checkpoint import) — it always polls page 1 and cannot drift to
  page 2. (This is why a plain `run-once --max-pages 1` does not work: a maxPages stop yields
  a non-`complete` checkpoint and the next run resumes from page 2.)
- **Idempotent**: same staging/S3 idempotency as run-once; safe to overlap with the nightly
  crawl.
- **Graceful shutdown**: SIGTERM/SIGINT stop the loop, flush pino, set `exitCode 0` — never
  `process.exit()` mid-stream (§D). Config error → exit 2.
- **Resilience**: a single cycle error is logged and the loop continues; a transient source
  failure never kills the daemon.
- **Liveness**: writes a heartbeat file (`REPLAY_WATCH_HEARTBEAT_PATH`, default
  `/tmp/replays-fetcher-watch.heartbeat`) after each successful cycle — for a k8s **exec**
  liveness probe (no HTTP endpoint).

**Deployment topology (staging infra)**
- `watch` → always-on Deployment, `replicas: 1`, exec liveness on the heartbeat file.
- Nightly full `run-once` → CronJob at `08:00 Europe/Moscow`.
- These two replace the prior single 30-min `run-once` CronJob.

**Follow-up:** update `solidstats-fetcher-ts-conventions` §A in the `solid-stats/skills` repo
to acknowledge `watch` as an accepted long-running runtime mode.
