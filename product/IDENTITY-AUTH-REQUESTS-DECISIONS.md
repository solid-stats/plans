# Solid Stats Identity, Auth, And Requests Decisions

**Date:** 2026-06-28
**Updated:** 2026-07-04
**Status:** Active product decision pack from deep brainstorm
**Scope:** `server-2` auth/identity/moderation contracts and `web` request UX.

This note captures current product decisions for player identity, Discord auth,
and correction requests. It intentionally supersedes older brief statements that
assumed Steam-based player identity, Steam-authenticated player workflows, public
request journals, or player-owned stat profiles.

## Identity And Auth

| Topic | Decision | Consequence |
|-------|----------|-------------|
| Replay player identity | Name/date based only. No persistent player identifier is available in replays. | Canonical player identity is resolved from nickname history and replay date. SteamID cannot be used to prove ownership of stats. |
| Steam player auth | No Steam login for players. | Remove player-facing Steam auth assumptions from future specs and UI. |
| Player-to-stats ownership | No player account owns a nickname or its historical stats. | No "claim my profile" flow in v1. |
| Request author auth | Discord OAuth. | Request authors have accounts, but those accounts still do not own nickname/stat identity. |
| Staff auth | Discord OAuth for moderators and admins. | Staff identity is separate from player/stat identity and is role-gated. |
| Request visibility | No public request journal. | Request details are visible only to the author and staff. |
| Request author content | Never public. | The authenticated Discord author and staff can see the author's submitted payload and author-supplied attachments. |
| Moderator notes and staff evidence | Never public. | Moderator notes/comments and staff-added attachments/links are staff-only. |
| Request abuse controls | Captcha, per-Discord-user throttle, optional per-IP throttle, mandatory moderation before applying corrections. | Discord auth proves authorship; moderation still decides whether the correction is true. |

Discord-authenticated request authors can submit corrections about any
player/replay. Discord auth proves request authorship, not ownership of a
nickname or stat profile. Moderation decides correction validity from evidence;
there is no automatic "claim profile" path.

Player identity semantics:

- Player `name` is not a unique identifier.
- If a player has no nickname-change history, the stable identity id can be the
  normalized lower-case name.
- If nickname changes or same-name splits exist, the stable identity id is
  generated and nickname assignment is resolved by nickname history plus replay
  date, matching the legacy `sg-replay-parser` model.
- The resolver key is effectively `normalizedNickname + replayTimestamp`.
- Same-nickname windows must not overlap. If overlapping windows exist, the
  resolver should surface a conflict rather than choose an arbitrary player.
- Same-name split by date is a valid correction. It creates distinct canonical
  players that share the same displayed nickname in different non-overlapping
  time windows.
- Removing a nickname-change history entry is an admin-only identity action, not
  an ordinary correction request.

## Request Model

Request types for v1:

- `event_correction`
- `identity_merge`
- `identity_split`
- `commander_result_correction`
- `commander_assignment_correction`

Out of scope / removed request types:

- `steam_link`
- profile claiming
- player-account/profile ownership flows
- public request journal
- `player_presence_correction`
- player removal from replay in v1

Request statuses:

- `open`
- `needs_info`
- `accepted`
- `rejected`
- `withdrawn`

Request list visibility:

- Unauthenticated visitors see no request list; they only see login/create-request
  entry points.
- Authenticated authors see only their own request list and request details.
- Moderators/admins see the full moderation queue.

Request creation entry points:

- Replay detail: report/correct a specific kill/teamkill event or commander
  assignment/result.
- Player profile: identity merge/split.
- General "Submit correction" flow is a fallback with replay/player search, not
  the primary path.

Common request fields:

- `id`
- `type`
- `status`
- `authorDiscordUserId`
- `createdAt`
- `updatedAt`
- `resolvedAt?`
- `resolvedByDiscordUserId?`
- type-specific payload
- private comments/audit records

Request payloads and attachments are never public. A user can see their own
submitted payload, their own attachments, public-safe status history, generic
status copy, and final outcome only when authenticated through Discord and only
for their own request. Moderator notes/comments and staff-added evidence are
staff-only. Staff can see the full moderation queue.

Accepted request application, correction provenance, and recalculation behavior
are defined in
[Correction Ledger And Recalculation Decisions](CORRECTION-LEDGER-RECALCULATION-DECISIONS.md).

## Replay-Scoped Requests

Replay lookup rules:

- Creation may start from an `sg.zone` replay URL, replay slug, source replay id,
  or existing Solid Stats `replayId`.
- The backend resolves that input to an existing canonical `replayId` before
  creating a request.
- If the replay does not exist, do not create a request; ask the user to check
  the link or contact administration.
- If the replay exists but parser events are not ready, do not create a request;
  ask the user to wait and retry.
- For existing-event corrections, users select an existing `eventId`; `timing`
  is not collected.
- `timing` exists only when creating a new event.

Replay-local player references:

- Event and commander-assignment payloads use replay-local
  `replayPlayerRef`, backed by parser `eid` / `source_entity_id` /
  `observed_player_ref`.
- Store `nicknameSnapshot` alongside `replayPlayerRef` for display and audit.
- Do not use `canonicalPlayerId` for replay-scoped event actor selection.
- Do not use nickname text as the stable key. Nickname is display context, not
  an identifier.

`event_correction` payload:

- `replayId` - required, resolved before request creation.
- `action` - one of:
  - `remove`
  - `mark_as_kill`
  - `mark_as_teamkill`
  - `change_killer`
  - `change_victim`
  - `add`
- `eventId` - required for every action except `add`.
- `reason` - required.
- `attachments[]?` - optional and private.
- `killer?` - `{ replayPlayerRef, nicknameSnapshot }`, required for
  `change_killer` and `add`.
