# Solid Stats 2 — Release Plan

**Last updated:** 2026-06-12

How the Solid Stats 2 redesign reaches release. v2 is a deliberate redesign of
the legacy stack (`replays-parser` + `server`), verified for correctness against
legacy — not a byte-for-byte port. Release converges **two tracks**: a product
surface (API + UI) and a data/production-readiness track.

## Status snapshot (2026-06-12)

| Repo | Where it is |
|------|-------------|
| `replay-parser-2` | DONE / user-verified. Not re-litigated. |
| `server-2` | v1.0 + v2.0 shipped. **v3.0 "Public API v1" complete & archived (2026-06-08); contract-freeze phase 19 landed** — confirm OpenAPI `1.0.0` tag + CI freeze gate before relying on it. |
| `web` | Briefs only, not started (`.planning/` empty). Unblocked by the v3.0 freeze; build after the client is generated from OpenAPI. |
| `replays-fetcher` | v1.0 shipped/archived. **v2 "Full-Corpus Ingest Resilience" executing (~67%, phase 11; 18/22 plans).** |
| `infrastructure` | Staging only (`solid-stats-staging`). **v2.0 "Production-Ready Infra & kubectl-native CD" in planning (0%, phases 6–11; roadmap created 2026-06-11).** No production namespace yet. |

## Pre-production decisions (2026-06-12)

Decisions from the pre-prod brainstorm that set the cutover bar and sequencing:

- **D1 — Whole Track C gates the cutover.** Cleanup + convention-compliance +
  Vite+/Oxlint/Oxfmt/tsdown migration must all land before the backend goes to
  production (not a fast-follow).
- **D2 — Full observability on prod before traffic.** Stand the full stack up on
  staging, validate gates, then **mirror the config to a production namespace**
  and validate there before the backend accepts production traffic. This is
  net-new vs `observability-plan.md` (staging-only) — see its production-mirror
  note for the added prod sizing / retention / obs-data-backup scope.
- **D3 — Focus on `infrastructure` v2, run it in parallel with `replays-fetcher`
  v2 via AI agents.** Two milestones in flight at once.
- **D4 — Track C starts with a spike-gate** on `replays-fetcher` (port
  vocalclub → Oxlint preset, type-aware diff on real code, tsdown + Docker
  smoke) to close OQ-1b/OQ-1c **before** full Oxlint (alpha type-aware) reaches
  the critical path. Start the spike **only after** `replays-fetcher` v2 lands —
  spiking a repo under active v2 work is exactly the toolchain churn Track C
  defers (see the Track C sequencing note).

## Track A — Product surface (API + UI) — *critical path*

The release-blocking path. Until the `server-2` public API contract is frozen,
`web` cannot be built against it.

**server-2 milestone v3.0 — Public API v1 (phases 14–19) — complete & archived 2026-06-08:**

| Phase | Scope | Status |
|-------|-------|--------|
| 14 — Pagination & Masking Core | cursor pagination + server-side sort; server-side SteamID masking | done (Steam64 leak closed) |
| 15 — Profile Parity Stats | promote weapons / vehicles / PvP relationships / weekly buckets / KD-score-games from CLI export to public routes | done |
| 16 — Slug / History / Provenance | slug→id resolution, nickname & squad-membership history, provenance / last-updated | done |
| 17 — Replay Surface | replay list + detail + event timeline + sitemap (largest single piece) | done |
| 18 — Ergonomics / Admin / Winner-Fix | admin rotation CRUD, bounty formula breakdown, commander-side winner fix | done |
| 19 — Contract Freeze | OpenAPI `1.0.0`, breaking-change diff gate, PostgreSQL integration tests in CI | done — confirm `1.0.0` tag + CI freeze gate before web client generation |

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
2. **replays-fetcher v2 — Full-Corpus Ingest Resilience** — *executing (~67%,
   phase 11; 18/22 plans)*. Unblocked since v2.0 (its dependency, the server-2
   full-run-readiness and export contracts, shipped with v2.0). Real problem
   from evidence: a full
   run over `sg.zone/replays` (786 pages, ~23.5k replays) on 2026-05-11 failed
   twice on `source_unavailable` and restarted from page 1, wasting hours.
   Five phases: (1) source-failure diagnostics + bounded retry/backoff; (2)
   checkpoint & resume from the first incomplete page; (3) dynamic page-range
   discovery + rate limiter / bounded concurrency + ETA (drop hardcoded
   `REPLAY_SOURCE_MAX_PAGES`); (4) compact progress events; (5) source-contract
   guard tests. See
   [replays-fetcher brief](../replays-fetcher/briefs/v2-backend-parity-and-full-run.md).
