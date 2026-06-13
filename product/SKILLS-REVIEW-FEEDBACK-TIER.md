# Product Brief — SolidStats Review-Feedback Learning Tier (Backlog Item)

## Context
- Date: 2026-06-13
- Status: backlog proposal for the **skills family**, not consumer-repo code. Surfaced
  as a night extra in `skills/decisions/research/RECOMMENDATION.md` ("review-feedback loop
  proposal — the missing estesis-style learning tier — size M, CAPTURE-first
  recommendation. Backlog.") and migration step 5.
- Source draft: `skills/decisions/research/drafts/review-feedback-loop-proposal.md`.
- Artifact owner: Pavlov Alexandr.

The solidstats reviewers emit AI reviews; a human then edits each one — trims false
positives, fixes severities, adds findings the AI missed — or leaves remarks in a
GitHub PR. Today that correction is lost. Nothing captures it, nothing normalizes it,
nothing feeds repeated patterns back into the reviewer that produced the bad call. The
estesis family already closes this loop (`estesis-process-review-feedback`); the
solidstats family has no equivalent tier. The fork is: leave the reviewers static, or
add a learning tier that turns human corrections into rule changes.

## Decision
Add one target-agnostic process skill, **`solidstats-process-review-feedback`**, that
wraps the four solidstats reviewers and the shared review standard. It captures a
reviewed-then-corrected review, normalizes it into a per-skill journal, and — once a
pattern repeats three times — proposes a routed patch to the target reviewer's SKILL.md
or to the shared standards. Two modes carry over unchanged from estesis: **CAPTURE**
(run per review, by any developer) and **PROMOTE** (run in batch, by a maintainer).

Naming follows skills-repo AGENTS.md: a cross-cutting skill with no stack target uses
`solidstats-process-<purpose>` — target-agnostic because it routes corrections to
whichever reviewer emitted the review, so it carries no stack segment. The `review-feedback`
slug mirrors the estesis slug to preserve discoverability. It is a process/meta tool:
run by a maintainer, read by no other skill, never a hard-require target.

Reviewers it wraps and the layers corrections route into:

| Reviewer skill (`/home/afgan0r/Projects/SolidGames/skills/`) | Conventions layer | Standards layer |
|---|---|---|
| `solidstats-server-ts-code-review` | `solidstats-server-ts-conventions` | `solidstats-shared-backend-ts-standards`, `solidstats-shared-ts-standards` |
| `solidstats-fetcher-ts-code-review` | `solidstats-fetcher-ts-conventions` | `solidstats-shared-backend-ts-standards`, `solidstats-shared-ts-standards` |
| `solidstats-parser-rust-code-review` | `solidstats-parser-rust-conventions` | `solidstats-shared-review-standards` |
| `solidstats-frontend-react-code-review` | `solidstats-frontend-react-conventions` | `solidstats-shared-ts-standards` |

**Recommendation: CAPTURE-first.** Ship the CAPTURE mode and the journal in the first
iteration; defer PROMOTE automation and evals until a real corrections corpus exists —
run CAPTURE for 3–5 reviews before authoring PROMOTE.

## Rationale
The estesis original is the template; adaptation is substitution, not invention. The
parts that transfer as-is carry the design:

- **CAPTURE / PROMOTE split** — any developer captures per review; a maintainer promotes
  in batch.
- **Rule-of-three gate** — one reviewer deletion may be noise; three instances across
  independent reviews warrant a rule change.
- **Journal format** — `corrections-log.md` + `regression-evals.jsonl` per target skill,
  in a git repo separate from the skills repo.
- **Four signal types** — false-positive (invalid vs. noise distinction), miss,
  severity-calibration, note/rationale.
- **Code-binding priority order** — inline hunk > HEAD best-effort > `needs-code-context`.
- **Two eval tiers** — regression JSONL grows from captures; core `evals/evals.json`
  graduates manually at PROMOTE.
- **Read-only toward target skills** — PROMOTE proposes diffs; the user applies. This
  matches the family's read-only review default and the existing PROMOTE-proposes /
  user-applies contract.
- **Soft nudge at end of CAPTURE** — print open-count and clusters-at-threshold.

The only meaningful new work is the forge swap and the routing table — which is why the
estimate is **M** and why CAPTURE-first is safe: it reuses estesis workflow files almost
verbatim and defers the parts that need data.

What must change for solidstats:

- **Forge: GitHub, not GitLab.** The README install path is `npx skills add
  solid-stats/skills` and all four solidstats repos are on GitHub. Every "GitLab MR" /
  `*-mr.html` reference becomes a **GitHub PR**: the adapter reads a saved PR-review HTML
  or a `gh pr view --comments` dump, and inline-comment hunks come from GitHub's unified
  diff format. `references/adapters.md` updated accordingly.
- **Four reviewers**, including the fetcher pair, per the table above.
- **Routing decision tree.** Format / severity-scale / verdict contradictions →
  `solidstats-shared-review-standards`. TS idioms shared by ≥2 TS repos →
  `solidstats-shared-ts-standards` (service-side only → `solidstats-shared-backend-ts-standards`).
  Async safety / config / SOLID / observability for TS services →
  `solidstats-shared-backend-ts-standards`. Otherwise → the per-stack CONVENTIONS skill of
  the originating reviewer (backend-ts, fetcher-ts, parser-rust, or frontend-react).
  Tie-break: when unsure between the process layer and per-stack, prefer the process layer
  — it propagates to more reviewers per PROMOTE.
- **Env-var names** — `SOLIDSTATS_REVIEW_CORRECTIONS` / `SOLIDSTATS_REVIEW_CORRECTIONS_URL`,
  mirroring the estesis env-var convention.

Rejected alternatives for journal storage:

- **Inside the skills repo** (`/corrections/<skill>/`) — zero extra repo, but corrections
  land in the same tree as skill source, complicating `npx skills update` and mixing raw
  gitignored inputs with shipped skill content.
- **Per-consumer repo** (e.g. inside `server-2`) — corrections live close to the code
  reviewed, but the journal fragments across four repos, PROMOTE must aggregate them, and a
  developer reviewing fetcher code needs separate access to the fetcher repo's journal.

Chosen: a **dedicated repo** (`solidstats-review-corrections`, separate from the skills
repo), resolving its path via the env vars above. It is the exact estesis pattern: it
survives `npx skills update` wipes, lets any developer push corrections without a
skills-repo checkout, and keeps the raw inbox separate from the versioned journal.

## Consequences
- A new dedicated repo `solidstats-review-corrections` to create, plus two env vars to set
  in developer/CI environments.
- First-iteration scope: copy estesis `workflows/capture.md`, `workflows/promote.md`,
  `references/adapters.md`, `references/journal-schema.md`, `templates/correction-entry.md`;
  replace GitLab adapter logic with the GitHub PR adapter; update the routing table and
  target-skill list for the four reviewers; update the env-var names; write SKILL.md
  frontmatter with RU + EN triggers.
- Deferred until a corpus exists: evals, PROMOTE automation, graduation to core evals.
- The skill becomes the family's mechanism for turning reviewer false-positives, misses,
  and severity drift into versioned rule changes — closing a loop the taxonomy currently
  leaves open. It does not change any reviewer's behavior until PROMOTE is authored and a
  human applies a proposed diff.

## Sources
- `skills/decisions/research/drafts/review-feedback-loop-proposal.md` — full proposal:
  skill name/rationale, what transfers as-is, the GitHub forge swap, the four-reviewer
  routing table and decision tree, journal-storage trade-offs, the M estimate and
  first-iteration scope.
- `skills/decisions/research/RECOMMENDATION.md` — backlog framing (night extras;
  migration step 5: "estesis-style review-feedback learning loop for the family"),
  size M / CAPTURE-first.
- `plans/product/TS-TOOLCHAIN-CONVERGENCE.md` — product-doc format/tone reference.
- Reviewer + standards skills wrapped (all present in the skills repo working tree):
  `skills/solidstats-server-ts-code-review`, `skills/solidstats-fetcher-ts-code-review`,
  `skills/solidstats-parser-rust-code-review`, `skills/solidstats-frontend-react-code-review`,
  `skills/solidstats-shared-review-standards`, `skills/solidstats-shared-ts-standards`,
  `skills/solidstats-shared-backend-ts-standards`.
