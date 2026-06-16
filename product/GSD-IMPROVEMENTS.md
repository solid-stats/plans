# Solid Stats 2 — GSD Improvements Backlog

**Last updated:** 2026-06-15

Tooling-level improvements to how the Solid Stats repos use GSD. Not product
scope — this is about getting more out of the GSD workflow that already runs in
each repo. Captured after upgrading GSD Core to `1.5.0-rc.4` (the `@next` RC
channel) across the five GSD repos and auditing per-project capability state.

GSD operational state still lives in each repo's own `.planning/`; this doc is
the cross-project to-do list for the tooling, nothing more.

**Related:** the framework-level evaluation (why we stay on GSD vs BMAD / Spec Kit /
OpenSpec / …) and the two process improvements borrowed from BMAD (plan provenance,
adversarial review lenses) live in
[`BMAD-EVALUATION-AND-GSD-IMPROVEMENTS.md`](BMAD-EVALUATION-AND-GSD-IMPROVEMENTS.md). That
doc covers *which framework* and the *review/planning process*; this one tunes the GSD
*tooling* already installed.

## Background

- All five GSD repos (`server-2`, `infrastructure`, `replay-parser-2`,
  `replays-fetcher`, `replays-fetcher-fix`) are on GSD Core `1.5.0-rc.4`.
- `1.5.0` introduced the **capability ecosystem** (ADR-857): each GSD feature is
  a capability resolved over three axes — install profile, runtime surface,
  config activation. Inspect with `capability state`, toggle with
  `capability set`.
- Commands below are repo-relative: run from the target repo root, e.g.
  `node .claude/gsd-core/bin/gsd-tools.cjs <args>`.

### Two toggle axes (do not confuse them)

- **Gates** (`--gate key=bool`) write the **project** `.planning/config.json`.
  Project-scoped, safe, reversible. Use this for everything below.
- **Enable/disable** (`--enable`/`--disable`) write the **global**
  `~/.claude/.gsd-surface.json`, shared across all repos and both machines via
  the `~/.agents` sync. Do **not** use `--disable` to cut per-repo noise — it
  would yank skills from every project. Gates only.

## Cross-cutting improvements

| # | Improvement | Why | Action (per repo) |
|---|-------------|-----|-------------------|
| C1 | **Enable MemPalace** | Installed everywhere, wired nowhere (`mempalace.enabled` unset → all hooks inert). Decision-dense repos with recurring parity traps benefit from `plan:pre` recall. Needs the MemPalace backend (see below). | `capability set mempalace --gate mempalace.enabled=true` |
| C2 | **Build the knowledge graph** | `graphify` enabled in every repo, but `.planning/graphs/` is missing in all of them — paid for, unused. | `graphify build` (between milestones) |
| C3 | **Trim UI/AI gates on headless repos** | `ui_phase`/`ui_safety_gate`/`ui_review` and `ai_integration_phase` fire on `infrastructure`, `replay-parser-2`, `replays-fetcher` — no frontend, no AI there. Pure `plan:pre`/`verify:post` overhead. Keep ON in `server-2` (freezes the OpenAPI contract for `web`) and in `web`. | `capability set ui --gate workflow.ui_phase=false --gate workflow.ui_safety_gate=false --gate workflow.ui_review=false` (+ `--gate workflow.ai_integration_phase=false` where no AI) |
| C4 | **Reconcile STATE.md frontmatter drift** | Every repo's STATE.md frontmatter contradicts its body + git (stale milestone/status/dates). Breaks `/gsd-progress`, resume, and next-milestone planning. | `/gsd-health` (commit/stash in-flight work first) |
| C5 | **Refresh the intel store** | `intel` enabled and consumed at `plan:pre`, but stale/empty where it matters (e.g. `server-2` api-map/file-roles report `exists:false, stale:true`). | `intel update` |
| C6 | **Wire graphify into the workflow** | Graphs get built (C2) but GSD never consults them — the `graphify` capability ships empty `steps`/`contributions`, so unlike `mempalace` it injects nothing at any hook. The graph stays a manual `graphify query` artifact. | Add capability `steps`/`contributions` that inject a graph query at `discuss:pre`/`plan:pre` (mirror the MemPalace recall fragment). gsd-core change, not a `--gate` (see below). |

## Per-repo notes

### server-2
- Highest decision density (v1/v2/v3 + Parity) → biggest payoff for C1/C2/C5.
- Recurring parity findings (F7/F8/F9/F12/F13/F14) are exactly the
  "problem → fix" pairs MemPalace captures. Run `/gsd-extract-learnings` on the
  shipped Parity Phase 1 and let capture mirror it.
- Consider **scoped TDD** (`--gate workflow.tdd_mode=true`) for
  statistics/recalc work only — silent numeric drift under a 100% coverage gate.
  Turn back off for unrelated phases.
