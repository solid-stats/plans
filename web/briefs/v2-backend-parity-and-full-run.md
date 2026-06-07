# web v2 Milestone Brief: Wait for Trusted Backend, Then Build Public Stats

**Created:** 2026-05-12
**Intended command:** `$gsd-new-milestone --auto @/home/afgan0r/Projects/SolidGames/plans/web/briefs/v2-backend-parity-and-full-run.md` only after backend parity contracts stabilize
**Application:** `web`
**Primary role:** downstream consumer

## Cross-App Briefs

Read these sibling briefs before drafting the milestone:

- `/home/afgan0r/Projects/SolidGames/plans/server-2/briefs/v2-backend-parity-and-full-run.md`
- `/home/afgan0r/Projects/SolidGames/plans/replays-fetcher/briefs/v2-backend-parity-and-full-run.md`
- `/home/afgan0r/Projects/SolidGames/plans/replay-parser-2/briefs/v2-backend-parity-and-full-run.md`
- `/home/afgan0r/Projects/SolidGames/plans/infrastructure/briefs/v2-backend-parity-and-full-run.md`

## Global Sequence

1. `server-2`: prove public statistics semantics, export, recalculation, and API shape.
2. `replays-fetcher`: make the full corpus available reliably.
3. `infrastructure`: run the full corpus and old-vs-new diff gate.
4. `web`: build the user experience on top of trusted backend data.

`web` should not be the first implementation milestone. It can prepare product requirements and API expectations, but UI delivery should wait until backend parity and public API shape are stable enough.

## Goal

Build the public Solid Stats experience after backend data is trustworthy and the API contract is stable.

The immediate next step for `web` is not a full UI implementation. It is to consume the backend parity outcome and turn it into a web milestone that does not fight changing data shapes.

## Source Evidence

- `/home/afgan0r/Projects/SolidGames/plans/web/briefs/web.md`
- `/home/afgan0r/Projects/SolidGames/plans/server-2/briefs/v2-backend-parity-and-full-run.md`
- `/home/afgan0r/Projects/SolidGames/server-2/openapi/server-2.openapi.json`
- `/home/afgan0r/Projects/SolidGames/server-2/docs/api-compatibility.md`
- `/home/afgan0r/Projects/SolidGames/infrastructure/docs/diff-readiness.md`

## Required Decisions Already Made

- Public stats must be built on `server-2`, not raw parser output and not `replays-fetcher`.
- The first backend parity gate includes legacy detail surfaces, not only narrow leaderboards.
- `web` should consume generated API types from the `server-2` OpenAPI schema.
- Public stats are anonymous; request submission and moderation flows require Steam/auth roles through `server-2`.
- The UI should prioritize dense, trustworthy stats workflows over marketing presentation.

## Backend Contracts Needed Before UI Implementation

`web` should wait for these to stabilize:

- Player global stats and rotation-scoped stats.
- Squad stats.
- Player detail stats: relationships, weapons, weekly buckets, and visible identity.
- Rotations and filters.
- Leaderboards and overview.
- Data freshness or recalculation status, at least enough to show stale/recalculating states honestly.
- OpenAPI-generated types for public stat endpoints.

If `server-2` keeps a legacy export separate from the long-term public API, the web milestone must explicitly decide which data comes from product API endpoints and which legacy export fields should become first-class product API fields.

## Suggested Web Milestone Phases

### Phase 1: Contract Intake and UI Scope

Goal: translate backend parity outputs into web requirements.

Acceptance criteria:

- Read `server-2` final public API/OpenAPI output and parity export notes.
- Decide launch public pages from the stable contract: player list, player profile, squad list, squad profile, rotations, overview, and leaderboards.
- Decide whether weapons, weekly buckets, and relationship details are launch-blocking or staged behind a later page slice.
- Define loading, empty, stale, recalculating, and error states from backend status surfaces.

### Phase 2: Public Stats MVP

Goal: build the first user-visible public stats path on stable backend data.

Acceptance criteria:

- Generate API types from `server-2` OpenAPI.
- Build list/detail navigation with preserved filters, sorting, pagination, scroll restoration, and back navigation.
- Support RU/EN and dark/light themes from the start.
- Keep pages data-dense, accessible, and fast.

### Phase 3: Trust and Correction Entry Points

Goal: connect public stats to correction workflows without overbuilding moderation first.

Acceptance criteria:

- Show enough data provenance/freshness information to avoid misleading users during recalculation or partial runs.
- Add login-aware correction/request entry points where backend supports them.
- Keep moderation/admin screens behind role-aware navigation and stable backend endpoints.

## Dependencies On Other Apps

- Depends on `server-2` public API, OpenAPI, and parity evidence.
- Does not depend directly on `replays-fetcher` or `replay-parser-2`.
- Depends on `infrastructure` only for deployed staging availability and, later, web runtime wiring.

## Non-Goals

- Do not implement public stats screens against unstable or provisional backend data.
- Do not read legacy `sg_stats` directly from the browser.
- Do not call parser or fetcher services directly.
- Do not use parser artifacts as web API payloads.

## Recommended Next Command

Do not start the full web implementation milestone before the `server-2` parity contract is accepted. If a web milestone is needed earlier, scope it to contract intake and UI planning only.
