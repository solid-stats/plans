# Deep Brainstorm Brief — `solidstats-process-repo-convention-audit`

## Context
- Date: 2026-06-17
- Request: Audit an **entire** repository against its full convention ruleset to find every deviation. The existing `estesis-process-deep-code-research` skill caps how many files it reads, which blocks whole-repo coverage.
- GSD stage: explore → spec (designing a new process skill; no code written this session)
- Target outcome: A decision pack that fully specifies a new whole-repo convention-audit skill + a paste-ready build prompt.
- Artifact owner: Pavlov Alexandr

## Goal
Produce a new SolidStats process skill that performs an **open-ended, whole-repo convention-compliance audit**: read every source file in a repo, judge each against the full convention ruleset, and emit every deviation as machine-readable data for a downstream agent to consume. This is distinct from both existing harnesses and reuses, not forks, the existing rule sources.

## Users And Workflows
- The developer (or an orchestrating agent) runs the audit on one of the SolidStats service repos to inventory all convention deviations in the existing/legacy code — not a diff review, not a single-claim check.
- Output feeds a **downstream agent** (fix / triage / planning), never a human reader directly.

## Scope
### Must Have
- Enumerate **every** source file in the conventions' scope (not grep-narrowed, not diff-scoped, not file-capped).
- Judge each file against the full ruleset sourced from the existing `solidstats-<stack>-conventions` + `<stack>-code-review` + `solidstats-shared-backend-ts-standards` skills.
- Per-file map → per-candidate verify → recall critic (false-positive AND false-negative control).
- **JSON-only** output: a stable schema that is the skill's contract; no markdown report.
- Per-stack handling: TS (`replays-fetcher`, `server-2`) and Rust (`replay-parser-2`).
- Model/rate-limit policy tuned for the **Claude Max 20x subscription** (see Harness notes).

### Nice To Have
- Lane 2: global structural invariants (layering / `depcruise` / dependency direction / "every handler registered") delegated to `deep-code-research` / `depcruise` / `clippy` rather than reimplemented. **Deferred from v1** — v1 is the per-file lane only.
- Incremental re-runs / caching of unchanged files.

### Non Goals
- Not a diff/PR review (that is the `solidstats-<stack>-code-review` skills).
- Not a single-claim/invariant verification (that is `deep-code-research`).
- No code execution (no typecheck/tests/run) — static read only.
- No human-facing markdown report.

