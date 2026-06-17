# replays-fetcher — Architecture Code Follow-ups (skill-driven, lands in the fetcher repo)

> **STATUS 2026-06-14 (triage) — MOSTLY DONE (3 of 4).** Landed: `cli.ts` god-file split
> (now 38 lines; thin `src/commands/` handlers + orchestration in `src/run/`, `src/discovery/`);
> `RunSummary` moved to `src/types/run-summary.ts` (resolves the upward-import fence violation);
> dependency-cruiser wired into `verify` (generic preset). **LIVE remaining:** the
> external-adapters single-client decision (shared `S3Client` + `pg` built once at the
> composition root and injected). Defer to the refactor.
>
> **Update 2026-06-17:** god-file splits are now tracked canonically in
> `replays-fetcher/TECH-DEBT.md` (`run-once.ts` down to ~1046 lines after the `run/ingest-page.ts`
> extraction — the 822/1073/707 counts below are a 2026-06-14 snapshot, partially superseded there).
> The remaining open item here is still the single shared `S3Client` + `pg` client built at the
> composition root.

**Created:** 2026-06-13
**Application:** `replays-fetcher`
**Status:** Non-blocking. The conventions are encoded in the skill drafts; this is the code-side
work that brings the repo into line with them. Do at fetcher-refactor time, not as a gate.

The fetcher architecture (five-band layering, write-scope fences, flat capability dirs) was
decided and encoded in `skills/solidstats-fetcher-ts-conventions/` — see ADR
`skills/decisions/0002-replays-fetcher-architecture.md`. The suppression policy that forces the `cli.ts`
split is `skills/decisions/0005-lint-and-coverage-suppression-policy.md`. Nothing here changes a
decision; it applies one. Exact paths and counts below; ground truth is
`skills/decisions/research/architecture-convergence.md §1` and
`skills/decisions/research/gate-suppression-backlog.md §D` + the fetcher slice of §A.

## Context

Four §A layout decisions (signed off 2026-06-13) name real code that does not yet match the
architecture the skill carries. The drift is concrete: duplicated client construction, one upward
import that violates the downward-only fence, and three god-files that the no-disable-`max-lines`
rule will not let us silence. None of it blocks the skill rollout — the skill ships PROPOSED and
the depcruise preset lands on architecture sign-off — but the preset draft already predicts the
violations against today's tree, so the cleanup is scoped, not open-ended.

## Decision

Apply the following at fetcher-refactor time.

### One shared S3 client, built at composition and injected

Today `s3-raw-storage`, `s3-checkpoint-store`, `s3-evidence-store`, and `check/s3-connectivity`
each call `new S3Client({...})` — four duplicated constructions. Build the `S3Client` once at the
composition root (the `commands/` handler) and inject the existing sender into all three stores.
The `*FromConfig` convenience factories collapse once construction moves up. Same treatment for
`pg`: one client built at composition, injected. This is the External-adapters rule — the
duplication was the client construction, not the adapters, which stay per-capability (no shared
`adapters/` dir). Encoded in `skills/solidstats-fetcher-ts-conventions/`.

### Move `RunSummary` to a cross-cutting `types/` module

`RunSummary` lives in `run/types.ts` and `evidence/s3-evidence-store.ts` imports it — an upward
import from the Adapter band into Orchestration, the one real fence violation in the current tree.
Move the type to a cross-cutting `src/types/` module; the builder `run/summary.ts` stays in `run/`.
This removes the upward import without exempting anything.

### Split `cli.ts` (822 lines) into thin registration + `commands/` + `run/`

`cli.ts` is 822 lines and is the anti-pattern the structural-gate carve-out exists for. Split it
into thin commander registration, per-command handlers under `commands/`, and orchestration logic
into `run/`. The two other god-files travel with it: `run-once.ts` (1073 lines) and `discover.ts`
(707 lines). No `max-lines` disable — the policy bans silencing a structural gate
(`skills/decisions/0005-lint-and-coverage-suppression-policy.md`); the fix is the split.

### Config deltas (`replays-fetcher` ESLint + vitest)

