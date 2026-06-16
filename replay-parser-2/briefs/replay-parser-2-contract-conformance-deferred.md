# replay-parser-2 — Deferred Contract-Conformance (post-v1.1)

**Created:** 2026-06-16
**Application:** `replay-parser-2`
**Status:** DEFERRED out of milestone v1.1 (Skill-Conformance Refactor) — needs a coordinated
contract-version bump with `server-2`. Not started.

## Why deferred

v1.1 is **behavior-preserving**: it must not change the published parse-artifact bytes or the
committed JSON Schema (`server-2` consumes both; the §G schema-diff gate enforces it). The
`solidstats-parser-rust-conventions` items below are real conformance gaps, but each one changes the
JSON Schema (or creates an in-milestone rule conflict), so they cannot land inside a behavior-preserving
refactor. They belong in a later, **coordinated contract-version bump** done together with `server-2`
(schema regen + re-validation on its side).

Sizing source: `replay-parser-2/.planning/milestones/v1.1-SIZING.md` (divergence-hunt, 2026-06-16).
Convention source: `solidstats-parser-rust-conventions` §E/§G; ADR 0006.

## Deferred items

### 1. §E — contract-facing domain newtypes (~125 sites)
Wrap bare `String`/`i64`/`u64` domain ids and values on **`parser-contract`** types in newtypes
(`ReplayId`, `EntityId`, `Frame`, `Weapon`, `SteamId`, `event_id`, `fact_id`, `source_entity_id`, …).
- **Byte impact:** none (`#[serde(transparent)]` newtype serializes identically).
- **Schema impact:** YES — schemars emits a `$defs` indirection for each newtype, changing the
  committed JSON Schema → trips the schema-diff gate → `server-2` re-validates.
- Representative: `worker.rs:17-21` (job_id/replay_id/object_key), `minimal.rs:11` (source_entity_id),
  `events.rs:174` (event_id), `compact.rs:41` (fact_id).
- NOTE: the **core-internal** intermediate newtypes (types never serialized into the artifact) are
  NOT deferred — they are in v1.1 scope (P3), behavior-neutral.

### 2. §G — C-NEWTYPE-HIDE on artifact collection fields (3 fields)
`ParseArtifact` exposes raw `Vec` fields directly: `players: Vec<MinimalPlayerRow>`,
`weapons: Vec<MinimalWeaponRow>`, `destroyed_vehicles: Vec<MinimalDestroyedVehicleRow>`
(`artifact.rs:53/56/59`). Convention wants representation hidden behind a newtype (as `SourceRefs`
already does).
- **Byte impact:** none (transparent newtype). **Schema impact:** YES (schemars `$defs` shape change).
- Low value (gives `server-2` storage flexibility it hasn't asked for) — do only if the coordinated
  bump is happening anyway.

### 3. §G — `#[non_exhaustive]` on growing public enums (~22 enums)
Add `#[non_exhaustive]` to open-vocabulary enums (`NormalizedEventKind`, `BountyExclusionReason`,
`ParseStage`, `UnknownReason`, `EntitySide`, `KillClassification`, `OutcomeStatus`, …). Scope to
genuinely-growing vocabularies only — NOT closed 1-2-variant routing enums.
- **Byte impact:** none. **Schema impact:** none (Rust-only attribute; schemars output unchanged).
- Deferred NOT for behavior reasons but because: (a) it forces every Rust consumer `match` to add a
  `_` wildcard arm, which directly conflicts with the §E "no `_` wildcard over a closed enum" rule
  that v1.1 enforces — resolve that tension deliberately; (b) `parser-contract` has no external Rust
  consumers (`server-2` is TS/JSON), so the conformance value is internal/low. Fold into the
  contract review so the non_exhaustive-vs-exhaustive-match decision is made once.

## Prerequisite before doing this

Coordinate with `server-2`: a contract-version bump, acceptance of the regenerated JSON Schema
(schema-diff gate), and `server-2` re-validating / regenerating its schema-derived types. This is a
cross-app contract change, not a local parser refactor — follow the SolidStats cross-app
compatibility protocol.

## Sources
- `replay-parser-2/.planning/milestones/v1.1-SIZING.md` — full divergence sizing + in/out-of-scope split.
- `replay-parser-2/.planning/milestones/DEEP-BRAINSTORM.md` — v1.1 decision pack (non-goals).
- `solidstats-parser-rust-conventions` §E/§G; ADR 0006.
