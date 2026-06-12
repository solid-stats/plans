# replays-fetcher — Architecture & Conventions Skill (design proposal)

**Created:** 2026-06-13
**Application:** `replays-fetcher`
**Status:** DRAFT — Variant A (in-house proposal). To be compared against a deep-research
sweep of ingest/pipeline architecture practice, then converged before the skill is authored.
**Why:** `solidstats-backend-ts-conventions` is Fastify-module-shaped (`controller → usecase →
service → repository`, `src/modules/<feature>/`). It currently treats `replays-fetcher` as a
"shared baseline" exception, but its §A layering does not fit an ingest CLI pipeline
(`discovery / storage / staging / checkpoint / source / run`). The fetcher needs its own
conventions skill describing an architecture that actually fits.

## Decision — skill taxonomy & composition (confirmed)

Refactor the shared layer rather than duplicate:

- Extract the **stack-neutral** backend conventions — naming, the typed error system, async
  safety, logging, config/env discipline — out of `solidstats-backend-ts-conventions` into a
  shared process-level skill (extend `solidstats-process-ts-standards`, or a new
  `solidstats-process-backend-standards` sibling). Both backend and fetcher build on it.
- `solidstats-backend-ts-conventions` keeps only the **Fastify/HTTP** architecture (§A module
  layout, controllers/routes, TypeBox, Kysely, queue) — server-2 only.
- New **`solidstats-fetcher-ts-conventions`** owns only the **ingest-pipeline architecture**
  (the §A replacement below) + fetcher-specific fences; inherits everything else from the
  shared layer. Code-review/tests siblings (`solidstats-fetcher-ts-*`) can follow later if
  wanted — out of scope for now.
- Rewire: drop the "replays-fetcher shared baseline" note from the backend skill's Scope; point
  the fetcher repo's project skill table + `skills-lock.json` at the new skill.

> The architecture content below is **not final** — it is the in-house variant to weigh against
> deep-research findings. The taxonomy/composition decision above is settled.

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
   `solidstats-backend-ts-conventions`.

## Cross-references

- Toolchain/lint context: `replays-fetcher/.planning/spikes/` (spikes 001–004 — Oxlint preset,
  Oxfmt, tsdown, and the depcruise+knip import-gap closure that proves depcruise boundaries).
- `product/TS-TOOLCHAIN-CONVERGENCE.md` — the Track C toolchain the boundary preset plugs into.
