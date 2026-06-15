# Solid Stats 2 — GSD Improvements Backlog

**Last updated:** 2026-06-15

Tooling-level improvements to how the Solid Stats repos use GSD. Not product
scope — this is about getting more out of the GSD workflow that already runs in
each repo. Captured after upgrading GSD Core to `1.5.0-rc.4` (the `@next` RC
channel) across the five GSD repos and auditing per-project capability state.

GSD operational state still lives in each repo's own `.planning/`; this doc is
the cross-project to-do list for the tooling, nothing more.

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

## Status

- [ ] C1 MemPalace enabled (blocked on backend install)
- [ ] C2 knowledge graph built per repo
- [ ] C3 UI/AI gates trimmed on headless repos
- [ ] C4 STATE.md frontmatter reconciled
- [ ] C5 intel refreshed
- [ ] MemPalace backend deployed (trial: local; target: VPS service in `infrastructure`)
