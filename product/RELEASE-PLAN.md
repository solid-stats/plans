# Solid Stats 2 — Release Plan

**Last updated:** 2026-06-13

How the Solid Stats 2 redesign reaches release. v2 is a deliberate redesign of
the legacy stack (`replays-parser` + `server`), verified for correctness against
legacy — not a byte-for-byte port. Release converges **two tracks**: a product
surface (API + UI) and a data/production-readiness track.

## Status snapshot (2026-06-13)

| Repo | Where it is |
|------|-------------|
| `replay-parser-2` | v1.0 DONE / user-verified. **Reopened for a skill-conformance refactor** (W3): most of it was written without a skill, so it is brought under `solidstats-parser-rust-*` in Phase 2 (Rust-side; not part of the TS toolchain convergence). |
| `server-2` | v1.0 + v2.0 shipped. **v3.0 "Public API v1" complete & archived (2026-06-08, git tag `v3.0`); contract-freeze phase 19 landed and confirmed (2026-06-13)** — spec `info.version 1.0.0`, CI `contract-diff` (oasdiff breaking, `fail-on: ERR`) per PR, plus the `frozen-contract` test + `openapi:verify` staleness check inside `verify`. (No git tag literally named `1.0.0` — the freeze lives in `info.version`.) |
| `web` | Briefs only, not started (`.planning/` empty). Unblocked by the v3.0 freeze, but **sequenced last (W1)** — backend brought to finished/parity-verified state first. **Design runs in parallel from now (W7)**, code build is Phase 4. |
| `replays-fetcher` | v1.0 shipped/archived. **v2 "Full-Corpus Ingest Resilience" complete & archived (2026-06-12); 6/6 phases, 24/24 plans, verify green (100% coverage).** Track C de-risk spike also run & validated (see Track C). |
| `infrastructure` | **v2.0 "Production-Ready Infra & kubectl-native CD" SHIPPED 2026-06-13; 6/6 phases, 21/21 plans.** In-scope complete (retention applied live, cutover mechanism live-verified); only the Phase 11 **live production flip is deferred by scope** — no production namespace serving traffic yet. |

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
  the critical path. **DONE (2026-06-13): all 4 spikes VALIDATED** — OQ-1b/OQ-1c/OQ-2
  closed; see the Track C spike-outcome note. Track C can now proceed to the real
  `@solidstats/config` migration.

## Execution sequence (decided 2026-06-13)

The release plan defines three tracks (A/B/C) as *categories* of work. This is the
**phased execution order** decided in the 2026-06-13 sequencing brainstorm. It
overrides the earlier "web is the critical path, start it now" framing: `web` is
deliberately sequenced **last** (decision **W1**). Rationale: bring the **backend to a
finished, refactored, parity-verified state first**, then build the frontend against a
settled surface — the fast-unblock read-stats option is consciously declined.
**Design runs in parallel from the start** (decision **W7**): it is a non-code track
with no backend dependency, so the UI/visual design proceeds throughout Phases 0–3 and
feeds `web` when it begins in Phase 4.

**Phase 0 — three tracks in parallel, start now:**

- **Track 1 — `replays-fetcher` Track C migration** (pilot). Real `@solidstats/config`
  migration: Oxlint + Oxfmt + tsdown + Vitest, plus the lefthook pre-commit/pre-push
  hooks. Proves the new architecture / skills / build before the pattern reaches the
  other repos. Spike-gate (D4) already satisfied.
- **Track 2 — observability on staging** (**W5**). Stand up Grafana / Prometheus /
  Loki + GlitchTip on staging only. The production mirror (D2) is a later, separate
  step before traffic; no production namespace now.
- **Track 3 — deploy current versions + generate parity artifacts** (**W2**, **W4**).
  Deploy the **current (pre-Track-C) `-2` versions** to staging, run the controlled
  full-corpus ingest (v2) + capture the legacy snapshot, and generate the diff-harness
  artifacts. Running on pre-refactor code makes this the clean parity **baseline** — a
  later parity failure is then unambiguously a refactor regression, not a redesign gap.
