`plans` is the central planning repository for Solid Stats — cross-project strategy (`product/`) and the per-application briefs (`<repo>/briefs/`); documentation, not code.

It owns ONLY shared planning artifacts. It does NOT hold any application's operational GSD state — each app's `.planning/` (PROJECT/REQUIREMENTS/ROADMAP/STATE, phases, milestones, research) stays inside that app's own repo, and plans is not a GSD project itself. It contains no code, build, or deploy concerns.

Shared, cross-repo standards live in the `skills` repo (solid-stats/skills, see `solidstats-shared-project-standards`); this file adds only what is specific to plans.

---

# AGENTS instructions

## What this repository is

`plans` is the central home for **product-level and strategic planning** of the
Solid Stats product. It holds cross-project plans and the per-application
**milestone/app briefs**. It is documentation, not code.

Solid Stats is a multi-project product (each is its own git repository under
`~/Projects/SolidGames`):

- `replay-parser-2` — Rust OCAP parser.
- `replays-fetcher` — replay discovery + raw S3 staging.
- `server-2` — PostgreSQL source of truth, APIs, identity, moderation, jobs.
- `web` — browser UI.
- `infrastructure` — deploy/run/ops.

## Boundary: what lives here vs. in each repo

- **Here (`plans`):** cross-project strategy (`product/`) and each app's briefs
  (`<repo>/briefs/`).
- **NOT here:** the per-repo GSD operational state. Each project keeps its own
  `.planning/` (PROJECT/REQUIREMENTS/ROADMAP/STATE, phases, milestones,
  research, etc.) **inside that project repo**. GSD commands read and write
  `.planning/` relative to the project root, so it must stay there.

This repository is **not a GSD project** — it has no `.planning/` of its own.

## Structure

```
product/            cross-project docs (release plan, cutover review, …)
<repo>/briefs/      that repo's app brief + milestone briefs
```

- `<repo>/briefs/<repo>.md` — the app brief (one canonical copy per app).
- `<repo>/briefs/<milestone>.md` — milestone briefs, distinct per repo.

## Conventions

- **One canonical copy.** An app brief lives once, under its own app's
  `briefs/`. Do not scatter copies into sibling repos — that is exactly the
  drift this repo consolidated. Earlier per-repo copies were stale (superseded
  04-2026 snapshots); the authoritative versions are here.
- **No machine-revealing paths.** Never put absolute paths that contain a
  username or home dir (e.g. `/home/<user>/...`), hostnames, or IPs into any
  committed file. To point at another brief or a repo file, name the repo plus
  the path within it (e.g. the `infrastructure` repo's `docs/staging.md`, or a
  repo-relative `infrastructure/docs/staging.md`). Within `plans`, link
  relatively (e.g. `product/RELEASE-PLAN.md`).
- **New briefs** go in `<repo>/briefs/`. New cross-project plans go in
  `product/`.
- A brief's `Intended command` should reference the brief in the `plans` repo
  without an absolute path — e.g. from a sibling repo,
  `--auto @../plans/<repo>/briefs/<file>.md`.

## Working in the product repos

When planning or executing in a project repo, that repo's `gsd-briefs/` now
contains only a pointer; read the real briefs here and that repo's own
`.planning/` for operational state.
