# replay-parser-2 — Sentry/GlitchTip wire brief (errors-only, Rust)

> **ARCHIVED (2026-06-15) · DONE.** Wired (PR #1, merged): `sentry::init` guard at the top of `main()`, errors-only; convention-reviewed (APPROVE); activated on staging (image `72116db`; `SENTRY_DSN` confirmed in the pod). Reports to its own project `staging/replay-parser-2` (id 4). DSN model is now **per-app project / per-env org** — see `infrastructure/docs/error-sdk-handoff.md`.

**Owner:** replay-parser-2 repo · **Source:** infrastructure Phase 18 · **DSN handoff:** `infrastructure/docs/error-sdk-handoff.md`

Wire an **errors-only** Sentry SDK reporting to GlitchTip (Sentry-compatible). Infra already injects
`SENTRY_DSN` (from `replay-parser-2-runtime` via `envFrom`). Rust app, edition 2024, long-running
AMQP consumer (`src/main.rs`).

## Scope (do / don't)

- DO: capture panics + errors you explicitly report, set `environment = "staging"`. Hold the
  `ClientGuard` for the whole program lifetime.
- DON'T: set `traces_sample_rate` (leave it 0/unset — no performance tracing), no profiling.
- Gate on the DSN: an empty/unset `SENTRY_DSN` ⇒ `sentry::init` returns a disabled client (no-op).

## Steps

1. `cargo add sentry` (pulls the panic + backtrace integrations by default). If you want only the
   minimal set, `sentry = { version = "0.x", default-features = false, features = ["backtrace",
   "contexts", "panic", "reqwest", "rustls"] }` — keep `panic`, drop `tracing`/`profiling` features.

2. Initialize the guard at the very top of `main()` and keep it alive for the program's lifetime:

   ```rust
   fn main() {
       let _sentry = sentry::init((
           std::env::var("SENTRY_DSN").unwrap_or_default(),   // empty -> disabled client (no-op)
           sentry::ClientOptions {
               environment: Some("staging".into()),
               // errors-only: do NOT set traces_sample_rate (stays 0.0)
               release: sentry::release_name!(),
               ..Default::default()
           },
       ));
       // ...existing tokio runtime / consumer setup...
   }
   ```

   - If `main` is `#[tokio::main] async fn main()`, init Sentry in a thin sync wrapper BEFORE
     entering the runtime (so the guard outlives the runtime), or `let _guard = sentry::init(...)`
     as the first statement inside the async main and keep it bound for the whole scope.

3. Panics are captured automatically by the `panic` integration. For handled `Result::Err` paths
   you want visible, report explicitly: `sentry::capture_error(&err);` (or
   `sentry::integrations::anyhow::capture_anyhow(&err)` if using `anyhow`).

## Forced-error test

Temporarily `panic!("replay-parser-2 Sentry wire test")` (or `sentry::capture_message("...",
sentry::Level::Error)`) on a code path you can trigger once, run with `SENTRY_DSN` set, and confirm
the issue appears in GlitchTip (`https://errors.solid-stats.ru`, project `staging`). The guard's
`Drop` flushes on normal exit; for an explicit early test add `sentry::Hub::current().client()
.map(|c| c.flush(Some(std::time::Duration::from_secs(2))));` before exiting.

## Notes

- DSN is the public-URL form `https://…@errors.solid-stats.ru/1`; the consumer egresses to the
  public edge — no netpol change needed.
- The guard must stay in scope: binding to `_sentry` (not `_`) prevents an immediate drop.
