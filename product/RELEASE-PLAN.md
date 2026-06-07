# Solid Stats 2 — Release Plan

**Last updated:** 2026-06-07

How the Solid Stats 2 redesign reaches release. v2 is a deliberate redesign of
the legacy stack (`replays-parser` + `server`), verified for correctness against
legacy — not a byte-for-byte port. Release converges **two tracks**: a product
surface (API + UI) and a data/production-readiness track.

## Status snapshot (2026-06-07)

| Repo | Where it is |
|------|-------------|
| `replay-parser-2` | DONE / user-verified. Not re-litigated. |
| `server-2` | v1.0 + v2.0 shipped. **v3.0 "Public API v1" executing (~25%, phase 15 of 14–19).** |
| `web` | Briefs only. Blocked on the server-2 contract freeze (generates its client from OpenAPI). |
| `replays-fetcher` | v1.0 shipped/archived. **v2 "Full-Corpus Ingest Resilience" defined but not started.** |
| `infrastructure` | Staging only (`solid-stats-staging`). No production namespace yet. |

## Track A — Product surface (API + UI) — *critical path*

The release-blocking path. Until the `server-2` public API contract is frozen,
`web` cannot be built against it.

**server-2 milestone v3.0 — Public API v1 (phases 14–19):**

| Phase | Scope | Status |
|-------|-------|--------|
| 14 — Pagination & Masking Core | cursor pagination + server-side sort; server-side SteamID masking | done (Steam64 leak closed) |
| 15 — Profile Parity Stats | promote weapons / vehicles / PvP relationships / weekly buckets / KD-score-games from CLI export to public routes | executing |
| 16 — Slug / History / Provenance | slug→id resolution, nickname & squad-membership history, provenance / last-updated | pending |
| 17 — Replay Surface | replay list + detail + event timeline + sitemap (largest single piece) | pending |
| 18 — Ergonomics / Admin / Winner-Fix | admin rotation CRUD, bounty formula breakdown, commander-side winner fix | pending |
| 19 — Contract Freeze | OpenAPI `1.0.0`, breaking-change diff gate, PostgreSQL integration tests in CI | closing gate |

**In parallel — Request model (E):** hybrid of the current 4 request types vs.
the brief's 5 guided flows. Runs as a separate `/gsd:discuss-phase`. The contract
is **not** frozen until this resolves (blocks only the request/moderation slice).

**Then — web:** after the freeze, generate the typed client from OpenAPI and
build the frontend from its briefs.

> Fast-unblock option: freeze the stable read-stats subset (phases 14 + 16 + 18
> read paths) first so `web` can start stats screens, while replays (17) and
> requests (E) land next, then the full freeze (19).

## Track B — Data + production readiness

Not part of the `server-2` API milestone, but required before going live.

1. **server-2 parity foundation** — shipped (v2.0): recalculation report, legacy
   public export, diff contract.
2. **replays-fetcher v2 — Full-Corpus Ingest Resilience** — *defined, not
   started; already unblocked* (its dependency, the server-2 full-run-readiness
   and export contracts, shipped with v2.0). Real problem from evidence: a full
   run over `sg.zone/replays` (786 pages, ~23.5k replays) on 2026-05-11 failed
   twice on `source_unavailable` and restarted from page 1, wasting hours.
   Five phases: (1) source-failure diagnostics + bounded retry/backoff; (2)
   checkpoint & resume from the first incomplete page; (3) dynamic page-range
   discovery + rate limiter / bounded concurrency + ETA (drop hardcoded
   `REPLAY_SOURCE_MAX_PAGES`); (4) compact progress events; (5) source-contract
   guard tests. See
   [replays-fetcher brief](../replays-fetcher/briefs/v2-backend-parity-and-full-run.md).
3. **infrastructure** — controlled full run, legacy snapshot, diff/parity
   evidence, and a real production environment: production namespace (only
   staging exists today), monitoring, validated backups, and rollback. The
   staging observability stack (Grafana / Prometheus / Loki + GlitchTip for
   Sentry-compatible error tracking) is specced but not started — see
   [observability plan](../infrastructure/briefs/observability-plan.md). See also
   the [infrastructure brief](../infrastructure/briefs/v2-backend-parity-and-full-run.md).

## Track C — Engineering hardening (pre-release)

Not feature work, but required before release so the codebase ships clean and
consistent. Applies to all TS repos (`replays-fetcher`, `server-2`, `web`).

1. **Repository cleanup** — remove dead code, stale TODO/FIXME, unused config and
   scripts, redundant `eslint-disable`/suppressions; tighten ignores; ensure each
   repo's `verify` pipeline is green from a clean checkout.
2. **Refactor to the convention skills** — bring each repo into compliance with the
   shared review/convention skills (`estesis-process-review-standards` and the
   per-stack reviewers, e.g. `estesis-backend-vc-code-review`). Resolve the findings
   so the conventions hold uniformly across repos.
3. **Migrate to the Vite+ ecosystem** — converge all TS products onto the VoidZero/
   Vite+ toolchain (Oxlint + Oxfmt + Vitest + tsdown; Vite+ for `web`), with a shared
   `@solidstats/config` preset and the `vocalclub` config as the rule-content
   reference. Full decision pack, risks, and open questions in
   [TS-TOOLCHAIN-CONVERGENCE.md](TS-TOOLCHAIN-CONVERGENCE.md). Recommended start:
   a spike on `replays-fetcher` (port rules → Oxlint preset, check Oxfmt diff,
   tsdown build).

Sequencing note: Track C runs after the Track A contract freeze settles per repo —
toolchain churn during active API work would create noise — but must complete
before the production cutover.

## Release criteria — both tracks converge

Solid Stats 2 is releasable when:

1. **Track A:** the server-2 public API contract is frozen (OpenAPI `1.0.0`) and
   `web` is built and working against it.
2. **Track B:** the full replay corpus is ingested reliably and verified by the
   parity gate.
3. **Production:** it all runs on a real production environment with monitoring,
   validated backups, and a rollback path.
4. **Track C:** repos cleaned, brought into convention-skill compliance, and
   converged onto the Vite+ ecosystem (shared `@solidstats/config`).

## Cross-references

- Per-repo operational state lives in each repo's own `.planning/`.
- [V2-CUTOVER-REVIEW.md](V2-CUTOVER-REVIEW.md) — full gap analysis and the
  locked v1 backend scope decisions (2026-05-31).