- **Request model (E) — DECIDED 2026-06-13 (W6): the brief's guided flows** (Variant 2),
  not the current generic 4-type model and not a hybrid. Request types become the
  granular guided flows from the web brief — identity, add/remove kills, add/remove
  teamkills, remove-player-from-replay, commander dispute — each with a per-type
  structured payload + required linked entities, plus drafts (autosave, 7-day TTL),
  reopen transition, and S3 attachments. Not a phase and not a rewrite now: the rewrite
  lands inside the server-2 refactor (Phase 2); deciding first just means that refactor
  builds this shape once. **Legacy types — DECIDED (W6.1): keep `merge_split` and
  `steam_link` as separate flows** (Variant B), not folded into the identity flow —
  merge/split is a destructive admin-grade op on `canonical_players` and steam-link is
  its own user scenario, so they stay single-purpose. Final request-type set: identity
  (nickname), `steam_link`, `merge_split`, add/remove kills, add/remove teamkills,
  remove-player-from-replay, commander dispute. UI grouping (e.g. an "identity / account"
  section) is the design track's concern, not the backend's.

Sequencing note for Phase 0: ideally finish Track 2 (observability on staging) before
Track 3's full-run so the heavy ingest is observable — but Track 3 may start on
known-good current code without waiting, accepting reduced observability for that one
baseline run.

**Phase 1 — parity baseline review:** human value-review of the Track 3 diff artifacts
(per CUTOVER-MODEL, values are human-reviewed, not byte-identical). Blocking problems
are folded into the upcoming refactor rather than fixed in isolation.

**Phase 2 — refactor, in parallel (after E resolved + the fetcher pilot proves the pattern):**

- `server-2` — Track C refactor onto the new skills (TS), **behavior-preserving**; the
  frozen contract stays frozen (guarded by `contract-diff` + `frozen-contract`).
- `replay-parser-2` — refactor onto `solidstats-parser-rust-*` (Rust) (**W3**). Net-new
  vs the original plan, which treated the parser as DONE: most of it was written without
  a skill and is brought under `solidstats-parser-rust-conventions`.

**Phase 3 — parity completion:** re-run parity after the refactor. Because the baseline
was taken pre-refactor (Phase 0 Track 3), a regression is now distinguishable from an
original redesign gap. Fix as needed.

**Phase 4 — `web`:** generate the typed client from the frozen OpenAPI and build the UI
from its briefs, fed by the design done in parallel since Phase 0 (W7). Before release:
mirror observability to production (D2) and run the production cutover.

## Track A — Product surface (API + UI)

Sequenced **last** by decision W1 (see Execution sequence). The `server-2` public API
contract is frozen and confirmed (2026-06-13), so `web` is unblocked whenever it starts;
it is held to Phase 4 deliberately, not by a contract blocker.

**server-2 milestone v3.0 — Public API v1 (phases 14–19) — complete & archived 2026-06-08:**

| Phase | Scope | Status |
|-------|-------|--------|
| 14 — Pagination & Masking Core | cursor pagination + server-side sort; server-side SteamID masking | done (Steam64 leak closed) |
| 15 — Profile Parity Stats | promote weapons / vehicles / PvP relationships / weekly buckets / KD-score-games from CLI export to public routes | done |
| 16 — Slug / History / Provenance | slug→id resolution, nickname & squad-membership history, provenance / last-updated | done |
| 17 — Replay Surface | replay list + detail + event timeline + sitemap (largest single piece) | done |
| 18 — Ergonomics / Admin / Winner-Fix | admin rotation CRUD, bounty formula breakdown, commander-side winner fix | done |
| 19 — Contract Freeze | OpenAPI `1.0.0`, breaking-change diff gate, PostgreSQL integration tests in CI | done & confirmed (2026-06-13): spec `info.version 1.0.0`, CI `contract-diff` (oasdiff, `fail-on: ERR`), `frozen-contract` test + `openapi:verify`. Web client generation unblocked |

