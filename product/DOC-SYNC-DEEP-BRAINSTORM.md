# Doc Sync — Deep Brainstorm Brief

## Context
- Date: 2026-06-19
- Request: Analyze the current repos, then synchronize documentation across all repos and in the organization repo.
- GSD stage: explore → spec (cross-repo, org-level; not a single project's `.planning/`).
- Target outcome: a decision pack that defines a canonical documentation standard, records the reconciliation decisions, and feeds a `gsd-quick` sequence.
- Artifact owner: @Afgan0r.
- Scope boundary vs. `product/DOCS-AUDIT-2026-06-17.md`: that audit fixed *staleness inside `plans`* (briefs, parity findings, cross-ref links, archiving). This brief is the *cross-repo + org-repo* sync of README / AGENTS.md / governance / org profile. Complementary, no overlap.

## Goal
One coherent documentation baseline across the whole `solid-stats` GitHub org: every repo carries the documentation its tier requires, the public org profile matches reality, and the rule that makes this true is codified in the `solidstats-shared-project-standards` skill so it stops drifting.

## Users And Workflows
- **AI agents** (primary readers of `AGENTS.md` / `CLAUDE.md`): need a consistent top section per repo — what the repo owns, its boundary, where the shared standards live.
- **The maintainer** (@Afgan0r): needs the public org profile to honestly reflect the live architecture.
- **The Solid Games community** (readers of every repo README + the org profile): a README is user-facing, so it is bilingual RU + EN.

## Scope
### Must Have
- A 3-tier repo taxonomy and a per-tier documentation matrix, codified in `solidstats-shared-project-standards`.
- Every repo brought up to its tier's doc minimum (notably: `web` README, `ts-toolchain` AGENTS.md / CLAUDE.md / LICENSE).
- Org profile (`.github` `profile/README.md` + `profile/README.en.md`) reconciled to the taxonomy and kept in sync.
- Every-repo-bilingual-README rule written into §H (README = user-facing RU + EN; internal docs English).

### Nice To Have
- A common header skeleton shared by every `AGENTS.md` (role, boundary per §D, link to skills) without rewriting the per-repo body.
- A deprecation banner on the legacy `sg-replay-parser` README pointing at `replay-parser-2`.

### Non Goals
- Rewriting the working body of any `AGENTS.md` (header-only standardization).
- Adding LICENSE to `plans` / `skills` (intentionally unlicensed process repos).
- Duplicating centralized governance (`CONTRIBUTING` / `SECURITY` / `CODE_OF_CONDUCT` / issue + PR templates) into individual repos — GitHub's `.github` org fallback already covers them.
- Committing or pushing anything without an explicit instruction.
- GitHub-archiving `sg-replay-parser` (a separate ops action, not doc work).

## Confirmed Decisions
| Decision | Choice | Rationale | Consequence |
|----------|--------|-----------|-------------|
| Sync depth | Facts + structure + codify in `skills` | A standard that lives only in a one-off pass drifts again; encoding it in the skill makes it enforceable | Heaviest path, but durable; touches the skill repo + every repo |
| Scope | All 9 active repos, legacy decided separately | "All repos" was explicit; tiering keeps it honest | `ts-toolchain` is in; `sg-replay-parser` handled as legacy |
| Source of truth | Skill-standards for structure/rules; reality for facts | §A makes the skill canonical; existence facts (which repos exist) can only come from reality | When the skill's wording is stale (e.g. "5-repo platform"), the skill gets fixed |
| Taxonomy | 3 tiers: Platform (5) / Supporting (3) / Legacy (1) | Honest reconciliation of "5-repo platform" vs 9 real repos — a service needs the full set, tooling does not | Per-tier doc minimums, not one flat bar |
| README language | Every repo README bilingual (`README.md` RU + `README.en.md` EN); internal docs English | A README is the user-facing front door for the RU community; internal docs serve engineers/agents | Every repo needs a bilingual README (incl. `web`, `ts-toolchain`); internal docs stay English |
| Delivery | Standard first in `skills` (upstream + re-sync), then `gsd-quick` per repo | The source of truth must exist before per-repo edits, or they drift | A short ordered sequence; I prepare and show, commit/push on command |
| LICENSE for supporting repos | `ts-toolchain` only (MIT) | It is reusable code; `plans` / `skills` are process artifacts where a code license is semantically wrong | One LICENSE added, not three |
| `ts-toolchain` in org profile | Yes, under "Supporting" | The profile must reflect reality (facts canon) | Profile repo table regrouped into Platform / Supporting |
| `AGENTS.md` standardization | Common header + per-repo body | Consistency without clobbering hand-written content (scope discipline) | Header insertion only; bodies untouched |

## Repo Taxonomy And Documentation Matrix

| Tier | Repos | README | AGENTS.md | CLAUDE.md stub | LICENSE | `.planning/` | Notes |
|------|-------|--------|-----------|----------------|---------|--------------|-------|
| Platform service | `server-2`, `replays-fetcher`, `replay-parser-2`, `web`, `infrastructure` | bilingual (`README.md` RU + `README.en.md` EN) | common header + body | yes (`@AGENTS.md`) | yes | yes (GSD) | `docs/` as needed (English) |
| Supporting | `plans`, `skills`, `ts-toolchain` | bilingual (RU + EN) | common header + body | yes | `ts-toolchain` only | no | `plans` is the GSD exception (no `.planning/`) |
| Legacy | `sg-replay-parser` | bilingual; deprecation banner → `replay-parser-2` | leave as-is | — | keep existing | frozen | no further doc work |

### Gaps to close (current → required)
- `web`: no README → add a bilingual README (`README.md` RU + `README.en.md` EN).
- `ts-toolchain`: missing `AGENTS.md`, `CLAUDE.md`, `LICENSE` → add all three (MIT).
- `sg-replay-parser`: no `CLAUDE.md`, no deprecation notice → add a banner to the README; `CLAUDE.md` not required for legacy.
- `AGENTS.md` everywhere: insert the common header section (role + boundary per §D + link to `skills`) above the existing body.

### Org repo (`.github`)
- `profile/README.md` (RU) + `profile/README.en.md` (EN): regroup the repo table into **Platform services (5)** and **Supporting (`plans`, `skills`, `ts-toolchain`)**; keep the legacy line (`server`, `sg-replay-parser`, `relay`); add `ts-toolchain`. Both files edited in one change (the existing HTML-comment rule).
- Governance files stay centralized; verify they reference the current architecture. No per-repo duplication.
- Leave the public-site-URL TODO until the URL exists.

## Skill Edit (`solidstats-shared-project-standards`)
- Replace the "five-repo platform" framing with the 3-tier taxonomy. Keep the distinction explicit: the **product/platform = 5 services**; the **org = those 5 + supporting + legacy**. (`plans` `AGENTS.md` already describes the product as the 5 services — consistent, leave it.)
- §H: every repo README is bilingual (`README.md` RU + `README.en.md` EN); internal docs (code, comments, planning, skill bodies/refs, `AGENTS.md`, `docs/`) stay English; the two README files are edited together so they never drift.
- Add the per-tier documentation matrix as the codified standard.
- Edit it directly per the `skills` repo's own authoring procedure (`AGENTS.md`): skill body + a `CHANGELOG.md` entry + RU/EN triggers kept intact. The `skills` repo is **not** a GSD-command target — it has a `.planning/` but no `.claude/gsd-core`, so there is no `gsd-quick` here; the edit is plain skill authoring.
- The repo taxonomy + doc standard is a **cross-stack rule**, so it likely also warrants an ADR under `skills/decisions/` (per that repo's convention: per-skill edits go in the skill's `CHANGELOG.md`, a decision spanning more than one skill gets an ADR).
- Land upstream in the `solid-stats/skills` repo, then re-sync into the vendored copies. Never edit a vendored `.agents/skills/**` (or in-project `skills/`) copy directly — it is overwritten on the next sync.

## Assumptions
| Assumption | Confidence | Evidence | How To Validate |
|------------|------------|----------|-----------------|
| A README is user-facing → bilingual (RU + EN); internal docs are English | High | User decision (Wave 2, reaffirmed): a repo README is for ordinary users, not engineers | — |
| Pure-tooling repos (`ts-toolchain`, `skills`, `plans`) also get a bilingual README under the flat rule | Medium | "All repos" was explicit, but these have no end-user audience | Flag to @Afgan0r if any pure-internal repo should be EN-only |
| The `skills/` workspace dir is the canonical `solid-stats/skills` source (not a vendored copy) | High | Its `origin` is `solid-stats/skills`; vendored copies live in each consumer's `.agents/skills` | Check the re-sync script / `skills-lock.json` before landing |
| Centralized governance via `.github` is intentional, not a gap | High | GitHub org fallback behavior; only `.github` carries them | — |
| GSD is installed per-repo, only in repos with `.claude/gsd-core` (the code/infra projects) — not globally, not in `skills` | High | `.claude/gsd-core` present in `server-2` / `replays-fetcher` / `replay-parser-2`; absent from `skills`; no global `gsd-*` skill/command | A repo's doc quick routes through `gsd-quick` only if it has `.claude/gsd-core`; otherwise a plain edit |

## Risks
| Risk | Severity | Why It Matters | Mitigation |
|------|----------|----------------|------------|
| RU/EN profile translation drift | Medium | Two files can fall out of sync | The in-sync rule + the existing HTML-comment reminder; edit both in one change |
| Common-header insertion clobbers valuable `AGENTS.md` body | Medium | Bodies are hand-written and load-bearing | Header-only insertion above the body; never rewrite — the explicit Wave-3 choice |
| Skill edit lands in a vendored copy instead of upstream | High | Vendored copies are overwritten on sync; the fix would vanish | Edit `solid-stats/skills` source only, then re-sync; re-sync is its own quick |
| Machine-revealing paths leak into committed docs | Medium | `plans` convention forbids home dirs / hosts / IPs | Use repo-relative paths; review each diff |
| Auto-committing across 10 repos | High | Violates §C and the delivery choice | Prepare diffs, show, commit/push only on explicit instruction |

## Acceptance Criteria
- `solidstats-shared-project-standards` defines the 3-tier taxonomy, the per-tier doc matrix, and the audience-based language rule; landed upstream in `solid-stats/skills` with a `CHANGELOG.md` entry; re-synced to all consumers.
- Every Platform repo has a bilingual README (`README.md` RU + `README.en.md` EN) + `AGENTS.md` (common header) + `CLAUDE.md` stub + LICENSE + `.planning/`; `web` gets a new bilingual README.
- Every Supporting repo has a bilingual README + `AGENTS.md` (common header) + `CLAUDE.md` stub; `ts-toolchain` additionally has MIT LICENSE.
- `sg-replay-parser` README carries a deprecation banner → `replay-parser-2`; otherwise frozen.
- Org profile (RU + EN) groups Platform (5) / Supporting (`plans`, `skills`, `ts-toolchain`), keeps the legacy line, both files in sync.
- No machine-revealing paths; no per-repo duplication of centralized governance.
- Nothing committed or pushed without explicit instruction.

## Verification Plan
- Re-run the doc-matrix sweep: every required cell filled per tier.
- Per-repo diff review before any commit.
- Profile RU/EN section-parity check (same repos, same grouping, same links).
- After re-sync, confirm vendored skill copies match upstream (`skills-lock.json` / sync script).

## Open Questions
| Priority | Question | Why It Matters | Owner/Status |
|----------|----------|----------------|--------------|
| P2 | Public Solid Stats site URL (profile TODO / `stats.sg.zone` placeholder) | Profile link stays a TODO until it exists | @Afgan0r — deferred until URL exists |
| P2 | GitHub-archive `sg-replay-parser` (mark repo archived) vs README banner only | Archiving is a stronger, separate signal | @Afgan0r — banner now; archive is a separate ops action |
| P3 | Eventually license `skills` (publicly referenced)? | Reuse clarity for an externally visible repo | @Afgan0r — no for now |

## Question Ledger
| Priority | Question | Answer | Decision Impact |
|----------|----------|--------|-----------------|
| P0 | Depth of "synchronize docs" | Facts + structure + codify in `skills` | Sets the whole scope to a codified standard, not a one-off pass |
| P0 | Which repos are "all repos" | All 9 in the workspace + decide legacy | Brings in `ts-toolchain`; legacy handled explicitly |
| P0 | Source of truth on conflict | Skill-standards for rules, reality for facts | Stale skill wording gets fixed; existence facts follow reality |
| P1 | Reconcile "5-repo platform" vs 9 repos | 3-tier taxonomy | Per-tier doc minimums |
| P1 | README language line | Every repo README bilingual (user-facing); internal docs English | §H README-bilingual rule; affects every repo's README |
| P1 | How to land it | Standard first, then `gsd-quick` per repo | Ordered sequence; source of truth before edits |
| P2 | LICENSE for supporting repos | `ts-toolchain` only | One LICENSE, not three |
| P2 | `ts-toolchain` in public profile | Yes, "Supporting" | Profile table regrouped |
| P2 | `AGENTS.md` standardization depth | Common header + body | Header-only edits |

## Recommended Next Step
GSD is not the vehicle for the first step. GSD-core is installed per-repo (`.claude/gsd-core`) only in the code/infra projects; the `skills` repo has none, so its edits are plain skill authoring. So the sequence splits by tool:

- **Primary (no GSD):** author the `solidstats-shared-project-standards` edit directly in the `skills` repo — 3-tier taxonomy, per-tier doc matrix, §H audience-based language rule — with a `CHANGELOG.md` entry, RU/EN triggers intact, and (since this is a cross-stack rule) an ADR under `skills/decisions/`. Then re-sync the vendored copies. This is the source of truth everything else conforms to.
- **Rationale:** the delivery decision is "standard → per repo." The standard must exist and be synced before any repo edit, or the per-repo work drifts from it — the exact failure this initiative fixes.
- **Alternatives for framing the whole effort:**
  - A tracked planning artifact in `plans/product` (this brief, expanded) if you want one place spanning all 10 repos.
  - Stop at this decision pack and drive the edits manually.

After the standard lands and re-syncs, the per-repo applications run as a short sequence. Repos with `.claude/gsd-core` — the 5 platform services — route their doc quick through `gsd-quick` per the enforced pipeline (`web` README is the only real gap there). Repos without it — `plans` (GSD exception), `ts-toolchain` (the bulk of the supporting work), and legacy `sg-replay-parser` (banner only) — are plain edits. Then the org-profile RU/EN update, then the verification sweep.
