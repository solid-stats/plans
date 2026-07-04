# Solid Stats Bounty Decisions

**Date:** 2026-06-28
**Updated:** 2026-07-04
**Status:** Active product decision pack from deep brainstorm
**Scope:** SG bounty statistics, recalculation rules, and bounty UI/API surface.

This note captures current product decisions for bounty. Bounty is SG-only and
measures quality of victims, not raw activity.

## Scope

| Game type | Bounty |
|-----------|--------|
| `sg` | Yes. |
| `mace` | No v1 bounty. |
| `sm` | No v1 bounty. |

Bounty UI/API should not appear for `mace` or `sm` in v1.

## Formula

For each SG rotation:

```txt
meanScore =
  sum(netKills) / sum(effectiveGames)

victimAdjustedScore =
  (victimNetKills + 12 * meanScore)
  / (victimEffectiveGames + 12)

victimMultiplier =
  clamp(victimAdjustedScore / meanScore, 0, 3)

bountyPoints per enemy kill = victimMultiplier
bountyPoints per teamkill = 0
```

Decisions:

- Bounty uses the current rotation's victim score, not the previous rotation.
- There is no lower floor at `1.0`. Weak victims may be worth less than one
  point.
- The lower bound is `0` to prevent negative bounty from negative victim score.
- The upper cap is `3` to prevent extreme outliers from dominating a season.
- Teamkills award `0` bounty and do not produce negative bounty.
- Unknown/new victims do not need a fallback multiplier because the current
  rotation score is used with bias.
- Enemy kills without a resolved victim award `0` bounty and should carry an
  explicit excluded reason such as `missing_victim`.
- Suicide/environmental deaths do not participate in bounty.
- Destroyed vehicles do not participate in bounty v1; bounty is player-victim
  focused.
- Bounty trusts the canonical event type after moderation corrections. It does
  not independently reclassify friendly/enemy kills from side data. If a replay
  misclassifies a kill/teamkill, the correction workflow is the mechanism that
  changes the canonical event before statistics/bounty are recalculated.

SG all-time bounty is the sum of per-rotation bounty rows. It must not be
recomputed by applying an all-time victim multiplier to historical kills.

## Recalculation

Recalculation boundary after accepted corrections:

- A correction that affects kills, teamkills, deaths, or victim identity must
  recalculate player stats for the affected rotation.
- Bounty must be recalculated for the whole affected SG rotation, not only for
  the directly edited attacker/victim.
- SG all-time aggregate bounty is then updated as the sum of rotation bounty
  rows.
- Identity merge/split corrections must recalculate every affected rotation,
  then recalculate bounty for every affected SG rotation, then rebuild all-time
  rollups.

Reason: bounty multipliers depend on victim adjusted score and the rotation
mean score. A single kill/teamkill correction can change the attacker's score,
the victim's effective games, the rotation mean, and therefore third-party
bounty multipliers within the same rotation.

## Display

- Leaderboards show the total bounty value.
- Player profiles and bounty detail views should expose the top contributing
  kills so the metric is explainable.
- Suggested breakdown columns:
  - victim
  - replay
  - victim score
  - multiplier
  - points
- Show the top 10 bounty kills inline on a profile; full breakdown can live on a
  paginated/detail surface or replay detail.
