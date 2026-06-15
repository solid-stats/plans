# server-2 — Sentry/GlitchTip wire brief (errors-only)

> **ARCHIVED (2026-06-15) · DONE.** Wired (PR #19, merged), convention-reviewed (the review caught a real bug: `instrument.ts` imported before `dotenv/config` → `SENTRY_DSN` was undefined via the `.env` path; fixed), and **activated on staging** (image `e31b129` carries the SDK; `SENTRY_DSN` confirmed in the pod). Reports to its own GlitchTip project `staging/server-2` (id 2). **DSN model changed:** one GlitchTip **project per app**, one **org per environment** (`staging`/`production`) — supersedes the single shared `solidstats/staging` project referenced below. See `infrastructure/docs/error-sdk-handoff.md`.

**Owner:** server-2 repo · **Source:** infrastructure Phase 18 · **DSN handoff:** `infrastructure/docs/error-sdk-handoff.md`

Wire an **errors-only** Sentry SDK reporting to the self-hosted GlitchTip. Infra already injects the
`SENTRY_DSN` env var (from the `server-2-runtime` k8s Secret via `envFrom`). You add the SDK init.

## Scope (do / don't)

- DO: capture errors + unhandled rejections/exceptions, tag `environment: "staging"`, set `release`
  if you have a build SHA handy.
- DON'T: tracing/APM, profiling, session replay, breadcrumb scrubbing changes. Keep it minimal.
- Gate on the DSN: if `SENTRY_DSN` is empty, init must be a no-op (the SDK already does this when
  the DSN is falsy — just pass `process.env.SENTRY_DSN`).

## Steps

1. `pnpm add @sentry/node` (v8+).
2. Create `src/instrument.ts` — it MUST be imported before any other module so the SDK can patch:

   ```ts
   // src/instrument.ts
   import * as Sentry from "@sentry/node";

   Sentry.init({
     dsn: process.env.SENTRY_DSN,          // empty -> SDK is a no-op
     environment: process.env.NODE_ENV ?? "staging",
     tracesSampleRate: 0,                  // errors-only: no performance tracing
     profilesSampleRate: 0,                // no profiling
     // no replay / no integrations beyond defaults (which capture errors + rejections)
   });
   ```

3. In `src/server.ts`, make the instrument import the **very first** line (before
   `import "dotenv/config"` — but the DSN comes from the k8s env, not .env, so order vs dotenv is
   fine; what matters is it's before app/framework imports):

   ```ts
   import "./instrument.js";   // FIRST — initializes Sentry before anything else loads
   import "dotenv/config";
   // …existing imports…
   ```

4. If the HTTP framework needs an explicit error handler to forward 5xx, add
   `Sentry.setupExpressErrorHandler(app)` (Express) or the framework's equivalent after routes.
   For a long-running server, no manual flush is needed (the transport drains in the background).

## Forced-error test (proves end-to-end app → GlitchTip)

With `SENTRY_DSN` set in the env, add a temporary throwaway route or run a one-off:

```ts
Sentry.captureException(new Error("server-2 Sentry wire test"));
await Sentry.flush(2000);
```

Then confirm the issue appears in GlitchTip (org `solidstats` / project `staging`, or
`https://errors.solid-stats.ru`). Remove the throwaway after.

## Notes

- The DSN is the **public-URL** form `https://…@errors.solid-stats.ru/1` — server-2 reaches GlitchTip
  through the public edge; no in-cluster netpol change is needed (see the handoff doc).
- No infra change is required on your side: `SENTRY_DSN` is already in `server-2-runtime`.
