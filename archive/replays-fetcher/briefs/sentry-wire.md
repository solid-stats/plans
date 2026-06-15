# replays-fetcher — Sentry/GlitchTip wire brief (errors-only, CronJob)

> **ARCHIVED (2026-06-15) · DONE.** Wired (PRs #1 + #2, merged) with CronJob-safe `await flushSentry()` on every exit path; convention-reviewed (APPROVE); activated on staging (image `205b4cd`; CronJob picks up `SENTRY_DSN` on its next run). Reports to its own project `staging/replays-fetcher` (id 3). DSN model is now **per-app project / per-env org** — see `infrastructure/docs/error-sdk-handoff.md`.

**Owner:** replays-fetcher repo · **Source:** infrastructure Phase 18 · **DSN handoff:** `infrastructure/docs/error-sdk-handoff.md`

Wire an **errors-only** Sentry SDK reporting to GlitchTip. Infra already injects `SENTRY_DSN` (from
`replays-fetcher-runtime` via `envFrom`). This workload is a **short-lived CronJob** (`src/cli.ts`,
built by `tsdown --entry src/cli.ts`), so the critical extra step is **flushing before exit**.

## Scope (do / don't)

- DO: capture errors + unhandled rejections, tag `environment: "staging"`, and **`await
  Sentry.flush()` before the process exits** (otherwise queued events are lost when the CronJob pod
  terminates).
- DON'T: tracing/APM, profiling, replay.
- Gate on the DSN: empty `SENTRY_DSN` ⇒ no-op (pass `process.env.SENTRY_DSN` directly).

## Steps

1. `pnpm add @sentry/node` (v8+).
2. Init at the very top of `src/cli.ts` (before other imports run side effects):

   ```ts
   import * as Sentry from "@sentry/node";
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV ?? "staging",
     tracesSampleRate: 0,
     profilesSampleRate: 0,
   });
   ```

3. Wrap the CLI's main run so any throw is captured AND flushed before exit:

   ```ts
   async function main() { /* existing cli logic */ }

   main()
     .then(async () => { await Sentry.flush(2000); })
     .catch(async (err) => {
       Sentry.captureException(err);
       await Sentry.flush(2000);   // MUST flush before exit (short-lived pod)
       process.exitCode = 1;
     });
   ```

   If `cli.ts` already has a top-level runner, just add the `captureException` + `flush` in its
   catch and a `flush` on the success path.

## Forced-error test

Temporarily throw inside the run (or `Sentry.captureException(new Error("replays-fetcher wire
test"))` + `await Sentry.flush(2000)`), trigger one CronJob run with `SENTRY_DSN` set, and confirm
the issue appears in GlitchTip (`https://errors.solid-stats.ru`, project `staging`).

## Notes

- DSN is the public-URL form `https://…@errors.solid-stats.ru/1`; the CronJob egresses to the public
  edge — no netpol change needed.
- Don't forget the **flush** — it's the one CronJob-specific gotcha vs a long-running server.