- Keep `code-review` (deep) and `schema-gate` as-is — both doing real work.
- Adopt `/gsd-spec-phase` **prohibition + precision probes** for statistics
  phases: the F-findings are "must-NOT exclude" rules and rounding/tie-break
  precision — the exact cases those probes surface before planning.

### infrastructure
- Apply C3 (no frontend / no AI) and C2/C4.
- Keep `tdd` OFF — the repo's validation philosophy is live-evidence gating
  (kubectl dry-runs, real rollout state, restore-drill PASS), which already
  caught real bugs. A unit-TDD gate is weaker here.
- Keep `security` (ASVS-2, block-on-high) — well matched to an edge/TLS/backup
  repo.
- Natural home for the **MemPalace service** (see below).

### replay-parser-2
- Apply C3 (pure-core Rust, no frontend/AI) and C2/C4.
- Keep `tdd` OFF — determinism covered by golden/parity manifests + cargo-fuzz +
  coverage wired into the verifier. Only enable if a milestone touches
  parser-core semantics.
- v1.0 is 100% complete with a DEEP-BRAINSTORM decision pack already in
  `.planning/` → strong candidate for `/gsd-new-milestone`.

### replays-fetcher / replays-fetcher-fix
- Two worktrees on different branches, each with its own `.planning/config.json`
  — gates set in one do **not** apply to the other. Decide which is canonical
  for v3.0 before toggling.
- v3.0 Track C is a behavior-preserving toolchain migration with a 100% coverage
  gate → ideal for **temporary** `workflow.tdd_mode=true` to lock parity per
  refactor wave; turn off after v3.0 ships.
- Apply C3 (headless CLI ingest) and C2/C4.

## Make graphs actually used — wire graphify in (C6)

Building and naming the graph (C2) is only half the value: GSD never consults it
on its own. The `graphify` capability ships empty `steps` and `contributions` in
the registry, so unlike `mempalace` (which injects recall at `discuss:pre`/
`plan:pre` and capture at phase boundaries) it contributes nothing to any
lifecycle hook. The graph stays a query-on-demand artifact (`graphify query`,
`graph.html`, the named `GRAPH_COMMUNITIES.md`).

To make it pull weight, inject it the way GSD already injects other context:

- Add a `plan:pre` (and/or `discuss:pre`) contribution that runs a graph query
  for the phase topic and folds the result into the planner prompt — same shape
  as the MemPalace recall fragment.
- Optionally a `verify:post`/`execute:wave:post` step that refreshes the graph
  (`graphify update .`, no LLM) after code changes so it never goes stale.

This is the same lever as the skill-injection improvements in
[`BMAD-EVALUATION-AND-GSD-IMPROVEMENTS.md`](BMAD-EVALUATION-AND-GSD-IMPROVEMENTS.md):
that doc folds shared standards/learnings into GSD via `agent_skills` injection
and the `solidstats-shared-*` skills; this is the graph equivalent — make a
capability inject its artifact into the workflow instead of sitting idle. Key
difference: those are skill/config changes (no fork), whereas wiring graphify
means editing the **graphify capability descriptor** in gsd-core (the registry
is generated from descriptors, ADR-857) — a local patch or upstream PR, not a
project `--gate`. Until then, graphs stay manual.

## MemPalace: what it is and how to share it

