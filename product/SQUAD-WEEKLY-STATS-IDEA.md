# Idea: squad weekly stats (Squad Profile)

**Date:** 2026-08-18
**Status:** Idea / scoped, ready to plan
**Scope:** `server-2`, `web`

## Context

The `web` v1 Squad Profile page currently plans squad identity, membership
history timeline, rotation-scoped stats, and roster. No weekly time-series
view exists in that scope yet.

`server-2` already exposes `GET /stats/players/:id/weekly` and
`GET /stats/squads/:id/weekly`. Both are a parity carryover from the legacy
Solid Stats site's export format: "weekly buckets" were part of the legacy
player/squad export (`v2.0` phase 12, `legacy-public-export-contract`), then
exposed through the new public API (`v3.0` phase 15,
`profile-parity-stats`). Per-week stats already existed on the old site;
this idea restores and extends that for squads specifically, with a chart
plus a table on Squad Profile.

`server-2` milestone `v3.0` finished with status "Public API v1 — complete &
freeze contract for web." The current `/weekly` endpoint contract is frozen,
so extending it needs to be additive (new field or parameter), not a
breaking change to existing semantics.

## Goal

On the squad detail page (Squad Profile, where the current roster is
already shown), let visitors see how a single squad's activity and
performance evolved week by week: a score trend chart plus a supporting
data table. This does not introduce cross-squad comparison; comparison
stays deferred to v2 per `web/briefs/web.md`'s stated non-goals.

## Product Semantics

- Scope: Squad Profile only. The squad list/leaderboard page keeps its own,
  separate microchart per row; it is unaffected by this idea.
- One squad at a time. No multi-squad overlay/comparison chart — that would
  conflict with the explicit v1 non-goal "Player/squad/rotation comparison
  views; comparison is v2" in `web/briefs/web.md`.
- Week = ISO calendar week (Monday start), matching the existing
  `date_trunc('week', replay_timestamp)` bucketing already used by
  `/weekly`.
- Weekly stats must reflect the squad's actual roster during that specific
  week (roster-accurate), not a sum over everyone who was ever a member.
  This is a deliberate product decision, chosen over the cheaper "sum over
  all-time members" behavior the endpoint currently has.

## Chart

- Single line: `weeklyScore = round((kills - teamkills) / totalPlayedGames)`
  per week, the existing parity formula already used by `/weekly`. This is
  a different formula from the leaderboard's primary `adjustedScore`
  (sample-size-adjusted, `C = 12`); a per-week `adjustedScore` is not
  meaningful without season-level context, so the chart intentionally does
  not reuse it.
- A full chart (not a small sparkline/microchart) is acceptable on this
  page specifically. It is a deliberate, narrow exception to the
  "microcharts over large dashboard charts" v1 design direction in
  `web/briefs/web.md`, scoped to Squad Profile only.

## Table

- One row per week, directly alongside the chart.
- Columns mirror `SquadStatsResponse` (the squad list/leaderboard column
  set), computed per week instead of all-time/rotation: `kills`,
  `deaths.total`, `deaths.byTeamkills`, `kdRatio`, `teamkills`,
  `totalPlayedGames`, `totalScore`, `playerCount`, `replayCount`.

## Current Evidence

- `server-2` schemas: `PlayerWeekBucket` / `SquadWeeklyResponse`
  (`src/modules/public-stats/routes/schemas.ts`); route
  `GET /stats/squads/:id/weekly` (`src/modules/public-stats/routes/routes.ts`);
  repository `getSquadWeekly` (`src/modules/public-stats/repository.ts`).
- Week bucketing SQL: `weeksSql` in
  `src/modules/statistics/repository/parity-sql.ts` — uses
  `date_trunc('week', replay.replay_timestamp)` with an ISO `IYYY-IW` label.
- Score formulas live in `src/modules/statistics/parity-formulas.ts`:
  `weeklyScore(kills, teamkills, totalPlayedGames)` versus
  `totalScore(kills, teamkills)` (used on the squad list) versus the
  leaderboard's `adjustedScore` (see `product/SCORE-DECISIONS.md`). Three
  distinct, non-interchangeable score definitions already exist in the
  product; this idea intentionally uses `weeklyScore` for the chart and the
  `totalScore`-shaped field for the per-week table's Score column, not
  `adjustedScore`.
