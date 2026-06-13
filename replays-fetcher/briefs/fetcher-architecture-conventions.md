# replays-fetcher — Architecture & Conventions Skill (design proposal)

**Created:** 2026-06-13
**Application:** `replays-fetcher`
**Status:** DRAFT — Variant A (in-house proposal). To be compared against a deep-research
sweep of ingest/pipeline architecture practice, then converged before the skill is authored.

> **2026-06-14, night run:** superseded in part. The deep research ran, Variant A+B converged,
> the taxonomy was re-decided (V5), and the skills were drafted — see
> `plans/product/skills-taxonomy/` (start at `RECOMMENDATION.md`). The "Skill-split decision
> pack" section below is superseded where it conflicts with that folder (notably: the shared
> layer is named `solidstats-shared-backend-ts-standards`, and the fetcher review/tests
> siblings were created in the same pass).
**Why:** `solidstats-server-ts-conventions` is Fastify-module-shaped (`controller → usecase →
service → repository`, `src/modules/<feature>/`). It currently treats `replays-fetcher` as a
"shared baseline" exception, but its §A layering does not fit an ingest CLI pipeline
(`discovery / storage / staging / checkpoint / source / run`). The fetcher needs its own
conventions skill describing an architecture that actually fits.

## Decision — skill taxonomy & composition (confirmed)

Refactor the shared layer rather than duplicate:

- Extract the **stack-neutral** backend conventions — naming, the typed error system, async
  safety, logging, config/env discipline — out of `solidstats-server-ts-conventions` into a
  shared process-level skill (extend `solidstats-shared-ts-standards`, or a new
  `solidstats-shared-backend-ts-standards` sibling). Both backend and fetcher build on it.
- `solidstats-server-ts-conventions` keeps only the **Fastify/HTTP** architecture (§A module
  layout, controllers/routes, TypeBox, Kysely, queue) — server-2 only.
- New **`solidstats-fetcher-ts-conventions`** owns only the **ingest-pipeline architecture**
  (the §A replacement below) + fetcher-specific fences; inherits everything else from the
  shared layer. Code-review/tests siblings (`solidstats-fetcher-ts-*`) can follow later if
  wanted — out of scope for now.
- Rewire: drop the "replays-fetcher shared baseline" note from the backend skill's Scope; point
  the fetcher repo's project skill table + `skills-lock.json` at the new skill.

> The architecture content below is **not final** — it is the in-house variant to weigh against
> deep-research findings. The taxonomy/composition decision above is settled.

## Skill-split decision pack (2026-06-13)

Closed in a deep-brainstorm session. This pack governs the **split pass** (executed via
skill-creator) — skills are separated NOW; the fetcher architecture itself stays pending until
Variant A + B converge. Where this pack conflicts with the section above, the pack wins.

### Decisions

1. **Shared layer = new `solidstats-shared-backend-ts-standards`** (the "new sibling" option, not
   extending `solidstats-shared-ts-standards`). Meta skill like the other `process-*-standards`:
   read by stack skills, not triggered directly. Read chain:
   `*-conventions → process-backend-standards → process-ts-standards`.
2. **`solidstats-fetcher-ts-conventions` is created now, without architecture.** Spine: scope
   (replays-fetcher CLI; zod / commander / @aws-sdk/client-s3 / pg), hard-requires on the shared
   layer, the variant-independent AGENTS invariants (no replay parsing; write-scope isolation as a
   *semantic* rule — PostgreSQL writes = staging/outbox only, S3 writes = raw/checkpoint/evidence
   only; discovery is read-only; idempotency; auditable source evidence), Zod-form config/schema
   discipline, CLI error boundary. Explicit **"Architecture — PENDING (Variant A+B convergence)"**
   block pointing at this brief. Module-name-bound fences (which dir may import `pg`/S3) land with
   the architecture, not now.
3. **Fetcher review/tests siblings are created now** — supersedes the "can follow later — out of
   scope" line above. `solidstats-fetcher-ts-code-review` (hard-requires
   `solidstats-shared-review-standards` + fetcher conventions; CLI-shaped risk order: write-scope /
   no-parsing / idempotency first; layer-placement checks marked pending until architecture lands)
   and `solidstats-fetcher-ts-tests` (hard-requires `solidstats-shared-testing-standards`;
   testcontainers postgres + minio, no rabbitmq; CLI-entry coverage exclusions).
