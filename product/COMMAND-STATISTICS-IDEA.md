# Idea: player command statistics

**Date:** 2026-10-04
**Status:** Idea / product semantics agreed
**Scope:** Player statistics in `server-2` and `web`; starting-slot evidence from
`replay-parser-2` must be checked when implementation is planned.

## Purpose

Show how often a player takes command as reference information alongside the
existing side-commander statistics.

The roles are:

- **Squad commander (КО):** commander of a squad.
- **Side commander (КС):** commander of an entire side.

## Agreed Metrics

| Statistic | Game count | Percentage |
| --------- | ---------- | ---------- |
| Commander (КО + КС) | КО games + КС games | count / total × 100 |
| Squad commander (КО) | КО games | count / total × 100 |
| Side commander (КС) | КС games | count / total × 100 |

The denominator (`total`) for every percentage is **all games the player
participated in**.

## Role Attribution

Determine the command role from the player's **slot at the start of the game**.
Mid-game changes of command are outside this metric: the agreed criterion is
the starting slot, and taking command later cannot be verified from the
available information according to the user.

## Planning Context

The [web app brief](../web/briefs/web.md#commander-side-stats) already includes
side-commander game counts and known wins/losses. This idea adds squad-command
participation and the combined command count, with participation percentages
for all three rows.

The product semantics above were confirmed by the user on 2026-10-04.
Implementation details, delivery priority, and release timing remain open.
