# Solid Stats Score Decisions

**Date:** 2026-06-28
**Updated:** 2026-07-04
**Status:** Active product decision pack from deep brainstorm
**Scope:** `server-2` statistics contracts and `web` score display.

This note captures current product decisions for game-type scope and player
score. It intentionally supersedes older brief statements that assumed hard
`is_show` leaderboard eligibility or old score factors.

## Game Type Scope

| Game type | Product role | Scope model |
|-----------|--------------|-------------|
| `sg` | Primary product surface. | All-time is the main leaderboard; rotations are secondary slices. |
| `mace` | Secondary add-on. | All-time only. |
| `sm` | Secondary add-on. | All-time only. |

There is no mixed `all` competitive leaderboard. Every rating surface is scoped
to one selected game type. The default game type in the UI is `sg`.

## Raw Score

```txt
netKills = kills - teamkills
effectiveGames = max(1, games - deathsByTeamkill)

rawScore = netKills / effectiveGames
```

Semantics:

- A teamkill committed by the player penalizes that player through
  `kills - teamkills`.
- A death caused by a teammate is removed from the victim's denominator through
  `games - deathsByTeamkill`.
- A teamkill committed by the player does not otherwise change that attacker's
  game denominator.
- `effectiveGames` has a floor of `1` to avoid null/undefined raw score and to
  avoid treating "no effective games" as exactly average.
- Do not add a separate eligibility gate for one-game / teamkill-death edge
  cases. They are rare and remain rankable through the `effectiveGames = 1`
  floor.
- Public score is allowed to be negative. Do not clamp player score at `0`;
  negative score is a valid signal for harmful/teamkill-heavy play.

## Bias-Adjusted Score

Bias-adjusted score replaces the old hard `is_show` eligibility split:

```txt
meanScore(scope) =
  sum(netKills) / sum(effectiveGames)

adjustedScore(scope) =
  (netKills + 12 * meanScore(scope))
  / (effectiveGames + 12)
```

Decisions:

- Bias strength is `C = 12`.
- `is_show` should be removed as the public leaderboard eligibility mechanism.
- `meanScore` is always pooled/weighted by effective games, not an unweighted
  average of player scores.
- `meanScore` is local to the selected scope:
  - SG all-time uses all SG data.
  - SG rotation uses that SG rotation.
  - MACE/SM use their own all-time game-type scope.

Rationale:

- Historical calibration showed statistical EB around `C ~= 3`, but that is too
  permissive as a full replacement for hard visibility thresholds.
- `C = 12` is a product guardrail against small-sample spikes while preserving
  regular players: high-volume players are still almost entirely determined by
  their own raw score.
- Pooled mean prevents one-game outliers from moving the baseline as much as
  regular players.

Future `server-2` specs should treat this as the canonical product direction
even if older OpenAPI/brief text still mentions `is_show` or old score factors.
