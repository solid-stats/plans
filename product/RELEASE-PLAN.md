# Solid Stats 2 — Release Plan

**Last updated:** 2026-07-04

This is the current release entry point for Solid Stats 2. Historical milestone
briefs and delivered decision packs live in [`../archive/`](../archive/); active
implementation state lives in each application's own `.planning/` directory.

Solid Stats 2 replaces the legacy `replays-parser` + `server` stack with a
multi-repo product:

- `replay-parser-2` parses OCAP replays and emits immutable parser evidence.
- `replays-fetcher` discovers replay files and stages raw replay evidence.
- `server-2` is the PostgreSQL source of truth, API, moderation, and jobs layer.
- `web` is the browser UI and is the only major app not yet implemented.
- `infrastructure` owns deploy, runtime, observability, backups, and cutover.

## Status Snapshot

| Repo | Current state |
|------|---------------|
| `replay-parser-2` | App exists and the original start brief is archived. Active follow-up work remains in parser tech debt and focused briefs, especially coverage-gate cleanup and deferred contract conformance. |
| `replays-fetcher` | App exists; the original start brief and superseded architecture follow-up briefs are archived. Active operational debt remains in `replays-fetcher/TECH-DEBT.md`. |
| `server-2` | App exists and the original start brief is archived. Active follow-up work remains around dependency-cruiser wiring, TypeBox to zod migration, and skill/convention cleanup. |
| `web` | Still not implemented. [`../web/briefs/web.md`](../web/briefs/web.md) remains the active app brief, supported by the product decision packs below. |
| `infrastructure` | v2 backend-parity/full-run and observability briefs remain active planning references; ops debt is tracked in `infrastructure/TECH-DEBT.md`. |

## Active Product Decisions

These packs supersede older assumptions in archived app briefs and milestone
briefs:

- [`SCORE-DECISIONS.md`](SCORE-DECISIONS.md) — `sg` is the primary product
  surface; score is the main metric; public score uses `adjustedScore` with
  `C = 12`; no hard `is_show` leaderboard eligibility.
- [`BOUNTY-DECISIONS.md`](BOUNTY-DECISIONS.md) — bounty is SG-only, measures
  victim quality, uses current-rotation victim adjusted score, clamps the
  multiplier to `0..3`, and awards teamkills `0`.
- [`IDENTITY-AUTH-REQUESTS-DECISIONS.md`](IDENTITY-AUTH-REQUESTS-DECISIONS.md)
  — replay identity is name/date based, Discord OAuth identifies request
  authors and staff, and there is no Steam-based player ownership or public
  request journal.
- [`CORRECTION-LEDGER-RECALCULATION-DECISIONS.md`](CORRECTION-LEDGER-RECALCULATION-DECISIONS.md)
  — parser evidence remains immutable; accepted corrections become append-only
  semantic operations and trigger recalculation.
- [`LEADERBOARD-UX-DECISIONS.md`](LEADERBOARD-UX-DECISIONS.md) — default
  leaderboard is SG all-time sorted by `adjustedScore desc`; display rounds
  numbers while sorting keeps full precision.

## Execution Model

Work now proceeds through the owning repo's GSD milestone flow:

1. Plan and execute backend/parser/fetcher/infrastructure follow-ups in their
   own repositories, using their `.planning/` state as the operational source of
   truth.
2. Keep cross-product decisions here in `product/`.
3. Build `web` after the backend/API/product decisions are stable enough for
   generated client work and UI implementation.
4. Before release, complete parity evidence, production observability, backup
   validation, and rollback readiness.

`plans` is not itself a GSD project. It stores shared product decisions, active
briefs, and historical provenance only.

## Engineering Hardening

The Track C toolchain convergence decision pack is delivered and archived:
[`../archive/product/TS-TOOLCHAIN-CONVERGENCE.md`](../archive/product/TS-TOOLCHAIN-CONVERGENCE.md).

Current TS toolchain direction:

- shared package: `@solid-stats/ts-toolchain`;
- backends/fetcher: Oxlint, Oxfmt, Vitest, tsdown, dependency-cruiser, knip,
  and lefthook where applicable;
- `server-2`: full convergence remains a follow-up in that repo, including
  dependency-cruiser and zod migration;
- `web`: scaffold directly onto the settled frontend stack and shared toolchain.

## Release Criteria

Solid Stats 2 is releasable when:

1. `web` is implemented against the frozen `server-2` API and the active product
   decision packs.
2. The replay corpus is ingested reliably and parity evidence is accepted.
3. Production deploy, observability, backups, and rollback are validated.
4. Active follow-up debt that can affect release correctness or operations is
   either resolved or explicitly accepted with an owner.

## Cross-References

- [`CUTOVER-MODEL.md`](CUTOVER-MODEL.md) — parallel run and validation model.
- [`PARITY-BASELINE-FINDINGS.md`](PARITY-BASELINE-FINDINGS.md) — parity findings
  register and accepted residuals.
- [`../archive/README.md`](../archive/README.md) — superseded planning docs.
