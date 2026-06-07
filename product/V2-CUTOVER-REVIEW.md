# SolidStats backend (server-2) — Finish & Freeze v1 plan

**Date:** 2026-05-31
**Goal:** finish the `server-2` public API and freeze its OpenAPI contract so the `web` frontend (which generates its client from that OpenAPI) can be built against it.
**Context:** SolidGames is a grouping of separate projects forming the SolidStats product (not a monorepo). v2 is a deliberate redesign, verified against legacy. `replay-parser-2` is DONE/verified. `server-2` is high-quality code (no prod stubs, ~197 unit tests green, OpenAPI no drift) but its **public contract is scope-incomplete** vs the `web` brief.

## Locked v1 decisions (2026-05-31)
- **Replay surface** (list + detail + event timeline) → **in v1**.
- **Parity stats** (weapons, vehicles, player-vs-player relationships, weekly buckets, KD/score/games — today only in the `legacy-public-export.ts` CLI) → **promote to public routes**.
- **Request model** (current 4 types vs brief's 5 flows) → **hybrid, discussed separately**; contract NOT frozen until resolved.

## Resolved forks (2026-05-31)
- **Pagination:** → **cursor + server-side sort** on all list endpoints (replaces `page/pageSize`).
- **Realtime/SSE:** → **deferred past v1** (static + manual/poll refresh first).
- **SteamID masking:** → **server-side only**; the API must never return full SteamIDs to web (mask to last-4 or equivalent at the API layer).
- **URLs:** web uses slug-only player/squad URLs; endpoints are UUID-only → need **slug→id resolution** (added endpoint or slug-addressable routes).

---

## Work to finish the backend (prioritized)

### A. Promote parity stats to public routes  *(decision: add to public methods)*
- Player profile: add weapons, vehicles, player-vs-player relationships, weekly buckets, KD/score/totalGames — expand `/stats/players/:id` and/or sub-resources (`/stats/players/:id/weapons|vehicles|relationships|weekly`).
- Squad profile: same parity surfaces.
- Wire `repository/legacy-export.ts` SQL into the public read model + TypeBox response schemas + OpenAPI + tests.

### B. Replay surface  *(decision: v1)*  — largest single piece
- `GET /stats/replays` — list with filters (rotation/date/map) + cursor pagination.
- `GET /stats/replays/:id` — summary (map, rotation, date, sides, participants, provenance).
- `GET /stats/replays/:id/events` — progressive/paged event timeline.
- Sitemap support (enumerate all replay IDs) for SEO.
- Schemas + tests + OpenAPI for each.

### C. Profile history timelines
- Nickname/alias history with timestamps.
- Squad membership history (dated) on both player and squad profiles.
- Moderator endpoint to manually fill commander-side winner for legacy unknown outcomes.

### D. Contract scale & ergonomics
- Cursor pagination + server-side sort on players/squads/bounty/replays.
- slug→id resolution.
- Bounty formula component breakdown (victim + squad effectiveness) on bounty/leaderboard responses.
- provenance / last-updated metadata on stat responses.
- Admin rotation CRUD; per-rotation detail endpoint; commander-side per-side filter param.

### E. Request model  *(HYBRID — separate /gsd:discuss-phase, do not freeze yet)*
- Reconcile current 4 types (`identity_correction, merge_split, stats_correction, steam_link`) with brief's 5 flows (add/remove kills, add/remove teamkills, remove-player-from-replay, commander dispute).
- Drafts API (autosave, 7-day TTL), reopen transition, attachment presign/MIME/link support.

### F. Realtime  *(recommend defer)*
- SSE freshness stream — post-v1 unless confirmed otherwise.

### G. Freeze the contract  *(last, gates web client generation)*
- Bump OpenAPI `info.version` `0.1.0` → stable tag (e.g. `1.0.0`); publish the artifact path web points `openapi-typescript` at.
- Wire `test:integration` (Postgres-backed read paths, currently excluded) into CI as a freeze gate.
- Document the contract freeze + change policy.

---

## Sequencing
A, B, C, D can run largely in parallel. E proceeds as a separate discussion in parallel (blocks only the request/moderation slice of the freeze). F deferred. G is the closing gate once A–D land and E is resolved.

Fast-unblock option: freeze the **stable read-stats subset (A + C + D)** first so web can start stats screens, while B (replays) and E (requests) land next, then full freeze (G).

## Wider context (not in this milestone, tracked for later)
The `replays-fetcher` has real Cloudflare-safety regressions (unpaced byte downloads, no pre-fetch dedup, no ban-page detection) and there is no production env / monitoring / validated backups / rollback. These are production-cutover concerns, separate from finishing the backend. Revisit before going live.

## Recommended next step
In the **`server-2`** repo: `/gsd:new-milestone` — "Public API v1: complete & freeze contract for web" (scope = A, B, C, D, G). Run a separate `/gsd:discuss-phase` for the request model (E).
