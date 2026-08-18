# SolidStats Plans MemPalace Index

**Updated:** 2026-08-18
**MemPalace wing:** `SolidStats`
**Status:** Discovery index, not source of truth.

This file is the short digest that gets mined into MemPalace so agents can
discover current SolidStats planning decisions before reading the full `plans`
repo. The canonical source is always the linked `plans/...` document.

## Product Decisions

<!-- markdownlint-disable MD013 -->

| Topic | Canonical file | Status | Affects | Digest |
| ------- | ---------------- | -------- | --------- | -------- |
| Release sequence and product state | `product/RELEASE-PLAN.md` | Active | all repos | Backend/API, fetcher, parser, and infrastructure are largely shipped/archived; `web` remains the main unbuilt app and future implementation work flows through each repo's GSD milestones. |
| Score and K/D presentation | `product/SCORE-DECISIONS.md` | Active | `server-2`, `web` | `sg` is the primary scope; `mace` and `sm` are all-time only. Score is the primary metric; K/D is supporting. Public score uses `adjustedScore` with `C = 12`; remove hard `is_show` leaderboard eligibility. |
| Bounty | `product/BOUNTY-DECISIONS.md` | Active | `server-2`, `web` | SG-only. Bounty measures victim quality, uses current-rotation victim adjusted score, clamps multiplier to `0..3`, awards teamkills `0`, and all-time bounty is the sum of rotation bounty rows. |
| Leaderboard UX | `product/LEADERBOARD-UX-DECISIONS.md` | Active | `web`, `server-2` | Default leaderboard is SG all-time sorted by `adjustedScore desc`; SG all-time includes current rotation live. Numeric display is rounded, sorting uses full precision, and there is no `teamkills asc` discipline sort. |
| Public flows and analytics | `product/PUBLIC-FLOWS-ANALYTICS-DECISIONS.md` | Active | `web`, `server-2`, `infrastructure`, `product` | v1 public UX is organized around evidence loops: player, squad, replay, and direct SEO entries. Replays list is in v1; bounty and commander are separate public tracks. Evidence links use replay plus timing, event anchors when available, and analytics use sanitized flow/session activation events rather than raw entity identifiers. |
| Identity, auth, and correction requests | `product/IDENTITY-AUTH-REQUESTS-DECISIONS.md` | Active | `server-2`, `web` | Replay identity is name/date based with no SteamID ownership. Discord OAuth identifies request authors and staff only. There is no public request journal, no profile claiming, and v1 request types are event correction, identity merge/split, commander result, and commander assignment. |
| Correction ledger and recalculation | `product/CORRECTION-LEDGER-RECALCULATION-DECISIONS.md` | Active | `server-2`, `web`, `replay-parser-2` | Parser evidence remains immutable. Accepted corrections become append-only semantic operations, materialize canonical state, enqueue background recalculation, and expose only a minimal public corrected marker while staff sees the full chain. |
| Vehicle assist | `product/VEHICLE-ASSIST-IDEA.md` | Idea / research gate | `replay-parser-2`, `server-2`, `web` | Do not implement until real OCAP data proves crew/passenger/seat evidence at the event frame. Vehicle assist is separate from bounty; count and value must remain separate metrics. |
| Squad weekly stats | `product/SQUAD-WEEKLY-STATS-IDEA.md` | Idea / scoped, ready to plan | `server-2`, `web` | Squad Profile gets a single-squad weekly score chart (`weeklyScore`) plus a per-week table mirroring `SquadStatsResponse` columns. Requires a `server-2` change to make `/stats/squads/:id/weekly` roster-accurate (currently sums all-time members) and add `playerCount`/`replayCount`, as an additive change to the frozen v3.0 contract. No cross-squad comparison; the squad list microchart is unaffected. |
| Self-hosted analytics | `product/WEB-ANALYTICS-SELF-HOSTED-DECISION.md` | Accepted planning decision | `infrastructure`, `web`, `product` | Use Plausible CE for traffic analytics and OpenReplay for session replay, heatmaps, rage/dead-clicks, and UX diagnostics. Start only on approved surfaces with masking/privacy controls. |

<!-- markdownlint-enable MD013 -->

## App Briefs

<!-- markdownlint-disable MD013 -->

| Repo | Canonical file | Digest |
| ------ | ---------------- | -------- |
| `replay-parser-2` | `archive/replay-parser-2/briefs/replay-parser-2.md` | Initial app brief is archived because the app exists. Active follow-up work lives in focused briefs and `replay-parser-2/TECH-DEBT.md`. |
| `replays-fetcher` | `archive/replays-fetcher/briefs/replays-fetcher.md` | Initial app brief is archived because the app exists. Active follow-up work lives in `replays-fetcher/TECH-DEBT.md`. Superseded architecture follow-up briefs are also archived. |
| `server-2` | `archive/server-2/briefs/server-2.md` | Initial app brief is archived because the app exists. Active follow-up work lives in focused briefs for depcruise and skill/convention cleanup. |
| `web` | `web/briefs/web.md` | Owns browser UI. TanStack Start/TanStack Router/Query/Table, Tailwind v4, dark-only design, public stats, Discord-authenticated request author flows, moderation, and admin screens. |
| `infrastructure` | `infrastructure/briefs/v2-backend-parity-and-full-run.md`, `infrastructure/briefs/observability-plan.md` | Owns deploy/run/ops, controlled full-run support, Grafana/Prometheus/Loki/GlitchTip observability, retention, backups, and production readiness. |

<!-- markdownlint-enable MD013 -->
