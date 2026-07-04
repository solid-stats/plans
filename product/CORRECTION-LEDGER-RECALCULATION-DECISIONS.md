# Solid Stats Correction Ledger And Recalculation Decisions

**Date:** 2026-07-04
**Status:** Active product decision pack from deep brainstorm
**Scope:** `server-2` correction application, canonical replay state,
statistics recalculation, and public/staff correction provenance.

This note defines how accepted correction requests become canonical data. It
intentionally separates immutable parser evidence from moderated canonical state.

## Core Model

Corrections are an immutable domain ledger over immutable parser output.

Raw parser output stays raw:

- Do not mutate `parser_events`.
- Do not mutate `parser_results.raw_snapshot`.
- Parser rows remain evidence and can be reparsed or compared later.

Accepted corrections write semantic append-only operations, not generic JSON
patches. Operation examples:

- remove replay event;
- add replay event;
- change event type;
- change event actor;
- correct commander result;
- correct commander assignment;
- merge identity;
- split identity by date;
- reverse operation;
- supersede operation.

Old `audit_patches` and old workflow routes are legacy implementation surfaces
to replace. They are not the new source of truth.

## Targeting

Replay-event corrections target canonical events by:

```txt
replayId + eventStableKey
```

Preferred stable key source:

- new parser contract `event_id`.

Legacy fallback when `event_id` is missing:

- derive a stable key from parser source reference and event type, for example
  `source_ref + event_type`.

Do not target corrections by `parser_events.id`; parser event rows are storage
artifacts, not long-term domain identifiers.

## Ledger State

The ledger stores immutable `correction_operations`.

Operation state is projected, not edited in-place:

- `active`
- `superseded`
- `reversed`
- `conflicted`

Ledger rows are never deleted or mutated to undo a correction. Reversal and
superseding are explicit follow-up operations.

Conflict policy:

- One active operation is allowed per `target + aspect`.
- Compatible aspects can coexist on the same target.
- Same-aspect changes must explicitly supersede or reverse the previous active
  operation.

Examples:

- Changing a kill victim and later correcting commander result can coexist.
- Two active victim changes for the same event conflict unless the later one
  supersedes the earlier one.

## Canonical State

Accepted operations materialize canonical state used by the public API and
statistics jobs:

- `canonical_replay_events` for public replay events and stat inputs.
- `canonical_replay_facts` for commander result and commander assignment state.
- Existing `canonical_players` and `player_nicknames` remain materialized
  identity state.

The canonical projection is rebuilt from:

```txt
current parser output + active replay-scoped corrections
```

Identity projections are rebuilt from accepted identity operations and nickname
windows.

## Request Acceptance

Accepting a request is one transaction:

- write the moderation action;
- write correction operation(s);
- update materialized canonical state;
- enqueue coalesced recalculation jobs;
- finalize the request as `accepted`.

Accepted requests remain final from the author's point of view even if
background recalculation later fails. Failures are handled through operation/job
status and retries, not by reopening the request.

No historical migration of old non-production correction data is required unless
real production data is later found.

## Recalculation

Recalculation is background work, not part of the synchronous request accept
response.

Storage responsibilities:

- PostgreSQL stores durable job status, freshness, retry state, and affected
  scopes.
- RabbitMQ only wakes workers.

Public aggregates continue to serve the last stable values while jobs are
pending or failed. Responses expose freshness/recalculation status so the UI can
show that the value is not yet fresh.

Canonical replay events may update immediately after materialization even while
aggregate recalculation is still pending.

Suggested public status field:

```txt
recalculationStatus: "fresh" | "pending" | "failed"
```

Existing provenance timestamps should remain available alongside this status.

## Recalculation Scopes

Event correction:

- affected replay;
- affected SG rotation when the replay belongs to SG;
- SG bounty for the whole affected rotation when kills, teamkills, deaths, or
  victim identity can change;
- all-time rollups.

Commander result or commander assignment correction:

- affected replay;
- affected rotation commander stats/result aggregates;
- all-time rollups that include commander stats/result aggregates.

Identity merge or split:

- every affected rotation;
- SG bounty for every affected SG rotation;
- all-time rollups.

Bounty scope is intentionally rotation-wide. Victim adjusted score and rotation
mean score can change third-party bounty multipliers, not only the edited
attacker or victim.

## Reparse Policy

Corrections are replay-scoped and reapplied after reparse.

On a new current `parser_result` for a replay:

- rebuild canonical state from the new parser output plus active replay-scoped
  corrections;
- keep corrections active when their targets still resolve;
- mark corrections as `conflicted` when the target is missing or ambiguous;
- exclude conflicted corrections from canonical state until staff resolves them.

Conflict state is staff-visible and should point to the affected operation and
linked request.

## Public And Staff Provenance

Public/player surfaces expose only a minimal corrected marker.

Example:

```json
{
  "correction": {
    "state": "corrected"
  }
}
```

Public responses must not expose:

- request id;
- request comments;
- attachments;
- Discord user identity;
- staff identity;
- moderator reasoning;
- internal operation chain.

Staff surfaces expose the full correction chain so moderators/admins can answer
player questions:

- correction operation id;
- linked request;
- moderation action;
- moderator/admin who applied it;
- private reason/comments/evidence links where permitted;
- conflict status;
- recalculation job status;
- affected recalculation scopes.

Replay details can link from a corrected event to the staff-only correction
chain. Public users only see the minimal marker.

## Tests

Unit tests:

- operation projection: active, supersede, reverse, conflict;
- compatible aspects vs same-aspect conflicts;
- stable key fallback from legacy parser source refs.

Integration tests:

- request accept transaction writes moderation action, ledger operation,
  canonical state, and recalculation job;
- accepted request finalization is atomic with the ledger write;
- recalculation job enqueue is idempotent and coalesces duplicate scopes;
- retrying a failed worker does not duplicate canonical rows or operations.

Reparse tests:

- active corrections reapply after reparse;
- missing target becomes staff-visible conflict;
- ambiguous target becomes staff-visible conflict;
- conflicted corrections are excluded from canonical state.

API tests:

- public replay event includes only the minimal corrected marker;
- public aggregate/profile/leaderboard responses expose freshness status;
- request comments, attachments, Discord identity, and staff details never leak
  to public responses;
- staff API can navigate from corrected entity to full correction chain.

Recalculation tests:

- pending jobs keep last stable aggregates with freshness marker;
- failed jobs keep last stable aggregates with freshness marker;
- successful jobs update every affected scope.
