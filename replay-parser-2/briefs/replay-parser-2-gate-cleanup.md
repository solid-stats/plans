# replay-parser-2 — Gate-Cleanup Follow-Up (code-side)

**Created:** 2026-06-13
**Application:** `replay-parser-2`
**Status:** §C is a live risk (act now); §A and §B are non-blocking, do over time.

The skills pass settled the *policy* for quality-gate suppressions and parser conventions;
this brief is the *code* that brings the parser repo into line. The policy is already encoded
and greppable — lint floor in `skills/solidstats-parser-rust-conventions/SKILL.md §B`, coverage
discipline in `skills/solidstats-parser-rust-tests/SKILL.md` and `skills/solidstats-shared-testing-standards/SKILL.md §H`,
the cross-stack doctrine in `skills/decisions/0005-lint-and-coverage-suppression-policy.md`, and
the parser convention deltas in `skills/decisions/0006-replay-parser-2-convention-deltas.md`.
Nothing here re-litigates those decisions; it applies them.

Read first to match scope: `skills/decisions/research/gate-suppression-backlog.md` (§A–§C),
from which the parser slices below are distilled.

---

## §C — Coverage enforcement (THE REAL RISK — lead with this)

The parser's `coverage/allowlist.toml` discipline is the model the suppression policy points at:
per-entry owner, reviewer, expiry, a co-located `// coverage-exclusion:` marker, legitimate
categories only (live-I/O boundaries, serde `Visitor` arms, `tokio::select` cancellation races,
defensive schema-drift fallbacks). ADR 0005 endorsed it rather than replacing it precisely because
it already implements the strongest form — owner, expiry, co-located reason, CI enforcement. But
both hard requirements that make it a gate rather than theatre are currently failing:

1. **All 14 allowlist entries are EXPIRED.** Every entry carries `expiry 2026-05-28`; today is
   `2026-06-13`. A passed expiry is a finding, not a grace period — it means no owner has re-reviewed
   the gap. Renew each entry with a fresh owner review, or resolve the underlying gap (write the test).
   The policy is explicit that an entry must stay within a live expiry; 14 stale entries is 14 findings.

2. **CI does not run coverage at all.** `cd.yml` runs only `cargo test --workspace`. The strict gate
   — `scripts/coverage-gate.sh --strict`, guarded by `COVERAGE_ALLOW_HEAVY=1` — is local-only. An
   allowlist that no CI job checks is an unread document: the thresholds and the allowlist are
   unenforced today regardless of their content. Add a verify-job step (e.g. with
   `COVERAGE_ALLOW_HEAVY=1` set) that runs `scripts/coverage-gate.sh --strict` so the allowlist and
   the coverage thresholds are actually enforced on every push.

Both must land together: renewing the entries without wiring the gate leaves them unchecked; wiring
the gate while entries are expired fails the build until they are renewed or resolved. Do §C first.

## §A — Clippy / Cargo config-once (cheap; deletes the most inline suppressions)

Per the config-once rule (`§B`: N scattered `#[expect]`s for one lint is the signal to promote one
workspace line), move codebase-wide clippy noise to the root `Cargo.toml [workspace.lints.clippy]`
table instead of suppressing at each site:

- `trivially_copy_pass_by_ref = "allow"` — 8 sites, one shared rationale. One table line, not 8 site
  suppressions.
- optionally `missing_const_for_fn = "allow"` — 1 site (private builders).
- **DELETE the 9 redundant test-module `#![allow(clippy::expect_used)]`** — already covered by
  `clippy.toml` `allow-expect-in-tests`. They are dead suppressions, not exceptions.

## §B — Refactor (one structural-gate split)

- `raw_compact.rs:716` — split the one `too_many_lines` test fixture into per-key-group helpers.
  Rule 1 of the suppression policy is non-negotiable: a structural complexity gate
  (`too_many_lines`) gets a split, never an `#[expect]`/`#[allow]`. The unit is doing more than one
  thing; break the fixture into per-key-group helpers rather than silencing the limit.

---

## Out of scope

The ~11 genuine Rust by-construction `expect`/cast/contract allows and the allowlist's legitimate
live-I/O / serde-`Visitor` / select-cancellation entries stay — narrow, reasoned, and (for the
allowlist) within a live expiry once §C renews them. The §K–§M observability/lifecycle code audit
(swallowed Results, unbounded worker-state fields, missing semaphore concurrency caps) is ADR 0006
follow-up that lands when `solidstats-parser-rust-code-review` runs against the repo, not here.

## Sources

- `skills/decisions/research/gate-suppression-backlog.md` — §A config-once, §B refactor, §C
  process fixes (the 14-entry / `2026-05-28` expiry / `cd.yml` / `COVERAGE_ALLOW_HEAVY=1` facts).
- `skills/decisions/0005-lint-and-coverage-suppression-policy.md` — the structural-gate /
  config-once / narrow-exception policy and the two allowlist hard requirements (live expiry + CI).
- `skills/decisions/0006-replay-parser-2-convention-deltas.md` — parser convention
  deltas; the §K–§M out-of-scope follow-up.
- `skills/solidstats-parser-rust-conventions/SKILL.md §B`,
  `skills/solidstats-parser-rust-tests/SKILL.md`,
  `skills/solidstats-shared-testing-standards/SKILL.md §H` — where the policy is encoded (greppable).
- `plans/replay-parser-2/briefs/replay-parser-2.md` — parent app brief (format/tone, product scope).