4. **Backend siblings narrow to server-2 only.** `solidstats-server-ts-conventions` drops the
   "replays-fetcher shared baseline" Scope note and the §B/cross-cutting content that moves to the
   shared layer; `solidstats-server-ts-code-review` drops its CLI scope note and gets its
   `[conv: …]` citations re-pointed at the new section homes; `solidstats-server-ts-tests` drops
   its fetcher note.
5. **Repo-wide updates in `skills`:** AGENTS.md naming-convention scope list gains `fetcher`;
   README catalog gains the four new skills and updated descriptions for the three changed ones;
   every touched skill gets a CHANGELOG entry.
6. **Consuming repos rewired:** `replays-fetcher` skills-lock.json + project skill table swap the
   backend trio for the fetcher trio + `solidstats-shared-backend-ts-standards`; `server-2`
   skills-lock.json adds `solidstats-shared-backend-ts-standards`.
7. **No eval batches** for this pass (content moves, it isn't rewritten). Verification instead:
   a rule-by-rule diff check — every rule in the pre-split skill has exactly one post-split home;
   nothing silently dropped.

### Section move map (verified against current content)

| Current location | Content | New home |
|---|---|---|
| SKILL §A + `layers.md` | Fastify module layout, 4 layers, DI | stays backend |
| SKILL §B | naming, factory contracts, identifiers (`steamId64`, `jobId`) | → process-backend-standards |
| `schemas-and-data.md` → Error system | typed hierarchy, snake_case codes, cause chains, domain vs `ExternalServiceError` taxonomy → shared; HTTP status table, `setErrorHandler`, response envelope → stays backend | split |
| `schemas-and-data.md` → TypeBox | [HTTP] | stays backend (tool-neutral "derive types from schema, bound every field" → shared; Zod form → fetcher skill) |
| `schemas-and-data.md` → Kysely, migrations, transactions | server-2 (fetcher uses raw `pg`) | stays backend |
| `schemas-and-data.md` → Enums & constants | stack-neutral | → process-backend-standards |
| `schemas-and-data.md` → Filters & pagination | HTTP/Kysely | stays backend |
| `schemas-and-data.md` → Config/env | discipline (validate once at boot, no scattered `process.env`, no `NODE_ENV` branching, no top-level reads, no hardcoded secrets) → shared; envalid + decorator → backend; Zod form → fetcher | split |
| `correctness.md` → External HTTP adapters | taxonomy + singleton client + upstream logging → shared; 502 mapping → backend | split |
| `correctness.md` → Async safety | event loop, N+1, floating promises, timeouts/AbortSignal | → process-backend-standards |
| `correctness.md` → Security depth (IDOR, mass assignment) | HTTP | stays backend |
| `correctness.md` → Security & runtime hardening | rate-limit/helmet/CORS/bodyLimit → backend; graceful-shutdown principle → shared (Fastify `app.close()` specifics → backend) | split |
| `correctness.md` → Queue reliability | RabbitMQ consumer discipline | stays backend |
| `correctness.md` → LSP, SOLID, DRY, utility libraries (es-toolkit/type-fest/dayjs/nanoid), schema quality (tool-neutral part) | stack-neutral | → process-backend-standards |
| `correctness.md` → §Z / §AA / §AB | observability, log diagnosability, resource lifecycle — shared, with per-stack "boundary" notes (backend: Fastify req-log + error handler; fetcher: CLI top-level handler + run summary; prom-client/health line → backend) | → process-backend-standards |
| `correctness.md` → Code-quality bugs, comments, imports | stack-neutral | → process-backend-standards |

### Deferred (explicit)

- **Fetcher architecture** (Variant A vs deep-research Variant B) — pending; after convergence:
  fill the architecture section in fetcher conventions, enable layer checks in the fetcher
  reviewer, ship the depcruise boundary preset.
- **depcruise `forbidden` preset** — lands with the architecture, not in this pass.
- Stage-taxonomy question and `check/ contract-check/` placement — architecture questions, deferred.

## Proposed architecture — Variant A (ingest pipeline)

Grounded in the `replays-fetcher` AGENTS hard rules (no parsing; S3-raw + staging/outbox writes
only; never touch server-2 business tables; idempotent; auditable source evidence; identity =
checksum + source identity) and the current module reality.

### Layers (top-down — dependencies point downward only)

| Layer | Holds today | Responsibility | May depend on |
|-------|-------------|----------------|---------------|
| **Command** | `cli.ts` | `commander` commands (`check`, `discover`, `run-once`, `contract-check`): parse args, load + validate config, assemble dependencies, dispatch to an orchestrator. No ingest logic. | Orchestration |
| **Orchestration** | `run/` | One ingest cycle: discover → fetch bytes → store raw → write staging/evidence, with checkpoint/resume and a run summary. Owns sequencing, pacing, and the idempotency boundary. (The fetcher's "usecase".) | Capabilities, Cross-cutting |
| **Capability** | `discovery/ storage/ staging/ checkpoint/ evidence/ contract-check/ check/` | One ingest job each: returns validated domain data, raises typed errors, delegates external I/O to its adapter. (The "service".) | own Adapter, Cross-cutting |
| **Adapter** | `*-client / *-store / *-storage / *-repository` (`source-client`, `s3-raw-storage`, `s3-checkpoint-store`, `s3-evidence-store`, `postgres-staging-repository`, `replay-byte-client`) | The only code that talks to S3 / PostgreSQL / the HTTP source. The write-scope boundary. (The "repository/adapter".) | Cross-cutting |
| **Cross-cutting** | `config.ts errors/ logging/ source/` | Config validation, typed error system, logger, and source-resilience primitives (retry/backoff/throttle/pacing/concurrency/classify-failure). Imported by any upper layer; imports none upward. (The "infra".) | — |

### Boundary fences (architecture rules → depcruise `forbidden`)

These encode the AGENTS invariants as enforceable import rules — the executable form of the
architecture, the same way vocalclub uses dependency-cruiser for layer boundaries:

1. **Downward-only.** `command → orchestration → capability → adapter`; a lower layer never
   imports an upper one. Cross-cutting imports nothing upward.
2. **No layer-skipping.** Command never imports an adapter/capability internal directly; it goes
   through orchestration. Orchestration composes capabilities, not raw clients.
3. **No replay parsing.** No module imports an OCAP parser / replay-content reader — parsing
   belongs to `replay-parser-2`. (`forbidden` on parser packages + any content-decode path.)
4. **Write-scope isolation.** Only `staging/` may import the PostgreSQL client; only
   `storage/ checkpoint/ evidence/` may import the S3 client. Keeps "S3-raw object + staging/
   outbox records only" — no business-table writes leak in via a stray `pg` import elsewhere.
5. **Discovery is read-only.** `discovery/` never imports `storage/` or `staging/`; it produces
   candidates, orchestration wires them to writers.
6. **Resilience is cross-cutting.** `source/` is imported by `discovery/`/`storage/` adapters,
   and never imports them back.

### Open question for Variant A

- Are `discovery/ storage/ staging/ checkpoint/ evidence/` true peer "capabilities", or should
  they nest under an explicit pipeline-stage taxonomy (e.g. `stage/discover`, `stage/fetch`,
  `stage/persist`)? Current flat layout works; a stage taxonomy would make the cycle's ordering
  legible in the tree but is a bigger move.
- Where does `contract-check/` and `check/` sit — capabilities, or a separate "diagnostics"
  band that may read adapters but is outside the ingest write path?

## Targeted questions for the deep-research pass (Variant B input)

To make the research sharp rather than generic, it should answer:

1. Dominant architecture patterns for **scheduled ingest / ETL-extract pipelines** in TS/Node
   (ports-and-adapters / hexagonal vs. pipeline-stages vs. onion) — which best models
   "discover → fetch → persist with checkpoint/resume"?
2. How mature projects encode the **read-source / write-sink isolation** (our S3-raw + staging
   boundary) as a structural rule, and how they keep an extractor from reaching into the
   system-of-record.
3. **Checkpoint/resume & idempotency** placement — orchestration concern, or a first-class
   layer of its own?
4. How **resilience primitives** (retry/backoff/rate-limit/concurrency) are layered — cross-
   cutting utility vs. an adapter decorator band.
5. Real-world **dependency-cruiser / module-boundary rulesets** published for ingest pipelines,
   to borrow battle-tested `forbidden` rules.

## Next steps

1. **User runs deep research** on the questions above → Variant B.
2. Converge Variant A + B into the final fetcher architecture.
3. Refactor shared conventions into the process layer; author `solidstats-fetcher-ts-conventions`
   via `skill-creator`; ship the `.dependency-cruiser.cjs` boundary preset as the executable form.
4. Rewire the fetcher repo's skill table + `skills-lock.json`; drop the fetcher exception from
   `solidstats-server-ts-conventions`.

## Cross-references

- Toolchain/lint context: `replays-fetcher/.planning/spikes/` (spikes 001–004 — Oxlint preset,
  Oxfmt, tsdown, and the depcruise+knip import-gap closure that proves depcruise boundaries).
- `product/TS-TOOLCHAIN-CONVERGENCE.md` — the Track C toolchain the boundary preset plugs into.
