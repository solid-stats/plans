# Solid Stats — plans

Central home for **product-level and strategic planning** of the Solid Stats
product. Cross-project plans and per-application briefs live here. Day-to-day
GSD operational state stays inside each project repo's own `.planning/`.

> Project development uses only AI agents plus the GSD workflow.

## Layout

| Path | Contents |
|------|----------|
| `product/` | Cross-project plans: [RELEASE-PLAN.md](product/RELEASE-PLAN.md), [V2-CUTOVER-REVIEW.md](product/V2-CUTOVER-REVIEW.md) |
| `replay-parser-2/briefs/` | Parser app brief + milestone briefs |
| `replays-fetcher/briefs/` | Fetcher app brief + milestone briefs |
| `server-2/briefs/` | Backend app brief + milestone briefs |
| `web/briefs/` | Web app brief + milestone briefs |
| `infrastructure/briefs/` | Infrastructure milestone briefs |

## What is NOT here

Each project repository keeps its own GSD operational planning in its local
`.planning/` directory (PROJECT / REQUIREMENTS / ROADMAP / STATE, phases,
milestones, research). GSD reads and writes those relative to the project root,
so they must stay in the project repos. This repository is not a GSD project.

## Start here

- [product/RELEASE-PLAN.md](product/RELEASE-PLAN.md) — how Solid Stats 2 reaches
  release (two converging tracks).
- See [AGENTS.md](AGENTS.md) for conventions when adding or editing plans.
