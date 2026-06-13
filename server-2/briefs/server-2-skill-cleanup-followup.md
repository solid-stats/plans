# server-2 — Skill-Driven Code Cleanup Follow-Up Brief

**Created:** 2026-06-13
**Application:** `server-2`
**Status:** NON-BLOCKING — do over time. None of this is required for v1 feature work.

This document consolidates the code-side cleanup that lands in the **`server-2` repository**,
not the skills repo. The conventions are already encoded in skills (lint/coverage suppression
policy, zod-over-TypeBox, the four boundary decisions); what remains is bringing the actual
`server-2` source tree into line with them. Each item below cites the implementing skill or
decision record so the trail stays greppable. Distilled from
`skills/decisions/research/gate-suppression-backlog.md` and
`skills/decisions/research/server2-deferred-decisions.md`; do not re-derive numbers — they come
from the per-site triages.

The headline framing (from the suppression triage): a suppression count is not a debt count.
server-2 carries ~106 ESLint disables; most evaporate at config level or are legitimate
by-construction exceptions, and the real finite work is ~6 missing branch tests plus splitting
the repository god-files. Spend effort there, not on chasing every inline disable.

## A. Config-once — `server-2/eslint.config.js` (do first; cheapest)

Promote scattered inline disables to config in one pass. The shared baseline
(`solidstats-shared-ts-standards §C`) already supplies `unicorn/no-null: "off"`, the
`camelcase` `properties: never` form, and the `**/*.test.ts` override block — server-2 inherits
those, so do **not** re-add them locally. Only the repo-specific disables below need adding to
`server-2/eslint.config.js`:

- `no-use-before-define: { classes: false }` — removes **17** inline disables.
- `id-length` exceptions for the parser wire fields (short snake_case keys on parser payloads) —
  removes **10**.
- `max-classes-per-file: "off"` — removes **5**.

`new-cap` is **moot**: it is not added. The `capIsNewExceptions` entries for `Type.Integer` /
`Type.Null` / etc. only existed to quiet TypeBox's `Type.X` constructors. After §E (zod
migration) the schema layer is lowercase `z.object` / `z.string()`, so those 10 `new-cap`
disables vanish with the migration — no config line is needed, and adding one would be dead
config.

**Coverage excludes** (config, not inline) — `server-2/vitest.config.ts`:

- `coverage.exclude` += `src/operations/*.ts` — removes **4** bootstrap-file ignores. Those are
  process-entry/bootstrap code, the legitimate kind of file-level coverage exclude per
  `solidstats-shared-testing-standards §H`.

The structural-gate carve-out in the suppression policy applies here: config may turn off genuine
noise, but it must never raise a `max-lines` / `max-statements` limit to fit an oversized file.
The god-file fix is a split (§B), not a config bump.

Encoded in: `solidstats-shared-ts-standards §C` (config-once baseline + disable policy),
`solidstats-shared-testing-standards §H` (coverage-exclude doctrine). Decision record:
`skills/decisions/0005-lint-and-coverage-suppression-policy.md`.

## B. Real backlog — the genuine gaps + god-file splits

These are the suppressions that hide actual work, not noise.

**Write the 6 missing branch tests** for `src/modules/public-stats/repository.ts`. It carries
**6 inline `v8 ignore` directives sitting on real, reachable branches**; each needs a targeted
unit test (fixture input only, no infrastructure), then the ignore is deleted:

1. slug-based event lookup
2. `rotationId` undefined in `buildReplayWhere`
3. `eventRowCursor` null `occurred_at`
4. `playerStatsSql` row-absent
5. `mappedStats` undefined
6. `page.limit <= 0`

In the same file, migrate the **2 `// c8 ignore`** comments to the **`/* v8 ignore */`** form
(the project runs vitest's v8 coverage provider; the c8 marker is the wrong tool's syntax).

**Split the repository god-files** by query group — these trip `max-lines` structurally, and per
the suppression policy a structural gate is a design signal, never something to silence with a
file-level disable:

- `src/modules/public-stats/repository.ts` — **1927 lines** (17 ignores today; 11 after the 6
  tests land). Split by query group (reads / writes, or per-aggregate).
- `src/modules/statistics/repository/repository.ts` — **938 lines**. Same treatment.
- `src/modules/ingest/repository/repository.ts` — **878 lines**. Same treatment.

**`max-params` (limit 4)** — the SQL builders that take 4+ positional args should take a single
options object instead. Mechanical, removes the disables outright.

Encoded in: `solidstats-shared-ts-standards §C`, `solidstats-shared-testing-standards §H`, and
`solidstats-server-ts-tests` (per-stack coverage marker syntax + the structural-split rule).
Decision record: `skills/decisions/0005-lint-and-coverage-suppression-policy.md`.

## E. TypeBox → zod 4 — schema migration (CODE side)

The server-2 conventions / reviewer / standards are already rewritten to zod; this is the
matching change in the **`server-2` repo**. It is small: zero `Type.Ref` / `addSchema` / `$id`
usage exists today (server-2 is all-inline), so the old "inline-vs-`$ref`" tradeoff never
applies and there is nothing to untangle.

**Deps** — drop `@sinclair/typebox` + `@fastify/type-provider-typebox`; add `zod@^4` +
`fastify-type-provider-zod`.

**Setup (2 files):**

- `src/app.ts` — `setValidatorCompiler(validatorCompiler)`,
  `setSerializerCompiler(serializerCompiler)`, `withTypeProvider<ZodTypeProvider>()`.
