# Idea: vehicle assist

**Date:** 2026-07-04
**Status:** Idea / research seed
**Scope:** `replay-parser-2`, `server-2`, and `web`

## Context

Vehicle-based play currently has ordinary vehicle facts: kills from vehicle,
vehicle kill counters, attacker vehicle context, and destroyed-vehicle rows.
It does not yet have a safe product rule for awarding extra score/profit to
other players who helped produce that vehicle value.

The working name for this future metric is **vehicle assist**.

## Goal

Award additional score/profit to eligible vehicle crew when a crewmate earns
vehicle-based value, while avoiding false credit to passengers or cargo who were
only riding in the same vehicle.

Examples of intended profile insights:

- total vehicle assists;
- players this player assisted the most;
- players who assisted this player the most.

## Required Research Gate

Do not implement vehicle assist until real OCAP replay data proves how crew is
represented.

The first implementation step is a `replay-parser-2` research spike:

- inspect raw replay `entities` and `events` around vehicle kills and destroyed
  vehicles;
- determine whether the replay records crew membership, seat role, turret role,
  driver/gunner/commander state, cargo/passenger state, or only positions;
- prove whether crew membership can be reconstructed at the kill/destruction
  frame, not just at some point in the replay;
- capture fixtures where passengers/cargo are present in the same vehicle as
  active crew.

If the source data cannot distinguish real crew from passengers, vehicle assist
must stay unimplemented or use an explicit "unknown / no credit" policy.

## Current Evidence

- `replay-parser-2` v3 default artifacts include player rows, weapon rows,
  destroyed vehicle rows, and vehicle context on combat events.
- Current parser evidence can identify the attacker vehicle for some events, but
  the default artifact does not expose vehicle crew membership or passenger role.
- `server-2` consumes parser artifacts and normalized parser events. It should
  not parse raw OCAP JSON to invent crew relationships.
- Current bounty decisions say destroyed vehicles do not participate in bounty
  v1, and bounty remains player-victim focused. Vehicle assist is a separate
  future stats/score feature, not a bounty v1 change.

## Product Semantics

Vehicle assist should credit only players who were operationally part of the
vehicle crew for the vehicle action being scored.

Default exclusions:

- passengers/cargo;
- players merely near the vehicle;
- players who previously occupied the vehicle but were not eligible crew at the
  event frame;
- teamkill/friendly-fire cases, unless a future product decision explicitly
  chooses a penalty or different handling;
- events where crew evidence is missing or ambiguous.

The exact score/profit formula is intentionally TBD. It should be decided only
after the parser spike proves what event and crew evidence exists.

## Metrics

Vehicle assist should expose at least two separate metrics:

- `vehicleAssistCount` - number of eligible vehicle assist events credited to
  the player;
- `vehicleAssistValue` - score/profit value from those assists, once the formula
  is decided.

Count and value must stay separate. Count answers "how often did this player
assist vehicle actions"; value answers "how much score/profit did those assists
produce".

## Implementation Path

1. `replay-parser-2`
   - Add a research spike over real replay fixtures for vehicle occupancy and
     crew role evidence.
   - If supported, extend the parser contract with deterministic vehicle crew
     evidence tied to replay-local player/entity ids and event frames.
   - Regenerate schemas and fixtures after the contract shape is accepted.

2. `server-2`
   - Persist parser-provided crew evidence.
   - Calculate vehicle assist events from eligible crew plus vehicle value
     events.
   - Add aggregate relationship rollups:
     - assisted target player;
     - assisted by player;
     - assist count;
     - assist value;
     - scope fields such as game type and rotation when applicable.
   - Include vehicle assist in score/profit only after the formula is decided
     and tested.

3. `web`
   - Add `vehicleAssistCount` as its own column in relevant player stats and
     profile tables.
   - Add profile tables for:
     - "Most assisted by this player";
     - "Most assisted this player".
   - Keep the metric explainable by linking rows back to source events or a
     detail surface when available.

## Risks

| Risk | Severity | Why It Matters | Mitigation |
|------|----------|----------------|------------|
| Replay data only exposes positions, not seat roles | High | Position proximity would credit passengers and nearby players incorrectly | Require source-level proof before implementation |
| Crew state is time-dependent | High | A player may enter/exit before the vehicle event | Tie eligibility to the event frame or do not credit |
| Parser contract grows too much | Medium | v3 artifact is intentionally compact | Add only minimal deterministic evidence; keep debug-only details out of default output |
| Metric overlaps with bounty | Medium | Bounty is currently player-victim focused | Keep vehicle assist as score/profit stats, not bounty v1 |
| Formula creates farming incentives | Medium | Crew could receive inflated value for passive occupancy | Decide formula after data spike; exclude passengers and ambiguous crew |

## Acceptance Criteria

- A parser spike documents whether OCAP replay data can distinguish crew from
  passengers/cargo.
- Vehicle assist is not awarded when crew evidence is absent or ambiguous.
- Fixtures cover at least:
  - driver/gunner/commander crew;
  - cargo/passengers in the same vehicle;
  - crew change before a vehicle event;
  - friendly/teamkill vehicle events;
  - missing or malformed occupancy evidence.
- `server-2` aggregation tests prove both relationship directions:
  - whom the player assisted most;
  - who assisted the player most.
- `server-2` aggregation tests prove `vehicleAssistCount` is incremented
  independently from any future score/profit value.
- `web` surfaces `vehicleAssistCount` as a separate table column, not only as a
  tooltip, hidden detail, or derived text inside another column.
- Any score/profit formula is documented and tested before public display.

## Open Questions

| Priority | Question | Why It Matters | Owner/Status |
|----------|----------|----------------|--------------|
| P0 | Does OCAP expose reliable crew/seat evidence for historical replays? | Gates the whole feature | `replay-parser-2` spike |
| P0 | Can eligibility be evaluated at the exact kill/destruction frame? | Prevents crediting stale occupants | `replay-parser-2` spike |
| P1 | Which vehicle roles are eligible: driver, gunner, commander, turret crew? | Defines product semantics | Product decision after spike |
| P1 | Should assist value apply to kills from vehicle, destroyed vehicles, or both? | Defines event scope and score impact | Product decision after spike |
| P1 | What is the score/profit formula? | Controls incentives and public ranking impact | Product decision after spike |

## Recommended Next GSD Step

Primary: run a `replay-parser-2` research/spec phase for vehicle occupancy
evidence before planning backend or web work.

Rationale: without parser-provided crew/passenger evidence, `server-2` cannot
calculate vehicle assist correctly and safely.