- Current squad-scoped aggregation (`listSquadPlayers` in `repository.ts`)
  sums over every player who has ever had a `squad_memberships` row for the
  squad, with no `valid_from`/`valid_to` filtering — the same accepted
  pattern already used for the squad weapons/relationships surfaces
  (documented in `schemas.ts` as "member-level aggregation... not
  byte-identical to a legacy squad-level formula"). This idea deliberately
  departs from that pattern for the weekly view.
- `web` has no existing code referencing any `/weekly` endpoint (`src`,
  `.visual-prototypes`) — this is greenfield frontend work.
- `server-2` milestone `v3.0` (`.planning/STATE.md`) finished with the
  public API contract marked frozen for `web`.

## Implementation Path

1. `server-2`
   - Extend squad-weekly aggregation to be roster-accurate: for each week
     bucket, include a player's stats only where their `squad_memberships`
     interval (`valid_from`/`valid_to`) overlaps that week. Existing
     membership data already supports this without new raw SQL — it can be
     a filter added in the aggregation layer next to `getSquadWeekly`,
     using data already fetched via `listSquadPlayers`.
   - Extend the weekly response shape to add `playerCount` (distinct
     roster members active that week) and `replayCount` (distinct replays
     that week) so the table can mirror `SquadStatsResponse` columns.
     `PlayerWeekBucket` currently has neither.
   - Treat this as additive to the frozen `v3.0` contract: a new response
     shape or parameter, not a silent change to the existing
     `/stats/squads/:id/weekly` semantics that any consumer might already
     rely on.
   - Regenerate the OpenAPI schema once the contract shape is settled.

2. `web`
   - Add a weekly section to Squad Profile: a full-size line chart
     (`weeklyScore` only) plus a per-week data table with columns matching
     `SquadStatsResponse`.
   - The squad list/leaderboard page is out of scope for this idea; its
     existing/planned per-row microchart is untouched.

## Risks

<!-- markdownlint-disable MD013 -->

| Risk | Severity | Why It Matters | Mitigation |
| ------ | ---------- | ----------------- | ------------ |
| Extending a "frozen" v3.0 contract | Medium | `server-2`'s public API was explicitly marked complete/frozen for `web` | Ship as an additive change (new field/parameter), not a breaking edit to existing `/weekly` semantics |
| Long-lived squads produce very long tables/charts | Low-Medium | No default time range was decided | Left as an execution detail for the `web` phase; needs a default window or pagination before UI work starts |
| Three distinct "score" formulas in the product (`adjustedScore`, `totalScore`, `weeklyScore`) | Low | Risk of user confusion across pages if not labeled clearly | Label the weekly chart/table score explicitly (for example via tooltip) as distinct from the leaderboard Score |

<!-- markdownlint-enable MD013 -->

## Acceptance Criteria

- Squad Profile shows a single-squad weekly score chart and a matching
  weekly data table; no cross-squad comparison view is introduced.
- Weekly stats reflect roster membership for that specific week, verified
  against a squad with at least one mid-history roster change (a member
  joining or leaving between two weeks with games played).
- Weekly table columns match `SquadStatsResponse` field names and
  semantics (`kills`, `deaths`, `kdRatio`, `teamkills`, `totalPlayedGames`,
  `totalScore`, `playerCount`, `replayCount`).
- The `server-2` API change is additive; existing consumers of
  `/stats/squads/:id/weekly` and `/stats/players/:id/weekly`, if any exist
  by then, are not broken.
- Squad list/leaderboard microchart behavior is unchanged.

## Open Questions

<!-- markdownlint-disable MD013 -->

| Priority | Question | Why It Matters | Owner/Status |
| ---------- | ---------- | ------------------ | -------------- |
| P2 | Default time range for the chart/table on long-lived squads — full history, last N weeks, or user-adjustable? | Affects UI complexity and query cost for old squads | Deferred to the `web` implementation phase |
| P2 | Exact API shape for the roster-accurate weekly endpoint (new query parameter on the existing route vs. a new route) | Contract-freeze hygiene | Deferred to the `server-2` implementation phase |

<!-- markdownlint-enable MD013 -->

## Recommended Next GSD Step

Primary: open a `server-2` phase to extend squad-weekly aggregation with
roster-accurate membership filtering and the additional
`playerCount`/`replayCount` fields, as an additive change to the frozen
`v3.0` API contract.

Follow-up: once the extended endpoint ships and its OpenAPI schema is
regenerated, plan the `web` Squad Profile phase to consume it (chart plus
table).
