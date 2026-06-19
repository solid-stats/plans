# Deep Brainstorm Brief — Community-Site Scraper, Rotation Sides, Player Forum Rating

## Context
- **Date:** 2026-06-17
- **Request:** Two new capabilities, both feeding off the public SolidGames community site (`sg-zone`, the same source `replays-fetcher` already crawls):
  1. **Rotation sides (стороны).** A rotation has *sides* that are valid for a time window. Squads (and, transitively, their players) bind to sides; squads outside the rotation are "gray". Two matchup configurations exist: (a) **2 servers × 2 sides**, where each side only plays the side on its own server; (b) **4 sides free-for-all**, any side vs any side regardless of server. Source data lives on a public page describing squads and their side attribution. It must be scraped, processed, stored, kept current on a schedule, and force-refreshable from the admin panel.
  2. **Player forum rating.** Scrape the full player list from the site, read each player's *likes received* and *messages posted*, and build a ranking table from a single derived score.
- **GSD stage:** Explore → new-project / milestone briefs (cross-repo). Not yet spec.
- **Target outcome:** A decision pack that can seed (a) a new-project brief for the scraper service and (b) milestone briefs for `server-2` and `web`.
- **Artifact owner:** product / planning.

## Goal
Stand up a **general-purpose scraper of the community site** that turns public site content into trustworthy `server-2` business data, on a schedule, without violating the product's ingest invariant ("only `server-2` writes business tables"). The first delivered target is rotation **sides**; the same service later hosts player **forum rating**, **mapmakers (картоделы)**, and possibly **missions**. Replay-file ingest stays in `replays-fetcher` (binary blobs + S3 — a different profile).

## Users And Workflows
- **Public visitor** — sees rotation structure (which squads are on which side, the matchup configuration, gray squads as a filter); later, a player forum-rating leaderboard, also surfaced on player profiles.
- **Admin** — presses a force-refetch button to re-scrape sides on demand (beyond the scheduled poll); runs the periodic **rebalance** (≈ every 1–1.5 months) on the site, moving squads between sides based on the statistics *this product* collects — which the scraper then picks up.
- **Player** — incentivized to file a nickname-link request (existing moderation flow) when changing nicks, so their forum identity keeps matching their canonical player for the rating.
- **Moderator** — resolves `unmatched` forum identities via the existing nickname-link request/moderation flow.

## Scope
### Must Have (before v1 release)
- New scraper service: generic core (fetch + request spacing + retry + optional SSH transport, mirroring `replays-fetcher` primitives) with **pluggable scrape targets**, each on its own schedule.
- Target **sides**: scrape the squad→side roster + matchup configuration; stage raw facts.
- `server-2`: sides data model, promote handler (staging → matched business rows), public sides API, admin force-refetch endpoint.
- `web`: public sides view + admin force-refetch button.

### Nice To Have / Post-release increments
- Target **player forum rating**: likes + messages time-series, single derived score, public leaderboard, player-profile integration.
- Target **mapmakers (картоделы)**.
- Target **missions**.

