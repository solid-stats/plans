# Parity Baseline — Findings Register

**Created:** 2026-06-13
**Status:** **SG parity resolved & verified on staging (2026-06-15).** Residual F9/F5/coverage open; F14 → v4.

> **Phase 0 Track 3 — RESULT (verified on staging 2026-06-15).** All SG axes closed to the
> coverage residual: games −1.5%, kills −1.1%, **deaths −1.4% (was −13%)**, players −0.3%; among
> players whose games match exactly, deaths now match **99%** (was 63%, all-down). Three fixes
> merged to `server-2` master + deployed (image `e31b1297`) + recalc'd:
> **F12** `replay_timestamp` backfill from `source_replay_id` (PR #16);
> **F13a** one-life deaths cap, ≤1/game (PR #17);
> **deaths-counter from `raw_snapshot`** (PR #21) — root cause: the bulk full-run recalc read the
> death counter from a **stale `parser_events` table** (no `player_counter` rows for ~90% of sg
> replays), so counter-only deaths (null-killer/suicide/env) were dropped; fix reads from the
> authoritative `raw_snapshot`.
> **F13b dropped** (victim-gating refuted: unknown_deaths only 178). **F14 → v4** (no persistent
> player UID exists/will exist — SteamID-in-replays rejected; name-change admin is the v4 vehicle).
> PR #20 was closed (it had reverted the Sentry feature #19).
> Full detail: `.parity-evidence/parity-baseline-20260613/PARITY-RESULT.md`.
> **Remaining open:** **F9** (apply legacy include/exclude/excludePlayers config), **F5**
> (orphaned `published` parse_jobs reconciler), replay-coverage gap (~34 sg replays new 2064 vs
> legacy 2098). The individual F12/F13a rows below predate this verification — treat this block as
> authoritative for their final state.

Durable register of everything that must be fixed before the **post-refactor
re-parity** (RELEASE-PLAN Phase 3). Findings are collected during the Phase 0
Track 3 baseline run, reviewed in Phase 1, folded into the Phase 2 per-repo
refactor (not fixed in isolation), and verified clean in Phase 3.

See [RELEASE-PLAN.md](RELEASE-PLAN.md) (Phases 0–3) and
[CUTOVER-MODEL.md](CUTOVER-MODEL.md) (what the diff can/can't assert).

## How a finding flows

```
Phase 0 baseline run ─→ recorded here ─→ Phase 1 human review
   ─→ routed into the owning repo's .planning/ (GSD picks it up)
   ─→ fixed inside that repo's Phase 2 refactor
   ─→ Phase 3 re-parity confirms it resolved (no regression)
```

Each finding is also mirrored into the owning repo's `.planning/` when that
repo's Phase 2 refactor is planned — this file is the cross-project index, the
repo `.planning/` is where the fix is executed.

## Two finding categories

- **A — Engineering / operational** — defects and scaling limits surfaced by
  *running* the baseline (pipeline, infra, ops). Available now.
- **B — Parity value findings** — old-vs-new statistic divergences from the diff
  (`strict_failures` vs `allowlisted_known_differences`). Available only after
  the diff runs (task 4 + Phase 1 review). Placeholder below.

---

## A. Engineering / operational findings

| ID | Finding | Owner repo | Severity | Status | Fix / action | Target phase |
|----|---------|-----------|----------|--------|--------------|--------------|
| F1 | Checkpoint write used conditional PUT (`If-Match`/`If-None-Match`); Timeweb S3 doesn't implement it → every checkpoint write failed → resume silently restarted from page 1. | `replays-fetcher` | 🔴 high | **Resolved** — merged into Track C (merge `d980aa8`; from branch `fix/fetcher-checkpoint-resume`/`7e5ca97`). Flag `S3_CHECKPOINT_CONDITIONAL_WRITES` + swallowed error now logged. verify green, 100% cov. Live baseline runs `7e5ca97`. | Done. |
| F2 | Source classifier maps fetch timeout (`AbortError`) and unrecognised transport errors to `permanent` → kills the run instead of retrying. `permanent` is never retried, so `REPLAY_SOURCE_RETRY_ATTEMPTS` doesn't help these. | `replays-fetcher` | 🟠 med | **Resolved** — Track C `3bea3dc`: `classify-failure.ts` maps `AbortError`/`TimeoutError` → `transient` (timed-out detail page retries; internal AbortController kept distinct from caller cancel). Unit-tested, verify green. Not in the live baseline image (`7e5ca97`); operational tuning covers the run. | Done. |
| F3 | `ops:stats:recalculate` / `statistics-readiness` load the whole corpus into memory → OOM at the 1Gi server-2 pod (heap-limit 134 at ~568 MB; container-limit 137 above 1Gi). Completed only at a 6Gi probe pod. Memory grows with corpus → won't scale to ~23k. | `server-2` | 🟠 med | **Measured** — recalc (dry-run + real) completes at a **2Gi** limit / 1.8Gi heap on the full 23.5k corpus; the "~8Gi" estimate was too high. Fits the node's ~2.4Gi headroom — **no maintenance window needed**. Still OOMs in the 1Gi app pod. | (1) Parity recalc runs as a one-off 2Gi Job (done — fits). (2) Streaming/batched recalculation in the server-2 Phase 2 refactor for long-term scale. |
| F7 | `recalculate-statistics` is **algorithmically infeasible for the full corpus.** With the 20 legacy rotations in place, observed throughput was **~2 replays/min → ETA ~5 days** for 23.5k. CPU near-idle (94m) — not CPU-bound; it appears to recompute a rotation's *entire* aggregate on each added replay (O(n²) within a rotation), which explodes as seasons fill (R11 = 3710 replays). Distinct from F3 (memory). | `server-2` | 🔴 high — **blocks the full-corpus new-side baseline** | Open — measured 2026-06-14 with all 20 rotations present. Killed the run at ~70/23556. | server-2 Phase 2: **batch/set-based recalculation** (rebuild each rotation once via SQL, not per-replay). **Resolved** — (1) rotation-level set-based (master `6eab23e`/`2930f10`, O(n²)→O(n)); (2) per-player canonical-id resolution set-based (PR #11 `c334f45`, ≤3 statements/rotation); (3) big-bucket `unnest…where exists` made index-sargable + O(1) identity Map + batch inserts (PR #13 `640724f`, migration `0010`). 7 rotations in 45s; mace all-time (20.7k) fits. | Phase 2 |
| F8 | **Statistics are not game-type-aware.** Legacy computes stats per game type (`sg`/`mace`/`sm`) by `mission_name` prefix; the new system aggregates **all mission types into one bucket**. New corpus by type: **mace 20735, sg 2056, sm 253, other 511**; legacy `sg`=2098 games ≈ new sg=2056 (**sg coverage parity is excellent once type-filtered**), but current aggregates are 88% mace → not comparable to legacy per-type. | `server-2` | 🔴 high — **blocks per-type parity** | **Landed** — PR #12 `ebdc4ea`: persisted `replays.game_type` (sg/mace/sm; NULL=excluded), per-type aggregation (sg per-rotation+all-time, mace/sm all-time), legacy spec ported (prefix + `!sgs`, sm month-granular exclusion, mace `<10`, `filterByTotalPlayedGames`→`is_show`), **F9 include/exclude folded in**. Two deploy-blocking bugs surfaced & handled: F10, F11. | Classify each replay by `mission_name` prefix (sg/mace/sm; else excluded); compute stats **per type** — `sg` per-rotation (20) + all-time, `mace`/`sm` all-time only. Spec = legacy `sg-replay-parser`. | Phase 2 |
| F9 | New system doesn't apply legacy `config/includeReplays.json` (3 force-included sg games by name) / `excludeReplays.json` (16 dropped replays). The 16 excluded cluster in the only two sg coverage outliers — **R16 (+175 players = 4 excluded games), R07 (+101 = 1)** — and explain the small sg gap (new 2068 vs legacy 2098). | `server-2` | 🟡 low-med | Open — confirmed 2026-06-14 (excluded ids found in new DB cluster in R07/R16). | Apply the legacy include/exclude list in the game-type-aware aggregation (F8). | Phase 2 |
| F6 | **New-side parity stats need an operator-defined rotation covering the corpus.** Stats compute per-rotation; `recalculate` skips replays whose `replay_timestamp` matches no rotation (`missing_rotation`) — 23526/23556 skipped (only the pre-existing 30-replay `2026-05` rotation matched). `legacy-public-export` is also rotation-grouped → new-side export is near-empty (498 players) until rotation(s) exist. Rotations are **manual** (admin API `POST /admin/rotations` or DB), not auto-derived from replay metadata. **Grouping mismatch:** legacy `sg_stats` = all-time per player per mode (sg/mace/sm); new-side = per time-window rotation. | `server-2` / **parity methodology** | 🔴 high — blocks the new-side baseline | **Blocked, needs operator decision.** I attempted a single all-time rotation (widen the existing one, 2021→open) to get a comparable all-time bucket; the shared-DB mutation was safety-gated (correctly — it's a methodology choice, not run-keeping). Left for the operator. Dry-run coverage confirms readiness: 23555 parser_results, missingIdentity 2, all `stale`, recalc fits ~2Gi. | Decide the parity rotation model (single all-time ≈ legacy all-time? or mirror legacy mode buckets?), define rotation(s), re-run `recalculate` → `legacy-export`. Phase 1 review. |
| F5 | `parse_jobs` stuck in `published` are never recovered — no reconciler re-publishes a published job that never returns a result (attempts stays 1, queue empty). **75 orphaned, oldest 33 days** (pre-existing — most predate tonight's run; not a regression). Likely trigger: parser acks/loses an in-flight message on restart → job orphaned. | `server-2` (+ `replay-parser-2` ack semantics) | 🟠 med | Open — surfaced 2026-06-13; survived a server-2 restart, confirming no startup reconcile. | (1) server-2: reconciler to re-publish `published` jobs stale past a timeout. (2) parser: ack only after the result is persisted (at-least-once). Fold into Phase 2. **Baseline impact:** 75/23556 (0.3%) coverage gap — documented, surfaces as `strict_failures`/missing in the diff. | Phase 2 |
| F4 | Staging fetcher resilience tuning applied **live only** (not committed): `REPLAY_SOURCE_CONCURRENCY=2`, `REPLAY_SOURCE_TIMEOUT_MS=60000`, `REPLAY_SOURCE_RETRY_ATTEMPTS=8`, `REPLAY_SOURCE_REQUEST_SPACING_MS=500`, job `backoffLimit=30`. | `infrastructure` | 🔵 low | **Resolved** — baked into `50-replays-fetcher.yaml` + committed (infra `03f557a`); `kubectl diff` vs live is a functional no-op, `apply` no longer reverts. | Done. (sg.zone detail pages remain the real bottleneck — slow, degrade under concurrency.) |
| F10 | F8 game-type classification excluded **everything**: `extractMissionName` read `replay[key]` only when `typeof === "string"`, but the parser artifact wraps every replay field in a `{state:"present",value}` envelope → `mission_name` is an object → returns null → all replays classified excluded → `game_type` all NULL, zero aggregates (recalc "completed" with `changedAggregateRows: 0`). | `server-2` | 🔴 high — blocked the per-type recalc | **Resolved** — PR #14 `87e615e`: `extractMissionName` reads snake_case `mission_name` + unwraps the present/value envelope; enveloped + `{state:"absent"}` unit cases added; real-pg seeds converted to the enveloped shape. Same envelope bug also in `public-stats/replay-mapper.ts` `extractMapName` (map label empty on live data — display-only, not in the diff) — tracked separately by server-2. | Phase 2 |
| F11 | After F10, the full recalc **crashed** on the all-time bucket: `uniqueNameOccurrences` does `row.replay_timestamp.toISOString()` and `scopedCurrentResultsSql` loaded the **1101 replays with NULL `replay_timestamp`** into the all-time scope → `TypeError: Cannot read properties of null`. (Classification itself worked — game_type populated: mace 16149, sg 2064, sm 253, NULL 5090 incl. mace<10-players + no-timestamp.) | `server-2` | 🔴 high — blocked the per-type recalc | **In progress** — fix on branch `fix/recalc-null-timestamp-guard` / PR #15: `scopedCurrentResultsSql` adds `and r.replay_timestamp is not null` (full-run + audit paths skip them; they're already reported `missing_replay_timestamp`) + real-pg regression test. Being finalized through GSD-quick + server-2 skills (subagent). | Phase 2 |
| F12 | **NULL `replay_timestamp` excluded from the all-time bucket — the dominant SG per-player parity driver.** (The original "parser connect-event gating" mechanism was **disproven on staging data** — the parser does NOT undercount: Zero's qualified roster = **894** sg replays vs legacy 890.) Real cause: **187 of 2064 sg replays (9%, all early — 2020-11-27 … 2021-11-05) have `replay_timestamp = NULL`**; the all-time recalc scope (`scopedCurrentResultsSql`, **after the F11 guard** `and r.replay_timestamp is not null`) excludes them, so every player loses those games + the kills/deaths in them. Proven on Zero: roster 894 = 831 with-ts + 63 null-ts → `player_stats` all-time games = exactly **831** (= legacy 890 − the null-ts cohort). Tie-out: the null-ts cohort carries **37242 of the 37396** lost games (**~99%**), ~97% of the kills gap, ~78% of the deaths gap. The date is **fully recoverable** — all 187 carry the sg.zone Unix epoch in `source_replay_id` (e.g. `sg-zone-1624129684`); the parser artifact's `replay` block carries no date, and the with-ts replays got their timestamp from a non-epoch source the early ones lacked. Same theme as F6/F11. | `server-2` (ingest/timestamp derivation) | 🔴 high — **dominant SG gap (~99% of games delta)** | Open — root-caused on staging 2026-06-14 (DB-verified; supersedes the workflow's parser-gating hypothesis). | **Backfill `replay_timestamp` from `source_replay_id` (Unix epoch) for null-ts replays** → they re-enter both rotation and all-time buckets (also resolves the F11 crash path properly, not by exclusion). No parser change, no semantic choice. Then re-run recalc. | Phase 2 |
| F13 | **deaths.total computation divergence** (was B.4a). Two independent sub-effects, both verified. **(a) Counting model:** legacy = *games-died-in* (`calculateDeaths.ts:7-25` adds **max 1/game** on a boolean `isDead` set true on **any** `killed` event incl. `killInfo[0]==='null'`, OR-combined across slots); new = *death-EVENTS, uncapped* (`raw.rs:179-183` one obs/tuple, `aggregates.rs` `deaths+=1` per obs, `service.ts:346-352` sums per replay with no cap) → new is **higher** on multi-death respawn games (83 up-cases, e.g. Villain g2 d2→7). **(b) Victim-entity gating (net-lower driver):** a `killed` event whose victim isn't a normalized `is_legacy_player_entity` → `UnknownPlayerDeath`/`NoStats`, excluded from `d` (`aggregates.rs:107-111,388-394`), whereas legacy credits any known-player victim. Net: deaths −13.4% (worst axis, 47% exact); on 1050 byte-identical kills+games players deaths still differ (967 down/83 up, Σ −2189 pure computation delta); −8803 deaths beyond what coverage explains. (Adversarial check **refuted** an earlier "null-killer skip" theory — null-killer + suicide deaths *are* counted via the `PlayerDeath` path; the skip at `aggregates.rs:92-94` is dead code on the `PlayerKill` arm.) | `replay-parser-2` + `server-2` | 🔴 high | Open — quantified & verified 2026-06-14. | **DECIDED 2026-06-14 → match legacy (cap 1 death/game).** Rationale: **all Solid Games are one-life by design**, so >1 death/game is impossible — per-event would count incap/revive artifacts (e.g. ACE down-and-revive: Demot d=9 on one entity) + duplicate `killed` events as deaths. Data confirms no respawn missions exist (even worst replay avg ≈1.02 deaths/player; d≥2 = ~0.4% of death-rows, spread thin). **Two fixes:** (1) cap in server-2 aggregation — per replay, `deaths.total += (d>0?1:0)` and `byTeamkills += (td>0?1:0)` (cap **both** consistently); keep the parser's raw uncapped `d`/`td`/`nkd`/`su` in the artifact (don't touch the versioned contract). (2) **victim-gating** (model-independent bug): a `killed` event whose victim isn't a normalized `is_legacy_player_entity` → `UnknownPlayerDeath`, dropped (`aggregates.rs:107-111,388-394`); relax so any known-player victim counts a death even with unresolved/missing killer — else SG deaths stay under legacy even with the cap. | Phase 2 |
| F14 | **Identity: new stack never applies `nameChanges.csv`** (was B.4b — and **reclassified from dominant to minor for SG**). Legacy keys by `getPlayerId(lower(strippedName), gameDate)` with time-aware accepted-rename windows → 35/4451 sg players carry merged UUID ids. New keys by raw (lowercased, prefix-stripped) name; `nameChanges.csv` / `excludePlayers.json` appear **nowhere** in `server-2`/`replay-parser-2`/`web`; the only auto identity writer mints one `canonical_players` row per distinct lower(name) with an open nickname window, so the steam-id / time-window match branches never fire unattended. **Proof it's a pure re-partition, not data loss:** Nova chain sums to **285 kills / 331 games on both sides** (legacy 2 UUID rows vs new 3 raw-name rows). **Quantified:** porting nameChanges recovers only **~13% of the SG kills gap** (kills Δ −31424 → −27202), **~13% games**, **~10% deaths** — the 3990 ungrouped same-name players already carry ~84-87% of the gap (that's F12+F13). Bigger for mace (57% of kills gap). | `server-2` | 🟠 med — **necessary for correctness, minor for SG totals** | Open — verified 2026-06-14. **Product direction set:** becomes a first-class **name-change-request domain entity + admin panel** (retire the Google Form), not a CSV port — the moderation merge/split machinery already exists (`requests/routes/workflow-applier.ts`). **No persistent player UID exists or will exist** (SteamID-in-replays was rejected), so the server-2 `player_steam_ids` table + STEAM_ID match priority are dead weight and the only viable anchor is the legacy **old-nick → new-nick + change-date** time-aware model (`getPlayerId`) — exactly what the form captured, moved in-app. **DEFERRED to v4** (with the identity refactor that removes the dead steam layer) — only ~13% of the SG gap, it's a feature not a bugfix. Carried as an **allowlisted known-difference** for the parity sign-off (pure re-partition, not data loss → does not block Phase 3). | **v4** (identity refactor) |

Notes:
- F1 + F2 are the same root theme as the brief's "full-corpus ingest resilience":
  errors silently swallowed / mis-classified. F1's swallowed-error logging was
  also fixed (`run-once` now logs the checkpoint error).
- F3 is the parity blocker to watch — the final recalculate (task 4) must be
  memory-provisioned regardless of whether the streaming refactor lands first.

## B. Parity value findings

Per [CUTOVER-MODEL.md](CUTOVER-MODEL.md) the diff is `review_required`: coverage/
integrity regressions are auto-caught; value differences are human-reviewed.

### B.1 Preliminary parity (computed directly from `parser_results`/`parser_events`, type-filtered — no server-2 recalc)

Full report: `.parity-evidence/parity-baseline-20260613/COVERAGE-PARITY.md`.
The new corpus is **88% mace** (20735), 9% sg (2056), 1% sm (253), 2% other (497,
excluded). **Parity reproduces legacy closely per game type:**

| Type | Coverage (legacy games vs new replays) | Players (legacy → new) | Kills (legacy → new) | Teamkills |
|------|---|---|---|---|
| **sg** | 2098 vs **2068** (−1.4%) | 4451 → 4734 (+6.4%) | 269316 → 266202 (**−1.2%**) | 16238 → 16048 (−1.2%) |
| **mace** | — | 6355 → 6425 (+1.1%) | 255783 → 270321 (+5.7%) | 20868 → 21635 (+3.7%) |
| **sm** | — | 2565 → 2599 (+1.3%) | 19089 → 19028 (**−0.3%**) | 1521 → 1517 (−0.3%) |

- **sg per-rotation game counts match ~1:1** across all 20 rotations (Δ 0..±4).
- New player counts run slightly higher (legacy applies `filterPlayersByTotalPlayedGames`).
- **mace +5.7% kills:** legacy `mace <10-players` rule drops small games (new now ports it via F8).
- **Verdict:** the redesign tracks legacy aggregates within ~1–6% per type — strong.

### B.2 Coverage outliers — root-caused

- sg **R16 (+175 players)** and **R07 (+101)**: legacy `excludeReplays.json` (16 replays) not applied
  → **F9** (now folded into F8). Should close after the F8 recalc.

### B.3 Per-player value diff — pending

**Done** (2026-06-14) — after F8/F10/F11, the full recalc built the per-type buckets
(`changedAggregateRows 48938`, failures 0). Per-player diff computed from `player_stats`
(all-time, per type) vs legacy `global_statistics.json`, aligned by name. Full report:
`.parity-evidence/parity-baseline-20260613/PER-PLAYER-DIFF.md`. (The production diff **runner**
+ **allowlist** still don't exist — only the `old-vs-new-diff.v1` contract; this is an ad-hoc diff.)

### B.4 Per-player diff results (all-time, per type)

Exact-match rate, matched-by-name players:

| metric | sg | mace | sm |
|---|---|---|---|
| kills | 80% | 92% | 98% |
| teamkills | 88% | 96% | 99% |
| deaths.total | **47%** | 56% | 78% |
| games | 72% | 86% | 95% |

Players: sg 4449→4071 (matched 4028, missing 421, extra 43); mace 6353→6121; sm 2565→2599.

**Combat stats (kills/teamkills) reproduce legacy strongly.** The original read of these results
(identity as the dominant driver) was **wrong and is corrected in B.5** below.

### B.5 SG gap decomposition — root-caused & adversarially verified (2026-06-14)

Workflow `sg-parity-rootcause` (4 investigators → adversarial verify → synthesis) decomposed the
SG per-player gap. **Headline: identity is the *minor* driver; the gap is overwhelmingly a parser
coverage + deaths-computation residual**, both making the new stack systematically lower.

| Effect | Kills Δ | Games Δ | Deaths Δ | Recoverable by nameChanges port? | Finding |
|---|---|---|---|---|---|
| **Total (before any fix)** | −31424 | −42832 | −43302 | — | — |
| **Identity merge** (port nameChanges) | recovers +4222 (**13.4%**) | +5436 (12.7%) | +4336 (10.0%) | ✅ | **F14** |
| **Coverage + deaths residual** (remains) | **−27202 (86.6%)** | **−37396 (87.3%)** | **−38966 (90.0%)** | ❌ parser/server fixes | **F12 + F13** |

- **Proven on `Zero`** (no name change): kills near-exact (−1), but games **−59** / deaths **−78** —
  identity-independent. The 3990 same-name SG players carry ~84-87% of the whole gap by themselves.
- **kills** is the clean axis (81% exact; drops only as a side-effect of lost games).
- **Mechanism — corrected by staging-DB verification (2026-06-14):** the "coverage" bulk is **not**
  parser entity-gating (the workflow's hypothesis). It is **F12 = 187 sg replays (9%) with NULL
  `replay_timestamp`** excluded from the all-time bucket (the parser roster is complete — Zero 894 ≥
  legacy 890). This single cause = ~99% of the games gap, ~97% kills, ~78% deaths, and is fixed by a
  `replay_timestamp` backfill (no parser change). **F13 (deaths-computation)** is the genuine,
  smaller residual (~8600 deaths beyond coverage: per-event-vs-per-game cap + victim-gating).
  **F12 lands first** (recovers games/kills/most deaths); **F13** is a bounded deaths-model decision;
  **F14 (identity)** re-partitions rows and moves SG totals least (~13%).
- Per-type recovery from the nameChanges port: SG kills 13%, **mace 57%**, sm 92% (sm gap was tiny).
- Full analysis + ranked fix list + verifications: workflow output (run `wf_4ca1c047-1c6`). The
  workflow's parser-gating mechanism for F12 was **superseded** by direct DB root-causing (null
  `replay_timestamp`); the numbers/decomposition it produced were independently re-verified and hold.
  The earlier `PER-PLAYER-DIFF.md` verdict is superseded by this decomposition.

## Evidence locations

- Legacy snapshot + checksums + manifest: parity-evidence workspace
  (`parity-baseline-20260613/legacy-snapshot/`) — to be uploaded to S3
  `runs/` evidence prefix for durability.
- Full-run job logs / run summaries: server-2 evidence prefix `runs/<runId>/`.
- New-side export (`legacy-public-export.v1`): produced by
  `ops:stats:legacy-export --corpus-scope full-corpus` post-run.