**Request model (E) — DECIDED (W6): the brief's guided flows** (Variant 2). Request
types are the granular guided flows — identity, add/remove kills, add/remove teamkills,
remove-player-from-replay, commander dispute — each with a per-type structured payload +
required linked entities, plus drafts/reopen/attachments. The read-stats contract is
frozen; the request/moderation slice gets frozen once this shape is built. The rewrite
lands inside the server-2 refactor (Phase 2).

**web:** Phase 4 — after the freeze (done) and after the refactor + parity settle,
generate the typed client from OpenAPI and build the frontend from its briefs.

> The earlier fast-unblock option (start web on the read-stats subset now) is
> **consciously declined** by decision W1 — web is sequenced last.

## Track B — Data + production readiness

Not part of the `server-2` API milestone, but required before going live.

1. **server-2 parity foundation** — shipped (v2.0): recalculation report, legacy
   public export, diff contract.
2. **replays-fetcher v2 — Full-Corpus Ingest Resilience** — *complete & archived
   (2026-06-12); 6/6 phases, 24/24 plans, verify green at 100% coverage*. Unblocked
   since v2.0 (its dependency, the server-2
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
3. **infrastructure** (v2.0 — **SHIPPED 2026-06-13**, in-scope complete) —
   kubectl-native CD, retention applied live, and the cutover mechanism
   live-verified. **Deferred by scope:** the Phase 11 live production flip, so no
   production namespace serves traffic yet. **Still open for release:** the
   controlled full run + legacy snapshot + diff/parity evidence, and standing up
   the full observability stack (Grafana / Prometheus / Loki + GlitchTip for
   Sentry-compatible error tracking) — specced but not started, see
   [observability plan](../infrastructure/briefs/observability-plan.md). Per **D2**
   it goes live **on production before traffic**: stand it up on staging, validate,
   then mirror the config to the production namespace. See also the
   [infrastructure brief](../infrastructure/briefs/v2-backend-parity-and-full-run.md).

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

Spike outcome (2026-06-13): the **D4 spike-gate is satisfied** — all 4 spikes on
`replays-fetcher` are VALIDATED (`001` oxlint-preset-port, `002` oxfmt-format-diff,
`003` tsdown-docker-smoke, `004` depcruise-knip-import-gap), closing OQ-1b/OQ-1c/OQ-2.
Non-negotiable decisions it locked for the real `@solidstats/config` build:
the preset **ports each rule's options, not just severities** (severity-only porting
produced 1336 false positives on a green repo); `eslint-plugin-import` is **dropped
entirely** — `tsc` covers `no-unresolved`, dependency-cruiser covers `no-cycle`/boundaries,
knip covers unused-modules + dep hygiene, only `import/order` may need a tiny residual;
`no-await-in-loop` stays **off** in backends; type-aware (tsgolint alpha) must be
**re-validated per repo** (`server-2` next) before cutover. See
`replays-fetcher/.planning/spikes/MANIFEST.md`.

Sequencing note: Track C runs after the Track A contract freeze settles per repo —
toolchain churn during active API work would create noise — but **must complete
before the production cutover** (decision **D1**: the whole of Track C is a hard
gate, Vite+ migration included). The **D4 spike-gate is done** (see above), so Track C
proceeds to the real `@solidstats/config` migration. Per-repo order:
`replays-fetcher` → `server-2` → `web` (greenfield, scaffolded straight onto Vite+).

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
- [CUTOVER-MODEL.md](CUTOVER-MODEL.md) — how legacy + the new `-2` runtime run in
  parallel and what cutover validation can mean given the parsers are
  intentionally non-identical (coverage-only auto-check; values are human review).
- [V2-CUTOVER-REVIEW.md](../archive/product/V2-CUTOVER-REVIEW.md) — **archived**
  (delivered as server-2 v3.0, 2026-06-08); kept as the historical gap analysis
  and the locked v1 backend scope decisions (2026-05-31). See the
  [archive index](../archive/README.md).
