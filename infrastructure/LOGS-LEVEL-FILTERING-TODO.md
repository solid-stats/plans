# TODO: proper log-level filtering in the Loki logs dashboard

**Source:** infrastructure observability (Phase 15 logs + the Grafana "Logs (Loki)" dashboard).
**Status:** working stopgap shipped; proper structured filtering still to do.

## What exists now (the stopgap)

The `Logs (Loki)` Grafana dashboard (`k8s/observability/61-grafana-logs-dashboard.yaml`, uid
`solid-stats-logs`) has a `Min level` dropdown (All / Warning+ / Error+). It injects ONE cross-format
**substring regex** as a second line filter:

```
|~ "(?i)(\"level\":[456]0|\"level\":\"(warn|warning|error|fatal|critical)\"|\[(warn|warning|error|fatal|crit|critical)\])"
```

injected as a **backtick** line filter `|~ \`$level\`` (backticks so the embedded `"` don't break
the LogQL string — a double-quoted `|~ "..."` gave `parse error ... unexpected IDENTIFIER`). It
matches pino numeric (`"level":40/50/60`), JSON string level (`"level":"warn"`), and bracketed text
levels (`[warning]`). Good enough to cut info noise.

## Why it's not "proper"

- **Substring matching → false positives.** An info line whose message literally contains "error"
  (e.g. `"msg":"no errors found"`) matches `Warning+`. Precise only for pino's numeric `"level":NN`.
- **Per-format, hardcoded in a regex.** Each app logs differently (server-2 = pino JSON numeric,
  rabbitmq/postgres = `[level]` text, glitchtip = Django). The regex is a lowest-common-denominator
  hack, not a real level field.
- **No real ordering.** "Warning+" is a regex alternation, not a true `level >= warn` comparison.

## Proper approaches (pick one)

1. **Loki `detected_level` (Loki 3.x).** Live check (2026-06-14): the running Loki 3.6.x **already
   attaches `detected_level`** — `| detected_level=`info`` works, rabbitmq/postgres/glitchtip get a
   real level. BUT **server-2 (pino) → `detected_level: unknown`**: Loki's detector doesn't map
   pino's NUMERIC `"level":30/40/50`. So `detected_level` alone silently hides server-2 (our main
   app) under a level filter. To use it, server-2's numeric level must first be mapped — see option 2.
   For the OTHER apps, `| detected_level=~"warn|error|critical|fatal"` is already the clean filter.

2. **Alloy-side normalization.** Add `stage.json` / `stage.logfmt` / `stage.regex` + a mapping stage
   in the Alloy River pipeline (`k8s/observability/80-alloy.yaml`) to extract a normalized
   `level` (info/warn/error/fatal) per source, exposed as **structured metadata** (NOT a label — keep
   Phase 15's minimal label set to avoid stream cardinality blow-up). Then query `| level=~"warn|error"`.
   More work, full control.

3. **Query-time per-app (no infra change).** Keep the dashboard but make the level filter app-aware:
   for server-2 use `| json | level >= 40` (true numeric comparison); for text apps use `| pattern`/
   `| logfmt`. Hard to express as one dashboard variable across mixed apps — only worth it if a
   single-app view is acceptable.

**Recommendation:** try option 1 first (cheapest, cleanest if the running Loki supports
`detected_level`); fall back to option 2 if not. Then replace the substring regex in the dashboard's
`Min level` variable with the clean `detected_level`/`level` filter and drop this TODO.

## Acceptance

- `Min level` filters by a real, ordered level field (no false positives from message text).
- Works across server-2, glitchtip, rabbitmq, postgres without per-app regex.
- No new high-cardinality label added to Loki streams (use structured metadata).