### Non Goals
- Moving replay-file ingest out of `replays-fetcher`.
- Letting the scraper write `server-2` business tables directly.
- Driving stat attribution from scraped side rosters (sides stay a standalone structural record; the parser's per-replay `side` remains the source for commander-side stats).
- Auto-creating canonical player identities from forum-only users.

## Confirmed Decisions
| Decision | Choice | Rationale | Consequence |
|----------|--------|-----------|-------------|
| Scraper home | **New dedicated service** (generic, multi-target) | Multiple targets coming (sides, rating, mapmakers, missions); a one-off parser would not scale | New repo + deploy + observability; design for extensibility from day one |
| Handoff to `server-2` | **Staging → promote (poll)** | Same contract as `replays-fetcher`; keeps entity matching in `server-2`; free durability/idempotency/audit; uniform across N targets | Per-kind promote handler in `server-2`; poll latency (irrelevant for monthly/periodic data) |
| Staging shape | One generic `scraped_facts(kind, source_ref, payload jsonb, checksum, status, fetched_at, …)` + per-kind promote handler | Avoids schema sprawl as targets grow | Promote dispatches on `kind` |
| Sides ↔ stats | **Standalone structural record** | Decoupled from parser `side` + stats pipeline; lower reconciliation risk | Two notions of "side" coexist intentionally (roster vs per-replay) |
| Side scope | **Side belongs to a rotation** (`sides.rotation_id`) | Rebalance = moving squads between *this rotation's* sides | Rebalance opens/closes binding windows within the rotation |
| Binding history | **Time-windowed** (`valid_from`/`valid_to`, like `squad_memberships`) | Monthly admin rebalance must be auditable | Promote must close old windows + open new on change |
| Matchup config | **Scraped from the page** (`matchup_mode`: `two_servers_2v2` \| `four_sides_free`) | Visible on the public page | Parser must reliably detect config + server grouping |
| Gray squads | **Stored with `gray` status** | Completeness + UI "in-rotation / not" filter | Squad may need a roster-derived row even if never seen in a replay |
| Rating linkage | **Linked to `canonical_players`** | Site rule: forum nick = in-game nick, strict check → deterministic match | Surfaces on player profiles; needs nickname-based matching |
| Rating storage | **Time-series (history)** | Trends + "gain over period" | Needs retention/aggregation strategy |
| Rating score | **Single derived score** from likes + messages, documented + tested | Consistent with the hardcoded-bounty-formula approach in `server-2` | Weights are a follow-up implementation detail |
| Unmatched forum users | **Stay in staging as `unmatched`**; resolved via existing nickname-link request/moderation flow | Reuses moderation instead of auto-creating identities; nickname changes propagate through requests | Manual resolution path; product incentive for nick-link requests |
| Sequencing | **Sides before release; rating + other targets after** | User directive | v1 = scraper core + sides end-to-end; rest are post-release increments |

## Assumptions
| Assumption | Confidence | Evidence | How To Validate |
|------------|------------|----------|-----------------|
| Sides source page is public + server-rendered on `sg.zone` | **Confirmed (spike 2026-06-17)** | `/squads` → HTTP 200, SSR HTML | Done — see Source-Page Spike Findings |
| Rating + missions source pages are behind login | **Confirmed (spike 2026-06-17)** | `/profile/<nick>` and `/missions` → HTTP 401 | Scraper needs an authenticated session for those targets |
| Matchup config (2×2 vs 4-FFA) + server grouping are derivable from the public page | **Medium** | Spike: inferred from `squads-server-name` section count + side-color set; not an explicit label | Validate against a known 2-server period; keep admin-override fallback |
| Squad roster lists squads matchable to `server-2.squads` | **High** | Spike: each entry has `data-tag` = squad tag, directly matchable to `squads.tag` | Decide squad-create-from-roster policy |
| Forum nick == current canonical nickname at scrape time | High | User: "жёсткая проверка" on the site | Match against `display_name` + nickname history |
| "Sides before release" means scraper core + sides backend + sides `web` UI all ship in `web` v1 | Medium | Inferred (web not started; release includes web) | Confirm whether sides UI is in `web` v1 or backend-only first |
| Scheduled cadence: sides ~daily (well inside monthly rebalance); rating periodic (e.g. daily for time-series) | Medium | Rebalance ≈ monthly | Confirm acceptable freshness |

## Backend And Infrastructure Notes
| Topic | Decision/Default | Frontend Consequence | Hidden Cost | Breaking Point |
|-------|------------------|----------------------|-------------|----------------|
| New scraper service | Generic core + per-target adapters; writes only `scraped_facts` staging | None directly; data appears via `server-2` APIs | New repo, deploy, metrics, conventions; polite-scrape (spacing/retry) per target | A target needing near-real-time or auth'd scraping |
| `scraped_facts` staging | Generic table keyed by `kind`; `server-2` claims with `FOR UPDATE SKIP LOCKED` (existing pattern) | — | Per-kind promote handler; status lifecycle (`pending`/`processing`/`promoted`/`unmatched`/`conflicted`) | Very high fact volume per target |
| Promote + matching | Lives in `server-2` (owns canonical entities); reuses `IntervalTask` | Matched data only is exposed | Matching rules per target (squad name/tag; forum nick → canonical) | Ambiguous/fuzzy identity (handled via `unmatched` + requests) |
| Sides schema | `sides(id, rotation_id, name, server_group, …)`, `squad_side_bindings(id, side_id, squad_id, valid_from, valid_to, source)`, rotation `matchup_mode`, squad `gray` status | Public sides view + filter; admin force-refetch button | New migrations; window open/close logic on rebalance | — |
| Rating schema | `player_forum_stats` time-series (`player_id`, `likes`, `messages`, `score`, `fetched_at`) | Leaderboard table + profile widget | Retention/aggregation for the series | Series growth without retention |
| Admin force-refetch | New `server-2` endpoint, `requireRole("admin")`, following the `/operations/...retry|reparse` pattern → triggers immediate scrape/re-promote | `useMutation` → invalidate sides query | Per-target (and per-rotation for sides) | — |
| API typing | New endpoints land in `server-2` OpenAPI → `web` regenerates types | Generated types only, no hand DTOs | Keep schema in sync per change | — |

## Risks
| Risk | Severity | Why It Matters | Mitigation |
|------|----------|----------------|------------|
| Matchup config inferred, not labeled | Medium | Spike: mode read from `squads-server-name` section count + side-colors, not an explicit field; `orange`/`primary` are edge cases | Validate against a 2-server period; admin-override fallback |
| Rating + missions sources behind login (HTTP 401) | High | Scraper must hold an authenticated session (login/cookie), a credential + ToS dependency absent for public sides | Defer to post-release; design auth'd-transport carefully; confirm scraper credentials |
| Squad name/tag matching ambiguity (no external id) | Medium | Wrong side binding corrupts rotation structure | Define squad-match + create-from-roster policy; route ambiguous to a review/`unmatched` state |
| Rebalance window logic bugs (overlapping/duplicate bindings) | Medium | Time-windowed history is easy to get wrong | Constraints (no overlapping open windows per squad/rotation); tests on close+open transitions |
| Scraper as a second ingest mental model | Low | Drift from `replays-fetcher` patterns | Reuse contract + primitives; extract a shared package if it pays off (note `ts-toolchain` convergence work) |
| Politeness / source load | Low–Med | Scraping the live site repeatedly | Reuse `replays-fetcher` request-spacing + dedup-by-source_id before fetch |
| Two "side" concepts confuse consumers | Low | Roster side vs parser `side` | Name + document the distinction; sides stay structural-only in v1 |

## Acceptance Criteria
- A scheduled job scrapes the sides roster + matchup config and writes raw facts to `scraped_facts`; `server-2` promotes them into `sides` + `squad_side_bindings` with correct rotation scope, matchup mode, and gray-squad status.
- A rebalance on the site (squad moved between sides) is reflected after the next scrape as a closed old window + opened new window — history preserved.
- An admin can force an immediate sides refetch from the panel and see the result without waiting for the scheduled poll.
- Public UI shows, per rotation: sides, their squads, matchup configuration, and a gray/in-rotation filter.
- (Post-release) Player forum rating: scheduled scrape populates a time-series; a leaderboard ranks players by the documented score; matched players link to canonical profiles; unmatched entries are visible for moderation, not dropped.

## Verification Plan
- **Source-page spike** (pre-build): confirm both pages' structure; prove matchup config + bindings + likes/messages + player list pagination are extractable.
- **Unit**: parser (matchup detection, binding extraction, likes/messages), score formula, window open/close transitions, gray-squad classification.
- **Integration**: stage → promote → business rows; rebalance scenario; unmatched-forum-user → staging → request-resolution path.
- **Contract**: `server-2` OpenAPI updated; `web` type generation green.
- **E2E (`web`)**: admin force-refetch flow; public sides view + filter; (post-release) leaderboard sort + profile link.

## Source-Page Spike Findings (2026-06-17)
Three single requests to `sg.zone` (one per page; no crawling — Cloudflare/load caution per owner):
- **`/squads` — HTTP 200, public, server-rendered HTML** (legacy PHP-style, vanilla `/js/js.js` + prism; no React/Next, no JSON blob). Fully parseable like the `replays-fetcher` replay pages. Each squad is `<div class="squads-entry" data-tag="TAG">` — **`data-tag` is the direct match key to `server-2.squads.tag`**. Side = a CSS **color class** on inner spans/anchors (`red`/`blue`/`green`/`yellow`/`orange`). Gray (not-in-rotation) squads carry `class="gray"`. Server/section grouping shows as `class="squads-server-name">…` (observed: "Indepenent squads"). `forum-user` anchors link each squad to a forum identity. ~50 squads on the page; `/squad/<TAG>` detail pages exist.
  - **Matchup config is NOT an explicit label** — it must be *inferred* from the number of `squads-server-name` server sections and the side-color set. At spike time: one named section + 4 side-colors → looks like **4-FFA** currently. A 2-server-2-side period would presumably render two server sections of two colors each. Inference is workable but subtle → keep the admin-override fallback. `orange` (5th color) and a `primary` class are edge cases to classify.
- **`/profile/<nick>` — HTTP 401 (auth required); analyzed via a saved local copy.** Server-rendered + parseable. The `user-statistics` block holds the rating inputs directly: **Репутация (reputation = the site's "likes" equivalent)** and **Сообщений (message/post count)** — e.g. ZAKU: reputation 113, messages 59 (messages link to `/posts/<nick>`). Identity row is `<span class="forum-user">` with squad tag `[KSK]` (→ `/squad/KSK`) + nickname `ZAKU` whose **profile slug == the nickname** (confirms forum nick = game nick). Profile also exposes previous nicknames (`prevNicks`/`showPrevNicks`) and a **mapmaker rank** (`mission-maker-junior` / "Начинающий картодел"). So rating = scrape (reputation, messages) per `/profile/<nick>`; score = f(reputation, messages).
- **`/missions` — HTTP 401 (auth required); analyzed via a saved local copy.** Server-rendered + parseable. Inline `dataDict` carries the map list and a **mission-status bitmask enum** (Допущена=1, На доработку=2, Заявлена на тесты=4, Не протестирована=8, Не допущена=16, Протестирована=32, Сломана=64). Mission entries carry **mapmaker attribution** via `forum-user` + `mission-maker*` / `mission-tester` rank classes, status badges, maps, pagination. Confirms the **missions** and **mapmakers (картоделы)** targets are feasible once the scraper is authenticated; mapmaker rank is available on both profiles and mission pages.

- **`/users` — players index (saved local copy).** Paginated list, **40 players/page** (`pagination-item` / `btn-pag`), each row a `forum-user` link to `/profile/<nick>` (with squad side-color + ban markers) — but **no inline reputation/messages**. So the rating crawl = paginate `/users` to enumerate every player, then **one `/profile/<nick>` fetch per player** for Репутация + Сообщений. This per-player fetch is the **request-budget driver** → must be paced (reuse `replays-fetcher` request spacing) and run at low frequency (rating changes slowly).

Consequence: **sides scraping is public + low-risk**; **rating + missions require an authenticated session** (login/cookie) on the scraper — a materially larger risk and a credential/ToS dependency, plus the rating's N-profiles-per-cycle request budget. Reinforces sequencing: public sides before release; credentialed targets after. The 401s are app-auth, not Cloudflare blocks, so a valid session should reach them.

## Open Questions
| Priority | Question | Why It Matters | Owner/Status |
|----------|----------|----------------|--------------|
| ~~P0~~ Resolved | Source-page structure | Spike done: `/squads` public+parseable; `/profile` + `/missions` behind 401 | Closed 2026-06-17 |
| ~~P1~~ Resolved | Rating crawl shape: paginate `/users` (40/page) to enumerate, then one `/profile/<nick>` fetch per player for Репутация + Сообщений | Cost driver = N profile fetches/cycle → pace + low frequency | Closed 2026-06-17 |
| P1 | Rating refresh budget: acceptable cadence given N `/profile` fetches/cycle + Cloudflare; full re-crawl vs incremental | Bounds source load + freshness | Resolve in rating spec (post-release) |
| P1 | Scraper credentials/session for authed targets (rating, missions): does `replays-fetcher` already hold sg.zone creds, or new account/cookie? ToS posture? | Gates the entire authed-scrape path | User |
| P1 | Is the sides `web` UI in `web` v1, or is sides backend-only required "before release"? | Sequencing of `web` work | User |
| P1 | Squad-from-roster policy: create canonical squad when roster lists one not yet in DB, or only match existing? | Affects gray-squad storage + matching | Resolve in spec |
| P1 | Score formula weights (likes vs messages; sum vs ratio) | Defines ranking | Implementation detail (post-release), document + test |
| P2 | Scheduled cadence per target (sides daily? rating daily?) + admin force scope (per-rotation vs global) | Freshness vs source load | Default proposed; confirm |
| P2 | New service repo name (working: `community-scraper`) and whether to extract shared scrape primitives from `replays-fetcher` | Repo/toolchain setup | Resolve at new-project time |

## Question Ledger
| Priority | Question | Answer | Decision Impact |
|----------|----------|--------|-----------------|
| P0 | Where does scraping live? | New dedicated service; more targets coming (mapmakers, missions) | Generic multi-target scraper service |
| P0 | Rating linked to game players or standalone? | Linked to `canonical_players` (forum nick = game nick, strict) | Nickname-based matching; profile integration |
| P0 | Scraped side roster drives stats or standalone? | Standalone structural record | Decoupled schema; lower risk |
| P1 | Scraper → `server-2` handoff? | Staging → promote (after comparison) | Same contract as `replays-fetcher`; matching in `server-2` |
| P1 | Binding history vs snapshot? | Time-windowed (monthly admin rebalance) | `valid_from`/`valid_to` bindings |
| P1 | Side scope vs rotation? | Side inside a rotation | `sides.rotation_id` |
| P1 | Matchup config source? | Scraped from page | Parser detects `matchup_mode` + server grouping |
| P1 | Gray squads? | Store with `gray` status | Roster-derived squad rows + status |
| P1 | Rating formula? | Single derived score, documented + tested | Like hardcoded bounty formula |
| P1 | Forum-only / unmatched users? | Stay in staging `unmatched`; resolve via nickname-link requests; nick changes propagate | Reuse moderation; no auto-create |
| P1 | Sequencing? | Sides before release; rest after | v1 = scraper core + sides; rest post-release |

## Recommended Next GSD Step
- The sides source-page spike is **done** (`/squads` public + parseable). The load-bearing uncertainty for sides is resolved; the rating/missions sources need an *authenticated* spike, which is post-release.
- **Primary:** `gsd-new-project` brief for the scraper service (generic core + sides target), plus `write-milestone-brief` for `server-2` (sides schema + promote handler + admin force-refetch endpoint + public sides API) and `web` (sides view + admin force-refetch button). Run repo-rooted in each target repo, not from a `plans`-session subagent.
- **Then (post-release):** authed-access spike for the rating target (`/profile` + a members index behind login) once scraper credentials are settled; then milestone briefs for rating, mapmakers, missions.
- **Watch items for the sides parser spec:** matchup-mode inference from `squads-server-name` sections + colors (with admin-override fallback); `orange`/`primary` edge colors; squad-create-from-roster policy.