## Confirmed Decisions
| Decision | Choice | Rationale | Consequence |
|----------|--------|-----------|-------------|
| D1 — Task shape | Open-ended whole-repo convention audit (every source file vs full ruleset) | Deviations are open-ended; cannot be grep-narrowed. User needs full file coverage. | Needs an enumerate-and-judge map/reduce harness, not a targeted sweep. |
| D2 — This session | Decision pack only, no audit run | Decide-before-motion (brainstorm gate) | This doc + a build prompt are the deliverables. |
| D3 — Targets & rule source | `replays-fetcher` (TS), `server-2` (TS), `replay-parser-2` (Rust); rules from existing `solidstats-<stack>-conventions` + `<stack>-code-review` + `solidstats-shared-backend-ts-standards`; format/severity from `solidstats-shared-review-standards` | Single source of truth already exists & is maintained; don't fork a ruleset. | Audit is per-repo (3 runs / 3 reports); Rust lane uses the parser-rust skills. |
| D4 — Verification rigor | finder → independent verifier → recall critic | Verifier kills false-positives (re-reads the cited span, confirms it truly violates the cited rule); recall critic catches false-negatives (uncovered rules/dirs) | Most expensive but right for a one-time legacy inventory. |
| D5 — Rule feed & dedup | Pre-extract a **rule catalog** (rule-id + how-to-detect + severity) from the skills once; findings keyed by rule-id | Rule-keyed findings → clean dedup + a working recall critic; catalog derived from skills, not forked | Adds a Scope-stage catalog-extraction step (the audit's "angle decomposition"). |
| D6 — Output | **JSON-only**, consumer is an agent. §G noise filter **OFF**; grouping **OFF** (every occurrence is its own entry); §B scope-discipline **OFF** (whole repo IS the target). Severity kept as a sortable field. | It's a data-production step for a downstream agent, not a curated human review. The audit deliberately overrides the diff-review disciplines. | Output can be thousands of entries — that is by design. The JSON schema is the skill's contract and must be specified. |
| D7 — Home & form | New skill `solidstats-process-repo-convention-audit` in `SolidGames/skills`, sibling of `solidstats-process-review-lenses`, wrapping a **new** Workflow. Reuses review-lenses' discovery/merge skeleton + the reviewer skills as rule source + `shared-review-standards` for severity/citation. Does **not** edit `deep-code-research`. | `deep-code-research`'s accuracy rests on a single anchor claim + grep-narrowed candidates; a "read everything" mode would break that. Wrong shape and wrong scope to retrofit. | Clean separation: `deep-code-research` = targeted verification; this skill = exhaustive audit; review skills = diff review. |
| D8 — Model & rate-limit policy | See Harness notes. Haiku for all fan-out; Opus only on a contested subset, behind an in-script **semaphore (~4–6)** and a **per-run Opus-call budget**; shared `cache_control` prefix on Opus calls. | User is on **Claude Max 20x**, not an API tier — two distinct limits (429 burst throttle + weekly Opus budget) need two distinct levers. | Concurrency cap addresses the 429; volume cap addresses the weekly Opus budget; both enforced in the script. |

## Harness, Model & Rate-Limit Notes (the "infra" layer)
| Topic | Decision/Default | Consumer Consequence | Hidden Cost | Breaking Point |
|-------|------------------|----------------------|-------------|----------------|
| Billing context | Runs on **Claude Max 20x subscription**, NOT an API org/tier | API RPM/ITPM/OTPM tier reasoning does not apply | — | Assuming API token-bucket limits → wrong design |
| 429 burst throttle | Bound concurrent Opus with an in-script **semaphore (~4–6)**; tune up until 429s appear, back off | Avoids the explicit HTTP 429 the user hit at ~30 concurrent Opus | Slightly longer wall-clock | The Workflow global cap `min(16, cores−2)` does NOT split by model — must add an Opus sub-semaphore |
| Weekly Opus budget | Cap **total** Opus volume: Opus only on contested/🔴🟠 subset; **per-run Opus-call budget** (top-N); fan-out stays on Haiku | A full 3-repo audit won't silently drain the weekly Opus hours | Some contested findings may be adjudicated by Sonnet instead of Opus when the budget is spent | Unbounded Opus over 250 files exhausts the weekly cap |
| Prompt caching | Shared `cache_control` prefix (rule catalog + conventions slice + span template) on all Opus calls | Lower consumption per Opus call → more adjudications fit the budget | Cache-write premium on first call | — |
| Model tiering | Scope/catalog + synthesize = Sonnet; find/verify/recall = Haiku; Opus = contested-subset adjudication only | Cheap parallelism for breadth; strong model only for judgment | — | Putting Opus in the wide fan-out → 429 + budget burn |
| Execution | Static read only (no Bash/typecheck/tests/run) | Runtime behavior & real config values invisible | — | Report must carry runtime + grep blind-spot caveats in `meta` |

## Workflow architecture (target)
```
Scope      → extract rule catalog per stack from conventions+review skills      [Sonnet, ×3 sequential]
Enumerate  → list every source file in scope, batch by module/directory          [—]
Find       → per-batch map: batch × catalog → candidate findings (rule-id, file:line) [Haiku, pipeline]
Verify     → per-candidate: re-Read the span, confirm it truly violates the rule  [Haiku, pipeline]
Recall     → which rule-ids / dirs were never checked → fill gaps                 [Haiku]
Synthesize → exact-duplicate dedup; Opus adjudication on contested subset
             (semaphore ≤~6, per-run budget, shared cached prefix); assemble JSON  [Sonnet + budgeted Opus]
```
Lane 2 (global structural invariants → `deep-code-research`/`depcruise`/`clippy`) is **deferred from v1**.

### Output JSON schema (the contract — to be finalized in build)
- `meta`: `{ repo, stack, commit, staticOnly: true, blindSpots: string[], opusAdjudications: { used, skippedByBudget } }`
- `coverage`: `{ suspendedRuleIds: string[], rulesNotChecked: string[], dirsSkipped: string[] }`
- `summary`: `{ byRule: { [ruleId]: count }, bySeverity: { "🔴"|"🟠"|"🟡"|"🔵": count } }`
- `findings[]`: `{ ruleId, severity, stack, file, lineStart, lineEnd, quote, message, fix, verified: boolean }`

Coverage + caveats are first-class so the consumer can tell "no violations" from "not checked".

## Assumptions
| Assumption | Confidence | Evidence | How To Validate |
|------------|------------|----------|-----------------|
| The `solidstats-<stack>-conventions`/`-code-review` skills are complete enough to derive an auditable rule catalog | High | They already power the diff reviewers with `[conv:]`/`[std:]` citations | Run the Scope catalog-extraction on fetcher and eyeball the rule list |
| Per-file judgment covers most convention rules; cross-file rules are a minority | Medium | Most fetcher/server rules are local (naming, typed errors, Zod, async, SQL params) | Recall critic surfaces rules no batch could check → those are the cross-file ones |
| A bounded Opus semaphore (~4–6) stays under the 429 throttle | Medium | User hit 429 around ~30 concurrent Opus | Empirically raise until a 429 appears, then back off |

## Risks
| Risk | Severity | Why It Matters | Mitigation |
|------|----------|----------------|------------|
| Whole-repo Opus adjudication drains the weekly Opus budget | 🟠 | Max 20x weekly Opus cap is the binding limit | Per-run Opus-call budget + contested-subset-only + Haiku fan-out |
| Burst of concurrent Opus → 429 | 🟠 | Observed failure mode | In-script Opus semaphore (~4–6) |
| Rule catalog drifts from the skills over time | 🟡 | Findings would cite stale rules | Re-extract the catalog every run from the live skills (don't persist a forked copy) |
| Fetcher layer/architecture rules are PROPOSED/suspended | 🟡 | Auditing them now would raise invalid layer findings | Catalog marks those rule-ids `suspended`; they go in `coverage.suspendedRuleIds`, not `findings` |
| Output is huge (thousands of entries) | 🔵 | By design (no noise filter, no grouping) | JSON is machine-consumed + sortable by rule/severity; not a concern for the agent reader |

## Acceptance Criteria
- Skill enumerates 100% of in-scope source files (no file cap, no grep narrowing, no diff scope).
- Every finding carries `ruleId`, `severity`, `file:lineStart-lineEnd`, verbatim `quote`, and `verified` flag.
- `coverage` distinguishes "checked, no violation" from "not checked" (suspended / uncovered rules + skipped dirs listed).
- Opus usage is bounded by both a concurrency semaphore and a per-run call budget; `meta.opusAdjudications` reports used vs skipped-by-budget.
- Output is valid JSON against the schema; no markdown report emitted.
- Fetcher's suspended layer rules never appear as findings.

## Verification Plan
- Pilot on `replays-fetcher` (smallest, ~57 source files) first — cheapest calibration and bounds Opus spend.
- Dogfood: hand-check a sample of findings against the cited spans; confirm verifier kills planted false-positives and recall critic flags a deliberately-skipped rule.
- Confirm no 429 at the chosen semaphore size; confirm a run stays within a sane Opus-call budget (check `/usage` before/after).

## Open Questions
| Priority | Question | Why It Matters | Owner/Status |
|----------|----------|----------------|--------------|
| P2 | Are test files in scope (lighter §F lane) or excluded from v1? | Affects file count & rule set | Default: separate lighter lane / excluded from v1 |
| P2 | Exact per-run Opus-call budget number | Governs weekly-budget safety | Tune on the fetcher pilot |
| P3 | Ship Lane 2 (global invariants) in v1 or later? | Cross-file rule coverage | Default: defer to v2 |

## Question Ledger
| Priority | Question | Answer | Decision Impact |
|----------|----------|--------|-----------------|
| P0 | What does "find deviations from rules" mean? | Open-ended whole-repo convention audit | D1 — drives the whole harness shape |
| P0 | Session deliverable? | Decision pack / design | D2 |
| P0 | Which repos + rule source? | fetcher (TS), server-2 (TS), parser-2 (Rust); existing solidstats skills | D3 |
| P0 | Fix `deep-code-research` or new skill? | New separate skill | D7 |
| P1 | Verification rigor? | finder + verifier + recall critic | D4 |
| P1 | Rule feed & dedup? | Pre-extract rule catalog, rule-keyed | D5 |
| P1 | Output format? | JSON-only; §G off; grouping off; §B off | D6 |
| P1 | Rate-limit policy? | Max 20x subscription: Opus semaphore + per-run Opus budget; Haiku fan-out | D8 |

## Recommended Next Step
- Primary: `skill-creator` — scaffold `solidstats-process-repo-convention-audit` (SKILL.md + `workflows/repo-convention-audit.workflow.js`), using the build prompt at `/tmp/repo-convention-audit-skill-prompt.md`. Take the discovery/merge skeleton from `solidstats-process-review-lenses` and the severity/citation/output discipline from `solidstats-shared-review-standards`.
- Rationale: All P0/P1 decisions are closed; the design is implementation-ready.
- Alternatives: (a) build the Scope catalog-extraction stage first as a standalone spike to validate the rule catalog before committing to the full harness; (b) pilot the per-file Find/Verify lane on `replays-fetcher` only before generalizing to all three repos.