- `camelcase` already inherits `properties: never` from the shared baseline; add
  `allow: ["^run_id$"]` for the cross-service contract key (4 sites). Per
  `gate-suppression-backlog.md §A`.
- `vitest.config.ts coverage.exclude` += `src/cli.ts` (removes 2 ignores) — but only once `cli.ts`
  is the thin entrypoint above; the exclusion is sound exactly because the file then carries no
  testable logic.

## Rationale

The depcruise preset draft (`plans/archive/replays-fetcher/briefs/fetcher-dependency-cruiser.cjs`, notes in
`plans/archive/replays-fetcher/briefs/fetcher-depcruise-notes.md`) predicts exactly three violations against the current tree,
and only one of them is a code defect to fix:

1. `evidence/s3-evidence-store.ts` → `run/types.ts` (upward) — fires F3. This is the real one; the
   `RunSummary` move resolves it cleanly rather than by exemption.
2. `cli.ts` → capabilities directly (F1) — `cli.ts` is a composition root importing every
   capability/adapter for assembly. Not a bug; an exemption decision (exempt the composition root
   in `pathNot`, or route construction through a DI assembly module). Resolved by the `commands/`
   split, which gives construction a named home.
3. `check/*-connectivity.ts` import `pg` / `@aws-sdk/client-s3` directly (F6/F7a) — diagnostics
   adapters, already exempted in the preset. The diagnostics band is read-only and the write-scope
   fences carve it out; depcruise can't tell read from write, so the reviewer enforces read-only.

So one fix, two exemption decisions. The shared-client and `RunSummary` moves are the
External-adapters and downward-only rules made true in code; the `cli.ts` split is the
structural-gate carve-out (rule 1 of ADR 0005) applied to the 822-line god-file rather than dodged
with a disable. The rejected alternative for #1 — exempting `run/types.ts` from F3's `to.path` —
was passed over because it papers over a real upward dependency instead of removing it.

## Consequences

- These land **at fetcher-refactor time**, after the architecture is signed off and the
  `.dependency-cruiser.cjs` preset is wired (`pnpm run deps:validate` in the `verify` chain after
  `typecheck`, per `plans/archive/replays-fetcher/briefs/fetcher-depcruise-notes.md`). Until then the skill ships PROPOSED and
  layer checks in `skills/solidstats-fetcher-ts-code-review` stay pending.
- After the `commands/` split, the F1 composition-root exemption and the F6/F7a diagnostics
  exemptions are the two remaining sign-off items in the preset; the F3 `RunSummary` fix is the
  only code change that removes a predicted violation outright.
- The `src/cli.ts` coverage exclude is contingent on the split — adding it before `cli.ts` is thin
  would hide real branches, which the coverage half of ADR 0005 forbids.
- The 165 legitimate suppressions stay (fetcher `no-await-in-loop` for deliberate pacing / S3 CAS /
  source order, 14 sites) — narrow and reasoned, per policy; nothing here touches them.

## Sources

- `skills/decisions/research/gate-suppression-backlog.md` — §D fetcher §A follow-ups (shared
  S3/pg client, `RunSummary` move, `cli.ts` split) + §A fetcher config (`run_id` allow, `src/cli.ts`
  coverage exclude) + the line counts (822 / 1073 / 707)
- `skills/decisions/research/architecture-convergence.md §1` — converged five-band
  architecture, the four confirmed layout decisions, the External-adapters one-client rule
- `plans/archive/replays-fetcher/briefs/fetcher-depcruise-notes.md` — the three predicted current-tree
  violations and which is the real fix vs. an exemption decision
- `skills/decisions/0002-replays-fetcher-architecture.md` — the five-band architecture decision
  these follow-ups apply (encoded in `skills/solidstats-fetcher-ts-{conventions,code-review,tests}/`)
- `skills/decisions/0005-lint-and-coverage-suppression-policy.md` — never silence a structural gate;
  why the `cli.ts` split is a split, not a `max-lines` disable
- `plans/replays-fetcher/briefs/fetcher-architecture-conventions.md` — the Variant A architecture
  these follow-ups apply to