[MemPalace](https://github.com/MemPalace/mempalace) is a local-first AI memory
system (SQLite + ChromaDB, no cloud, free) exposed as an MCP server + CLI. GSD's
`mempalace` capability does read-only recall before discuss/plan and verbatim
capture at phase boundaries, scoped to a "wing" per repo. GSD does **not** ship
the backend — it must be installed separately.

### Sharing across both machines

Principle: **centralize the server, never sync the data dir.** SQLite + ChromaDB
are single-writer; syncing the DB files (git/Syncthing/rsync) risks corruption
and conflicts.

Recommended target: one long-lived MemPalace instance on the staging VPS, both
machines as remote MCP clients over the private network (VPN / WG / SSH tunnel),
never exposed publicly. MemPalace supports SSE transport natively
(`--transport sse`); where not, `mcp-proxy` bridges stdio → SSE. One server
process = one writer = no concurrency risk; both machines see the same wings
(one per repo).

- Natural home: the `infrastructure` repo — a small Deployment + PVC for the
  data dir, backed up to S3 with the existing backup mechanism, bound to the
  private interface only, firewalled.
- Security: SSE MCP typically has no auth — bind to localhost/VPN only.
  Remember the Happ-VPN bypass `ip rule` for traffic to own VPSes.
- Quick local trial (single machine, before the VPS service): install the
  backend in an isolated venv, register the MCP server, enable the capability in
  `server-2`, verify recall produces `MEMORY-RECALL.md` at `plan:pre`. Then roll
  out.

### rc.4 caveats

- `memory_mode`: only `augment` is wired (`kg_backend`/`replace` are no-ops).
- `auto_capture_hooks`: not implemented — memory updates only at GSD phase
  boundaries, not passively mid-session.
- `cross_project_tunnels`: default off — vet what crosses wings before enabling
  (server-2 holds identity/auth decisions that need not leak into other wings).

## Version features evaluated (1.2 → 1.5)

| Feature (version) | Verdict |
|-------------------|---------|
| Research Store, cached/curated (1.4) | Already used (`workflow.research=true`) |
| Plan-vs-codebase drift guard (1.2) | Already used |
| Cross-provider effort/routing (1.2) | Already used (effort tiers + overrides) |
| RC channel `--next`/`--rc` (1.4) | Adopted (now on rc.4) |
| Capability ecosystem (1.5) | **Adopt** — per-repo tuning (C3) |
| MemPalace capability (1.5) | **Adopt** — C1 + backend |
| spec-phase prohibition/precision probes (1.5) | **Adopt** for server-2 statistics |
| `phase_id_convention=milestone-prefixed` (1.3) | Optional — multi-milestone repos; cosmetic |
| `--granularity` per-invocation (1.4) | Optional — override `fine` for trivial phases |
| `anthropic-fable` model policy (1.4.4) | Optional — if Fable 5 high-budget routing wanted |
| `--mvp` vertical slice mode (1.3) | Skip for now — only for genuinely new vertical features |

## Risks

- **Config drift across repos:** `--gate` is per-project; each repo (and each
  worktree) must be toggled separately and they will diverge.
- **Global surface footgun:** `--disable` writes the shared global surface —
  use `--gate=false` only.
- **TDD left on globally** slows unrelated phases — keep it scoped and temporary.
- **graphify/intel runs are heavy** on large mature repos — run between
  milestones, not mid-execution.
- **`/gsd-health` may rewrite STATE.md** — commit/stash in-flight work first.
- **Config gate writes can revert in the working tree.** Setting gates via
  `capability set --gate` / `config-set` can be reverted by a later gsd-tools or
  agent invocation (observed on `config.json` this rollout). Persist by editing
  `.planning/config.json` directly and committing atomically (the committed
  state is authoritative; verify with `git show HEAD:.planning/config.json`).

## Status

- [x] C1 MemPalace enabled — **done for all four GSD repos** (`server-2`,
  `infrastructure`, `replay-parser-2`, `replays-fetcher`): `mempalace.enabled=true`,
  7/7 hooks active, each wing seeded from `.planning/` and recall verified.
  Note: the `replays-fetcher-fix` worktree has its own `.planning/config.json`
  and is **not** enabled — decide which worktree is canonical first.
- [x] C2 knowledge graph built per repo — **code-only graphs** in all 4 repos
  (`graphify` needs the external `graphifyy` backend, installed via pipx;
  legitimacy verified — "SUS" was a false positive from the deliberate
  `graphify`→`graphifyy` PyPI name reclaim). Communities **named without an LLM
  key** (self-named by reading member symbols): server-2 88, replays-fetcher 47,
  infrastructure 22, replay-parser-2 14 (parser-core only — `merge-graphs` hit a
  networkx bug; whole-`crates` extract blocked by a README under tests/fixtures).
  Names live in `.planning/graphs/` (`.graphify_labels.json`, `graph.json`
  `community_names`, named `graph.html`, `GRAPH_COMMUNITIES.md`). Caveat: docs
  excluded (code-only); a full semantic graph needs an LLM backend key.
  `graphify-out/` gitignored per repo.
- [x] C3 UI/AI gates trimmed — `infrastructure`, `replay-parser-2`,
  `replays-fetcher`: `workflow.ui_phase/ui_review/ui_safety_gate/ai_integration_phase=false`
  (project-scoped, committed). `server-2` (frozen OpenAPI for `web`) and `web`
  keep them on.
- [ ] C4 STATE.md frontmatter reconciled
- [x] C5 intel store built — `file-roles`/`api-map`/`dependency-graph`/
  `arch-decisions`/`stack` written in all 4 repos via the `gsd-intel-updater`
  agent (server-2 api-map derived from the frozen OpenAPI 1.0.0). server-2
  landed via PR (master protected).
- [ ] C6 graphify wired into the workflow — inject a graph query at
  `discuss:pre`/`plan:pre` via capability `steps`/`contributions` (needs a
  gsd-core descriptor patch, ADR-857; see the C6 section). Related to the
  injection lever in `BMAD-EVALUATION-AND-GSD-IMPROVEMENTS.md`.
- [x] MemPalace backend — installed in an isolated venv, MCP server registered
  at user scope (Claude reports Connected), all 4 wings seeded from `.planning/`;
  semantic recall verified. **VPS sharing: descoped (won't do)** — MemPalace
  stays single-machine for now (local stdio server on this machine).