- `src/openapi/register-openapi.ts` — swagger `transform: jsonSchemaTransform` +
  `transformObject: jsonSchemaTransformObject`.

**Schemas (~12 files):** `Type.Object` → `z.object`, `Static<typeof X>` → `z.infer<typeof X>`,
bounds via `.max()` / `.int().min().max()`, `.strict()` on request objects. Where `$ref` dedup is
wanted, register shared response schemas with `z.globalRegistry.add(X, { id })` — inference is
retained.

**Unchanged:** the OpenAPI export/verify pipeline (`openapi:export` / `verify` +
`openapi-typescript` → web client) and the **OpenAPI 3.0.x pin** both stay exactly as-is.

Why zod, not TypeBox: `Type.Ref` broke Fastify handler inference (#263);
`fastify-type-provider-zod` + `z.globalRegistry` deliver `$ref` dedup *and* inference, and zod is
already the org standard (fetcher + web). Decision record:
`skills/decisions/0003-server-2-schema-library-typebox-to-zod.md`.

## Deferred boundary decisions — code-side application

Four architecture decisions were settled 2026-06-13
(`skills/decisions/0004-server-2-boundary-and-testing.md`; provenance
`skills/decisions/research/server2-deferred-decisions.md`) and encoded into the server-2 trio.
Their code-side application in the repo:

- **A — enforce no-pass-through (no controller → repo).** Adopt the no-pass-through rule only: a
  usecase / service that merely forwards a single call must be collapsed, not kept. The blanket
  invariant holds — a controller never calls a repository directly (controller → service for
  plain CRUD stays the one carve-out). No "trivial CRUD" controller→repo loophole. Enforcement is
  by review judgment (the `layers.md` usecase checklist already says a usecase wrapping a single
  service call should be removed).

- **B — adopt `getDecorator<T>()` / `setDecorator<T>()`** for cross-module dependency access,
  replacing `declare module 'fastify'` global augmentation. Fastify `^5.8.5` is pinned, so the
  5.3 minimum is satisfied. The win is a fail-fast `FST_ERR_DEC_UNDECLARED` at boot instead of a
  deferred runtime error. Every cross-module access site (`app.decoratorName` →
  `app.getDecorator<T>('name')`) is updated and the `declare module` blocks are removed —
  mechanical but broad.

- **C — wire dependency-cruiser** as the boundary tool. The final call is **one tool across both
  TS services** (depcruise everywhere, not eslint-plugin-boundaries — this overrides the
  deferred-decisions brief's own Option-2 recommendation; see
  `skills/decisions/0004-server-2-boundary-and-testing.md`). The preset draft already exists and
  ships as **`server-2-dependency-cruiser.cjs`** in this
  briefs folder. Move it into the repo as `.dependency-cruiser.cjs`, add the CI step, and resolve
  the violations it predicts. The known one to fix in code: `src/infra/storage/client.ts`
  `import type`s from `modules/requests/routes/models.ts` and
  `modules/statistics/parser-artifact.ts`, which trips the C3 cross-cutting-no-module-imports
  rule — move those shared shapes (`ParserArtifact`, the requests model types) into `src/infra/`
  or a neutral `src/types/` rather than relaxing the rule. Note the preset's C1
  (cross-module-via-index-only) is forward-looking: there are no `index.ts` barrels in any module
  today, so C1 flags every current cross-module import until barrels land.

- **D — test mocking by layer.** Unit tests inject mocks directly via `createX(deps)`; route
  integration tests override decorated deps via `app.setDecorator<T>()` after `buildApp()` (B's
  `setDecorator`, which removes any need for a `fastify-override` third-party dep). This is the
  contract `solidstats-server-ts-tests` documents, so the test code should follow that split.

Encoded in: `solidstats-server-ts-conventions` (§A dependency rules, `layers.md` DI section),
`solidstats-server-ts-code-review` (boundary + DI checklists), `solidstats-server-ts-tests`
(mocking-by-layer section).

## Sources

- `skills/decisions/research/gate-suppression-backlog.md` — §A config-once (server-2 block),
  §B real backlog + god-file line counts, §E zod migration steps; the 197/24/165/~7 framing
- `skills/decisions/research/server2-deferred-decisions.md` — decisions A–D, options + the
  per-decision rationale
- `skills/decisions/research/RECOMMENDATION.md` — V5 sign-off; item 3 (zod over TypeBox,
  reason #263) and item 4 (deferred decisions A–D, depcruise as the one boundary tool)
- `plans/server-2/briefs/server-2-dependency-cruiser.cjs` — the depcruise preset
  draft (C1–C4 rules, the `src/infra/storage/client.ts` violation, no-barrels reality check); it
  ships into the repo as `.dependency-cruiser.cjs` for §C
- `skills/decisions/0003-server-2-schema-library-typebox-to-zod.md` — the zod-over-TypeBox
  decision (#263, `$ref` dedup + inference)
- `skills/decisions/0004-server-2-boundary-and-testing.md` — the four boundary/testing decisions
  A–D (no-pass-through, `getDecorator`/`setDecorator`, depcruise, mocking-by-layer)
- `skills/decisions/0005-lint-and-coverage-suppression-policy.md` — the suppression policy ADR
  (never silence a structural gate / configure noise once / narrow reasoned exceptions)
- `skills/decisions/0001-skill-taxonomy-v5.md` — the taxonomy + the skills that encode these
  conventions (`solidstats-shared-ts-standards`, `solidstats-shared-testing-standards`, the
  `solidstats-server-ts-*` trio)
- `plans/server-2/briefs/server-2.md` — the originating project brief, for format/scope
