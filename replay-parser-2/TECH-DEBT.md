# replay-parser-2 — Tech-debt backlog

Durable list of known debt to clear later. Not a brief; no behavior changes
implied. First entry surfaced 2026-06-20 during a staging deploy-status check
(verifying the previous day's new replays processed end-to-end).

## Parser emits zero stdout/stderr → no lifecycle logs in Loki

**Recorded:** 2026-06-20.

**Observed.** Both `replay-parser-2` replicas (`Running`, 0 restarts, ~4d14h old
at the time) have written **exactly 0 lines** to stdout/stderr over their entire
pod lifetime — not even a startup banner (`kubectl logs <pod> | wc -l` → `0` for
both). The parser is therefore the one application workload **absent from Loki**:
`replays-fetcher`, `replays-fetcher-watch`, and `server-2` all stream pino NDJSON
that Alloy collects cluster-wide, so log collection itself works — the gap is
app-side, the parser produces nothing to collect. The code is not log-free
(~33 `tracing` / log macro call-sites exist across the crates), which points at a
missing or disabled subscriber: `tracing` macros are silent no-ops until a
`tracing_subscriber` is installed, so either `…fmt().init()` is never reached in
the worker entrypoint, or an `EnvFilter` / unset `RUST_LOG` defaults the level to
off.

The blind spot is concrete. During the 2026-06-19 evening ingest, 4 new replays
were parsed and their results round-tripped — RabbitMQ `published +8` (4
parse-request + 4 parse-result), `acked +8`, `redelivered 0`, queue `ready` flat
at 0 — but **none of that is visible in the parser's own logs**. Success had to
be inferred entirely from RabbitMQ counters plus `server-2`'s `parser job
published` lines. There is no log record of job receipt, parse start/finish,
parse duration, or result publish.

**Impact.** No log-based signal for the parser at all: parse success/failure,
per-replay duration, throughput, slow or stuck parses, and contract-version
handling are invisible in Loki. If parsing starts failing or degrading, the only
possible signal is a GlitchTip error event — and only if the Sentry SDK is wired
(per the archived `replay-parser-2/briefs/sentry-wire.md`) and only for failures
that raise; routine slow or silently-wrong parses leave no trace. This compounds
the metrics gap already recorded in
[infrastructure/TECH-DEBT.md](../infrastructure/TECH-DEBT.md) ("Application
workloads are not scraped by Prometheus"): the parser today has **neither logs
nor metrics**, only crash reports.

**Fix approach.** Initialize a `tracing` subscriber that writes structured JSON to
stdout at process start in the worker binary, with a sane default level
(`EnvFilter` defaulting to `info`, overridable via `RUST_LOG`) and that level set
in the `deploy/` env so it is `info` on staging. Emit, at minimum, per job:
received (`job_id`, `replay_id`, `object_key`, `parser_contract_version`), parse
start/complete with a duration, result published, and structured failures. Alloy
then picks it up automatically — **no infrastructure change required** (collection
already works for the other workloads). Verify the subscriber-init path and the
deploy log-level env; the ~33 existing macro call-sites should start producing
output once a subscriber is installed. Align field names with `server-2`'s job log
(`job_id` / `replay_id`) so one replay can be traced across both services in Loki.
Do via `gsd-quick` in `replay-parser-2`.

**Priority:** medium. Not a deploy bug — the pipeline works and processed
yesterday's replays correctly — but the parser is the only service with no
operational visibility whatsoever, so any future parse regression would be silent.
Pairs naturally with the per-app metrics instrumentation in the infrastructure
metrics-scrape item.
