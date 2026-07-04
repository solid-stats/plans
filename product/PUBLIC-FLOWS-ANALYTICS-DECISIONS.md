# Solid Stats Public Flows And Analytics Decisions

**Date:** 2026-07-04
**Status:** Active product decision pack from deep brainstorm
**Scope:** `web`, `server-2`, `infrastructure`, and product analytics planning.

This note captures the v1 public navigation, evidence, and analytics contract.
It complements the `web` app brief and the self-hosted analytics decision.

## Public Flow Priority

The v1 public experience is organized around trust loops: a visitor finds a
public stat, opens context, reaches proof, and can return without losing state.

### P0 Core Evidence Loops

1. Stats overview -> players leaderboard -> player profile -> score
   formula/provenance -> replay or bounty evidence.
2. Squads leaderboard -> squad profile -> rotation-scoped squad players
   leaderboard -> player profile -> replay or bounty evidence.
3. Replays list -> replay detail -> participant/player profile -> replay or
   bounty evidence.
4. Direct SEO entry -> player, squad, or replay detail -> visible next steps
   into leaderboard, squad, replay, or evidence loops.

The browser Back journey is part of every P0 loop. Returning from a detail page
must restore list filters, sorting, cursor, virtual row, scroll position, and
cached data without a blocking reload, loading flash, hydration mismatch, console
error, or layout shift.

### P1 Public Tracks

- SG-only bounty leaderboard -> player profile -> top bounty kills -> full
  bounty breakdown -> replay/timing/event evidence.
- Commander-side stats as a separate public track with rotation/player/side
  filters, explicit unknown outcomes, and replay links where available.
- Canonical rotation pages and rotation filters across player, squad, replay,
  commander, and bounty surfaces.
- Contextual correction entrypoints on player, replay, event, and provenance
  surfaces. A general fallback button belongs in the authenticated request list,
  not as noisy public-page chrome.

### P2 Later Public Improvements

- Richer history filters.
- Comparison views.
- Broader provenance drilldowns.
- Advanced replay catalog filters beyond the v1 replay list.
- Full kill ledger for score proof.

## Evidence Rules

Score proof in v1 is aggregate/formula based:

- raw score;
- adjusted score;
- bias/sample-size adjustment;
- scope mean;
- effective games;
- formula;
- freshness and provenance state.

Do not route score proof through a full kill ledger in v1.

Bounty proof is event/replay based and must include:

- victim;
- replay link;
- timing in replay;
- event anchor when an event row exists;
- victim adjusted score;
- multiplier;
- points;
- rotation context.

Product links may target replay plus timing, with an event-row anchor when an
event exists. Analytics must not record replay IDs, event IDs, slugs, nicknames,
or destination URLs.

Public corrected markers stay minimal. Public surfaces never expose request IDs,
Discord identities, staff identities, staff notes, attachments, or correction
operation chains.

## Direct Entry Behavior

Public detail pages are not terminal pages. A visitor who lands directly from
SEO or an external link must see clear next steps back into the product:

- player detail -> leaderboard context, squad context, bounty/replay evidence,
  nickname history, and correction entrypoints where relevant;
- squad detail -> rotation-scoped squad players, membership history, related
  player profiles, and rotation context;
- replay detail -> participants, event/timing anchors, player profiles, bounty
  proof where relevant, and correction entrypoints.

Filtered search/cursor/list URLs should not become crawl traps. Detail pages,
canonical rotation pages, and base leaderboard/catalog pages are indexable;
volatile search/filter/cursor variants should canonicalize or noindex.

## Analytics Contract

Use Plausible CE for low-cardinality quantitative flow metrics. Use OpenReplay
for sampled qualitative diagnostics on approved public routes.

V1 measures session activation and aggregate demand, not true D1/D7 user
retention. Active A/B testing is deferred; implementation may reserve adapter
fields for future experiments, but v1 should not emit experiment events.

Sanitize pageviews to route templates such as:

- `/players/:slug`
- `/squads/:slug`
- `/replays/:replayId`

These templates are analytics labels only. Do not send raw slugs, replay IDs,
event IDs, request IDs, Discord IDs, nicknames, search text, notes, attachment
names, high-cardinality query strings, or destination URLs to Plausible or
OpenReplay.

Recommended low-cardinality events:

- `public_list_action`
- `public_detail_action`
- `public_context_restored`
- `public_evidence_opened`
- `public_correction_intent`
- `public_freshness_action`
- `public_flow_failed`

Safe event properties:

- `flow`
- `surface`
- `locale`
- `gameType`
- `scope`
- `action`
- `sortKey`
- `filterGroup`
- `result`
- `errorFamily`
- `requestType`
- `hasEventAnchor`
- `authState`

OpenReplay starts on public allowlisted routes only. Keep it off authenticated
request, moderator, and admin flows until privacy policy, masking, sampling,
retention, network payload capture, and console capture rules are proven safe.

## Validation Metrics

| Area | Metrics |
|------|---------|
| Discovery | Page-family visits, source/campaign, overview-to-core-surface rate, locale/device/browser. |
| Lists and tables | Search/filter/sort/paginate action rate, zero-result rate by filter group, detail-open rate, list-to-detail-to-Back restore success. |
| Profiles | Score explanation opens, provenance/history opens, replay/evidence clicks, correction intent. |
| Bounty | SG all-time default usage, rotation/scope changes, sort distribution, bounty breakdown opens, top-kill/full-breakdown opens. |
| Replay timeline | Timeline loaded vs summary-only, timeline filter use, evidence opens, correction intent by event family. |
| Commander and rotation | Rotation filter use, unknown-outcome filter use, replay/evidence opens. |
| Public to request | Correction intent, login prompt, OAuth start/return, form start, submit success/error family, validation-fixed rate. |
| Freshness and continuity | Stale banner shown, SSE update applied or dismissed, offline/error states, context-restore failures. |

OpenReplay queues should be tagged by sanitized flow and failure state, not by
entity identifiers. Priority queues:

- sampled mobile player/squad list sessions with rage or dead clicks;
- sessions with `public_context_restored` failures;
- bounty sessions with dead clicks around breakdown or top-kill proof;
- replay detail sessions with timeline friction;
- correction-intent sessions that stop at login prompt or form start.

## Acceptance Scenarios

- Player flow: find the top SG player, inspect score formula, open bounty or
  replay evidence, return to the same leaderboard state.
- Squad flow: open a squad, switch to rotation-scoped players, open a player,
  inspect evidence, return to squad context.
- Replay flow: filter the replay list, open a replay, open a participant
  profile, inspect evidence, return to replay/list state.
- Bounty flow: open bounty leaderboard, explain a player's bounty through
  victim, multiplier, points, replay, and timing.
- Direct SEO: land on a player or replay page and continue into a related
  leaderboard, squad, replay, or evidence loop.
- Privacy: confirm analytics and OpenReplay contain only route templates and
  safe enums.
- Quality: no layout shift, hydration mismatch, console error, blocking reload,
  or lost scroll/cache state on critical flows.