3. **infrastructure** (v2.0, in planning) — controlled full run, legacy
   snapshot, diff/parity evidence, and a real production environment: production
   namespace (only staging exists today), kubectl-native CD, validated backups +
   restore drill, and rollback. The observability stack (Grafana / Prometheus /
   Loki + GlitchTip for Sentry-compatible error tracking) is specced but not
   started — see [observability plan](../infrastructure/briefs/observability-plan.md).
   Per **D2**, it goes live **on production before traffic**: stand it up on
   staging, validate, then mirror the config to the production namespace. See
   also the [infrastructure brief](../infrastructure/briefs/v2-backend-parity-and-full-run.md).

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
4. **Git hooks — local pre-commit / pre-push gates** — wire client-side hooks in
   every TS repo so the toolchain runs before code leaves a developer's machine,
   not just in CI. **pre-commit:** Oxfmt + Oxlint on staged files only (fast,
   incremental); **pre-push:** the fuller gate — `tsc` typecheck + Vitest (the
   slow checks belong on push, not on every commit). Manager: **lefthook** (single
   Rust-free Go binary, parallel runs, native staged-file globbing — fits the
   Oxc/fast-tooling theme and the polyrepo layout better than husky + lint-staged).
   Hook config is shared via `@solidstats/config` (a checked-in `lefthook.yml`
   preset) so the rules don't drift per repo, same as the lint/format presets.
   Hooks mirror — never replace — the CI `verify` pipeline (CI stays the hard
   gate; hooks are the fast local pre-filter, bypassable with `--no-verify` for
   WIP). Lands per repo right after that repo's Oxlint/Oxfmt migration (item 3),
   since the hooks just invoke the new command surface.

Sequencing note: Track C runs after the Track A contract freeze settles per repo —
toolchain churn during active API work would create noise — but **must complete
before the production cutover** (decision **D1**: the whole of Track C is a hard
gate, Vite+ migration included). It **starts with a spike-gate** on
`replays-fetcher` (decision **D4**) to de-risk full Oxlint's alpha type-aware
before it reaches the critical path — and that spike starts **only after**
`replays-fetcher` v2 lands, so the spike and active v2 work don't churn the same
repo. Per-repo order after the spike: `replays-fetcher` → `server-2` → `web`
(greenfield, scaffolded straight onto Vite+).

## Release criteria — both tracks converge

Solid Stats 2 is releasable when:

1. **Track A:** the server-2 public API contract is frozen (OpenAPI `1.0.0`) and
   `web` is built and working against it.
2. **Track B:** the full replay corpus is ingested reliably and verified by the
   parity gate.
3. **Production:** it all runs on a real production environment with the full
   observability stack live on production before traffic (D2), validated backups
   - restore drill, and a rollback path.
4. **Track C:** repos cleaned, brought into convention-skill compliance,
   converged onto the Vite+ ecosystem (shared `@solidstats/config`), and guarded
   by shared pre-commit / pre-push git hooks (lefthook) that mirror CI `verify`.

## Cross-references

- Per-repo operational state lives in each repo's own `.planning/`.
- [V2-CUTOVER-REVIEW.md](V2-CUTOVER-REVIEW.md) — full gap analysis and the
  locked v1 backend scope decisions (2026-05-31).
