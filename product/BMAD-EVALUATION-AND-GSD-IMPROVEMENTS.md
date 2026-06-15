# Product Doc — BMAD Evaluation & GSD Process Improvements

## Context

- Date: 2026-06-15
- Status: evaluation complete; **stay on GSD** (no migration). Two process improvements
  borrowed from BMAD are **approved** for implementation.
- Trigger: should the SolidStats GSD workflow migrate to the BMAD-METHOD
  (`github.com/bmad-code-org/BMAD-METHOD`)?
- Scope: product-wide — affects the GSD workflow and the shared `solidstats-*` skill
  family used across `server-2`, `replays-fetcher`, `replay-parser-2`, and `web`.

BMAD facts below were verified against primary sources (the live repo, its `docs/`,
`package.json`, releases, and tracked issues) at the date above. BMAD moves fast, so
treat versions as a snapshot.

## Decision

**Do not migrate to BMAD. Stay on GSD, and borrow two specific ideas as skill/config
edits — no `.planning/` migration, fully reversible.**

The two approved improvements:

1. **Plan provenance** — source-anchored premises in `PLAN.md` so a wrong input
   assumption can't silently propagate into execution.
2. **Named adversarial review lenses** — run code review as several distinct
   adversarial passes (Contract / Edge / Acceptance), fanned out as **parallel
   subagents** by `gsd-code-review` / `gsd-verifier`, all reporting into the single
   shared review format.

## Part A — BMAD evaluation (why not migrate)

### What BMAD is now (verified, v6.8.0, 2026-05-25)

| Dimension | BMAD v6.8.0 | Implication for SolidStats |
|---|---|---|
| Architecture | Ground-up rewrite. Everything is an Agent Skill (`SKILL.md` + frontmatter), persona = sibling `customize.toml`, activated by a Python resolver. Not native Claude Code subagents, not MCP. | Same skills mechanism GSD already uses on Claude Code. Migrating swaps one skills system for another and discards our customization. |
| Claude Code support | First-class, `preferred: true` install target; lands skills in `.claude/skills/`. Also ships a `.claude-plugin/marketplace.json`. | No integration gain over what we have. |
| Workflow | Two-phase: agentic planning (PRD/architecture, optionally in a flat-rate web LLM) → context-engineered dev in the IDE. Four scale-adaptive phases: Analysis → Planning → Solutioning (multi-epic only) → Implementation. | Greenfield-shaped. Our work is incremental milestones on a frozen contract. |
| Self-contained story | `bmad-create-story` bakes all upstream context + prior-story learnings + file structure + testing standards into one story file, citing `[Source: file#section]`. | The one genuinely good idea — and our `PLAN.md` is already at this detail level. The gap is citation/provenance, not detail. |
| Review | `bmad-code-review` runs parallel adversarial layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor); "zero findings triggers a halt." | The named-lens diversity is worth borrowing; the forced-finding rule is not. |
| Brownfield | First-class but reconstructive: must run `document-project` to rebuild context the code already encodes. | Our conventions already live in `solidstats-*` skills; reconstruction is wasted motion. |
| Maturity / churn | ~49k stars, very active, ~biweekly minor releases, breaking changes in point releases, v5 skipped, DevOps/Infra module deprecated. | A moving target to track against a production product. |

### Why GSD wins for SolidStats specifically

- **We are brownfield with a frozen contract.** `server-2` shipped v1–v3 (39+ plans),
  OpenAPI is frozen at `1.0.0` behind CI gates, conventions are encoded in the
  `solidstats-*` skills. BMAD's documented weak spot is exactly mature codebases with
  established conventions; its full four-phase ceremony is "overkill" for incremental
  milestone work (independent benchmarks: a CRM dashboard took 12 min on OpenSpec /
  90 min on Spec Kit / 5.5 h on BMAD).