- `victim?` - `{ replayPlayerRef, nicknameSnapshot }`, required for
  `change_victim` and `add`.
- `eventType?` - `kill` or `teamkill`, required for `add`.
- `timing?` - required only for `add`.

New-event corrections require `action = add`, `eventType`, `timing`, `killer`,
and `victim`. The moderator must explicitly confirm creation of the new event
before accepting.

`commander_result_correction` payload:

- `replayId` - required, resolved before request creation.
- `winnerSide` - required and must differ from the current replay result.
- `reason` - required.
- `attachments[]?` - optional and private.

The UI should offer only sides present in the replay and should not offer the
current winner as a selectable correction.

`commander_assignment_correction` payload:

- `replayId` - required, resolved before request creation.
- `commander` - required `{ replayPlayerRef, nicknameSnapshot }`.
- `side?` - allowed only when the selected replay-local player has unknown or
  missing side.
- `reason` - required.
- `attachments[]?` - optional and private.

If the selected player has a known side in the replay, the backend derives the
commander side and rejects an explicit `side`. If the selected player's side is
unknown or missing, `side` is required and must be one of the known replay
sides, not `unknown`.

## Identity Requests

`identity_merge` payload:

- `sgZoneProfileUrl` - required.
- `fromNickname` - required.
- `toNickname` - required.
- `changedAt?` - optional user hypothesis.
- `description?` - optional.

There is no `reason` and no attachments. One request represents exactly one
nickname change. If the UI lets a user enter several nicknames, the backend
creates one `identity_merge` request per adjacent nickname change.

Before accepting, a moderator must set the final `changedAt`. Moderators can
edit nicknames and date during review. Diagnostics should recompute whenever
nicknames or date change and show relevant conflicts:

- `fromNickname` has games after selected `changedAt`;
- `toNickname` has games before selected `changedAt`;
- both nicknames appear in the same replay;
- suggested boundary dates from first/last replay appearances.

`identity_split` payload:

- `sgZoneProfileUrl` - required.
- `canonicalPlayerId` - required from a canonical player ComboBox.
- `nicknameSnapshot` - required for readability and audit.
- `splitAtDate` - required.
- `description?` - optional.

There is no `reason` and no attachments. This splits one canonical player into
two canonical players by date. The same displayed nickname may then belong to
different canonical player ids in different non-overlapping replay date windows.
Moderators can edit the selected player and date before accepting.

## Status, Retention, And Roles

Status rules:

- The author can withdraw only `open` or `needs_info` requests.
- Staff can resolve any non-final request.
- `accepted`, `rejected`, and `withdrawn` are final from the author's point of
  view.
- Reversing an accepted/rejected correction is a staff follow-up action or a new
  request; do not reopen final requests as an ordinary user workflow.

`needs_info` workflow:

- v1 does not include an in-app request chat.
- The moderator manually sets `needs_info` when external clarification is
  required.
- The status-change UI shows the request author's Discord contact card and a
  best-effort Discord profile/deep link. This link is convenience only; Discord
  OAuth `identify` does not guarantee DM delivery.
- The moderator must write an internal note describing what needs
  clarification.
- The author sees generic `needs_info` status copy and the responsible
  moderator's best-effort Discord profile link, not the moderator's internal
  note.
- Clarification happens outside the product through Discord.
- After Discord follow-up, staff may add private attachments or links to the
  request audit context.
- Staff manually returns the request to work after clarification.

Attachment retention:

- Author-supplied attachments are visible to the author and staff.
- Staff-added attachments and links are staff-only.
- Keep attachments while a request is non-final.
- After final resolution, retain binary attachments for 90 days.
- Keep structured moderation actions/audit records indefinitely; do not keep
  binary evidence forever by default.

Discord identity retention:

- Store Discord user id as the stable request-author/staff identifier.
- Display name/avatar are cached snapshots only and may be refreshed.
- Never expose Discord identity publicly.
- Retain request author id with the structured request/audit record
  indefinitely so moderation history remains accountable.

Author-visible request history:

- statuses;
- submitted payload;
- author-supplied attachments;
- generic `needs_info` copy when applicable;
- final outcome;
- responsible moderator Discord profile link when applicable.

Staff-visible request history additionally includes:

- moderator internal notes/comments;
- staff-added private attachments and links;
- full moderation audit timeline;
- linked correction operation and recalculation status chain when applicable.

Roles:

- Authenticated Discord user: create requests and view their own request
  payload, author-supplied attachments, public-safe status history, and final
  outcome.
- Moderator: view all requests and resolve correction requests, including
  `identity_merge` and `identity_split`.
- Admin: manage roles, system settings, and destructive/reversal operations.

Admin bootstrap:

- Replace Steam-based bootstrap with `BOOTSTRAP_ADMIN_DISCORD_ID`.
- The matching Discord user receives the initial admin role.
- After bootstrap, admins manage roles through the admin UI/API.

Discord OAuth scope:

- Request only the minimal `identify` scope by default.
- Do not request email, guild membership, or guild-role scopes unless a future
  product decision explicitly needs them.
- Solid Stats roles are internal roles, not derived automatically from Discord
  server roles in v1.

## Obsolete Product Surfaces

Dead or obsolete product surfaces from older docs:

- Steam auth as a player-facing login.
- SteamID-to-player linking.
- `steam_link` / `link_steam` request types.
- Public anonymous request submission.
- Public moderation/request journal.
- `player_steam_ids` as a meaningful matching mechanism.
- Old correction request types:
  - `kill_correction`
  - `teamkill_correction`
  - `victim_correction`
  - `identity_merge_split`
  - `commander_side_result`

Future request/auth specs need a cleanup pass before implementation because the
player-auth model changed substantially.
