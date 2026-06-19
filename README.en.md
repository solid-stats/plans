# plans

[Русский](README.md) · **English**

Central home for the product-level and strategic planning of **Solid Stats** —
the game statistics of the [Solid Games](https://sg.zone) community (ArmA 3).
Cross-project plans and the per-application briefs (app briefs) live here. It is
documentation, not code.

Part of a multi-repo platform: the backend and source of truth is `server-2`,
raw replay discovery is `replays-fetcher`, OCAP parsing is `replay-parser-2`,
the web interface is `web`, and runtime and operations are `infrastructure`.
plans is the shared strategy layer above them.

> Solid Stats is built end to end by AI agents following the
> [GSD](https://github.com/open-gsd/gsd-core) workflow. Development outside GSD
> is outside the process.

## Layout

| Path | Contents |
|------|----------|
| `product/` | Cross-project plans. Entry point: [RELEASE-PLAN.md](product/RELEASE-PLAN.md) |
| `<repo>/briefs/` | Each application's app brief and milestone briefs |
| `archive/` | Superseded docs, kept for provenance ([archive/README.md](archive/README.md)) |

## What is NOT here

Each application's operational GSD planning (PROJECT · REQUIREMENTS · ROADMAP ·
STATE, phases, milestones, research) lives in its own `.planning/` directory
inside that application's repository: GSD reads and writes it relative to the
project root. plans itself is not a GSD project and has no `.planning/` of its
own.

## Start here

- [product/RELEASE-PLAN.md](product/RELEASE-PLAN.md) — how Solid Stats 2 reaches
  release (two converging tracks).
- [AGENTS.md](AGENTS.md) — conventions for adding or editing plans.

## License — MIT