- **Context model fits better.** GSD does aggressive per-phase context resets; BMAD
  keeps long multi-agent conversations that accumulate context and tokens (its own
  open issue #1235 measures `create-story` analysis steps at 82–96k tokens each).
- **Switching cost is large and one-directional.** Migrating throws away the
  per-agent `agent_skills` injection of conventions, the `.planning/` lifecycle with
  three milestones of history/audits/retros/learnings, and the gates we run (verifier,
  Nyquist, security ASVS-L2, plan-review-convergence) — none of which map 1:1 onto
  BMAD.
- **Documented failure modes argue against it.** Silent error propagation across
  persona handoffs and agents marking stub/TODO work "done" (issue #2003) are the
  inverse of our verifier-gated discipline. These motivate Improvement 2.

The honest summary: BMAD v6 converged on the same Skills primitive GSD already uses on
Claude Code, and the things it's praised for, we already have GSD-native equivalents
of — several customized more deeply than BMAD ships out of the box.

## Part B — Borrowed improvements (approved)

### Improvement 1 — Plan provenance

**Gap.** `PLAN.md` is already BMAD-story-grade in detail (see
`server-2/.planning/phases/01-game-type-aware-statistics-parity/01-01-PLAN.md`: frontmatter
`must_haves`, `<context>` with `@`-includes, per-task action/verify/done, a STRIDE block).
The gap is **traceability of input premises**. Load-bearing facts are embedded as prose
with informal pointers — "per D1/D2/D3", "RESEARCH A", "the running engine is
PostgreSQL 17" — not as anchors `gsd-plan-checker` / `gsd-verifier` can mechanically
re-open and re-verify. A false premise (classic: "`rotation_id` is NOT NULL today" when
it is already nullable) propagates silently into a broken migration. This is the
BMAD #2003 failure mode; the fix is provenance, not more detail.

**Change** — three additions, all in the existing citation idiom (`[conv: …]` / `[std: …]`
already used in reviews):

- **`[src: file#anchor]` on every load-bearing claim** in `<action>`. "per D1" →
  `[src: CONTEXT.md#D1]`; "RESEARCH A" → `[src: RESEARCH.md#A-existing-constraints]`;
  "PostgreSQL 17" → `[src: AGENTS.md#Stack-Direction]`.
- **A premises ledger**, distinct from `must_haves.truths` (those are post-conditions;
  premises are inputs). Each entry = `claim` + `[src:]` + a one-line `verify:` command.
  Example: `claim: rotation_id is already nullable on the four aggregate tables` ·
  `src: 0001_v1_domain_schema.sql#L120` · `verify: grep 'rotation_id' …0001….sql`. The
  plan-checker runs `verify` instead of trusting the prose.
- **Carried-forward learnings** — a short block citing the prior plan's
  `*-SUMMARY.md#deviations`, so learnings already captured (and injected via
  `learnings.max_inject`) become part of the plan's contract rather than background
  context.

**Where it lands.** A new shared foundation skill **`solidstats-shared-planning-standards`**
(mirrors `solidstats-shared-review-standards` / `solidstats-shared-testing-standards` — a
standard read by the planning agents, not a standalone command). It defines the `[src:]`
anchor format and the premises-ledger shape. Wire it into the `agent_skills` lists for
`gsd-planner`, `gsd-plan-checker`, and `gsd-executor` in each repo's
`.planning/config.json`. Add a `gsd-plan-checker` checklist item: "every load-bearing
premise resolves via `[src:]`; spot-verify N."

Cheaper alternative (if a new skill is unwanted): fold the same rules into a section of
`solidstats-shared-project-standards`, which already auto-triggers and is injected — zero
new wiring, at the cost of mixing planning rules into the general baseline. Recommendation:
the dedicated skill, for separation and consistency with the family pattern.

### Improvement 2 — Named adversarial review lenses (parallel subagents)

**Gap.** `solidstats-server-ts-code-review` is a strong single linear pass (Phase 1
API-contract gate, Phase 2 ten-topic risk-ordered sweep, severity table, citations). A
single reviewer that just explained why the code is correct is poorly placed to find how
it breaks. BMAD's parallel adversarial layers exist to break that blind spot.

**Change.** Define **named review lenses** as distinct adversarial mandates, all
reporting into the **same** `solidstats-shared-review-standards` format (severity buckets,
continuous numbering, single verdict). The format invariant is non-negotiable; only the
number and angle of passes change. Three lenses mapped onto server-2 risk:

| Lens | Mandate | Maps onto (server-ts) |
|---|---|---|
| **Contract Adversary** | "Assume the change breaks the generated `web` client or the frozen OpenAPI `1.0.0`. Prove it doesn't." | sharpens the existing Phase 1 contract gate |
| **Edge / Failure Hunter** | "The happy path works. Find the unhandled error path, N+1, null/empty/duplicate, transaction boundary, non-idempotent consumer." | Phase 2 topic 2 + queue-reliability |
| **Acceptance Auditor** | "The task is marked done. Prove the test proves `must_haves.truths`, not just that code runs." | §F + the plan's `must_haves` + `<success_criteria>` |

Acceptance Auditor is the highest-value lens: it stitches review back to the plan's own
contract and directly closes BMAD's #2003 failure (stub/TODO marked done, weak/fabricated
tests).

**Adversarial mandate without breaking the noise filter.** Each lens must record what it
attacked and ruled out in the existing **Non-Findings Checked** section (§D). That is the
audit trail BMAD's "zero findings = halt" reaches for — expressed as evidence, not a
forced finding.

**Orchestration (chosen): parallel subagents.** `gsd-code-review` / `gsd-verifier` spawn
one subagent per lens (each runs the matching reviewer skill scoped to its lens mandate),
then a merge step deduplicates into one report under the shared format. Tie fan-out to
depth: single pass for `/gsd-quick`; parallel lenses for phase/milestone reviews (our
`code_review_depth: "deep"`). Not every color-of-a-button change needs three lenses.

**Where it lands.**
- `solidstats-shared-review-standards`: a new "Review lenses" section — the three named
  lenses, the adversarial-mandate-as-Non-Findings-Checked rule, and the guardrails ("many
  lenses, one format"; "no forced findings").
- The four reviewers (`solidstats-server-ts-code-review`, `solidstats-fetcher-ts-code-review`,
  `solidstats-parser-rust-code-review`, `solidstats-frontend-react-code-review`): map the
  generic lenses onto their own risk order (server-ts maps cleanly to its existing phases).
- GSD orchestration: `gsd-code-review` / `gsd-verifier` fan out per lens at deep depth and
  merge. This is the part wired on the GSD side (local `gsd-core`), so it carries the most
  integration care.

## Implementation plan

Phased so the cheap, high-ROI layers ship first and the heavier orchestration is deferred
— same shape as the CAPTURE-first staging in `product/SKILLS-REVIEW-FEEDBACK-TIER.md`.

| Phase | Scope | Size | Risk |
|---|---|---|---|
| **P1 — Provenance** | Author `solidstats-shared-planning-standards` (`[src:]` format + premises ledger + carried-forward block). Wire into `agent_skills` for `gsd-planner` / `gsd-plan-checker` / `gsd-executor` across repos. Add the plan-checker spot-verify checklist item. | S | low — additive to plan format; no behavior change until planners adopt it |
| **P2 — Review lenses (single-pass)** | Add the "Review lenses" section to `solidstats-shared-review-standards`; map the three lenses in the four reviewers. Works immediately as named passes within the current single-reviewer flow. | S | low — format-preserving |
| **P3 — Parallel-subagent fan-out** | `gsd-code-review` / `gsd-verifier` spawn one subagent per lens at deep depth; add the merge/dedup step into one shared-format report. | M | medium — GSD-side wiring + dedup correctness |

Sequencing rationale: P1 and P2 are independent and both low-risk skill edits; either can
go first. P3 depends on P2 (the lenses must be defined before they can be fanned out) and
is the only phase touching GSD orchestration, so it's isolated last.

Authoring all skill edits goes through the skills-repo conventions (`skills/AGENTS.md`):
RU + EN frontmatter triggers, the `solidstats-shared-*` naming for foundations read by
other skills/agents.

## Decisions locked

- **D1** — Stay on GSD; no migration. (Part A.)
- **D2** — Improvement 1 (plan provenance) approved. (`lgtm`.)
- **D3** — Improvement 2 (review lenses) approved, with the **parallel-subagent**
  orchestration via `gsd-code-review` / `gsd-verifier` (chosen over single-pass-only).
  (`lgtm` + explicit preference.)

## What NOT to borrow

- **BMAD's "zero findings → halt" / forced-finding rule.** It conflicts with the
  family's noise filter (§G: "every false finding spends the developer's trust") and the
  "signal over volume" philosophy. Borrow the lens diversity and the mandate-as-evidence,
  not the forced finding.
- **The full BMAD method / four-phase ceremony / persona switching.** Overkill for
  brownfield milestone work and a churn liability.
- **`document-project` reconstruction.** Our conventions already live in the skills.

## Sources

- BMAD-METHOD repo: `github.com/bmad-code-org/BMAD-METHOD` — release v6.8.0 (2026-05-25);
  `docs/explanation/named-agents.md`, `docs/explanation/web-bundles.md`,
  `docs/reference/agents.md`, `docs/reference/workflow-map.md`,
  `src/bmm-skills/4-implementation/bmad-create-story/`, `bmad-code-review/`,
  `.claude-plugin/marketplace.json`, `tools/installer/ide/platform-codes.yaml`.
- BMAD limitations: issue #1235 (token usage), issue #2003 (structural gaps / stubs marked
  done); independent SDD comparisons (reenbit, willtorber/dev.to, cameronsjo/spec-compare).
- SolidStats GSD state: `server-2/.planning/config.json` (workflow gates, `agent_skills`),
  `server-2/.planning/phases/01-game-type-aware-statistics-parity/01-01-PLAN.md` (plan
  shape), `server-2/.planning/PROJECT.md` / `ROADMAP.md` (milestone history).
- Skills grounded against: `skills/solidstats-shared-review-standards`,
  `skills/solidstats-server-ts-code-review`, and the four reviewer skills.
- Format/tone reference: `product/SKILLS-REVIEW-FEEDBACK-TIER.md`,
  `product/TS-TOOLCHAIN-CONVERGENCE.md`.
</content>
</invoke>
