# Solid Stats Leaderboard UX Decisions

**Date:** 2026-06-28
**Updated:** 2026-07-04
**Status:** Active product decision pack from deep brainstorm
**Scope:** `web` leaderboard UX and stat presentation.

This note captures current product decisions for leaderboard defaults, sorting,
numeric display, and explanation copy.

## Scope Controls

Future `web` specs should model game-type/scope controls as:

- `sg`: all-time + rotations.
- `mace`: all-time only.
- `sm`: all-time only.

The main leaderboard surface is SG all-time. SG all-time includes the current
rotation live.

There is no permanent `preliminary` badge; a current rotation always exists, so
that label would become noise. Leaderboard headers should show freshness
instead:

```txt
Last replay: <date/time>
Replays counted: <n>
```

## Score Display

Default player leaderboard sort:

```txt
adjustedScore desc
```

- The leaderboard's main `Score` column is `adjustedScore`.
- Do not label the formula as "Bayesian" in player-facing UI. Use wording such
  as "adjusted for sample size".
- Table rows may expose the raw score in a tooltip/popover, not as an equally
  prominent primary metric.
- Player profiles may show both values: `Score` as the primary value, `Raw` as
  a smaller explanatory value.

Suggested score explanation payload:

```txt
Raw score: <rawScore>
Bias: +12 average games
Mean: <scopeMeanScore>
Effective games: <games - deathsByTeamkill>
Formula: (net kills + 12 * mean) / (effective games + 12)
```

## Bounty Display

- Bounty is SG-only and should not appear for `mace` or `sm` in v1.
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

## Numeric Display And Sorts

Numeric display:

- Score values: 3 decimal places.
- Bounty point totals: 2 decimal places.
- Bounty multipliers in breakdowns: 2 decimal places.
- Kills, games, and teamkills: integers.
- Sorting always uses full stored/calculated precision, not the rounded display
  string.

Supported secondary sorts:

- `bounty desc` - quality of victims (SG only).
- `kills desc` - raw kill volume.
- `games desc` - participation volume.
- `teamkills desc` - worst offenders by absolute teamkill count.
- `name asc` - alphabetical lookup.

Do not add `teamkills asc` as a "best discipline" sort. It would mostly rank
low-sample players with zero teamkills rather than a meaningful discipline
leaderboard. If a discipline surface is added later, use a dedicated
teamkill-rate metric with its own sample-size/bias treatment.
