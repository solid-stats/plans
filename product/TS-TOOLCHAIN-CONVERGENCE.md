# Deep Brainstorm Brief — TS Toolchain Convergence (Vite+ / VoidZero)

> **Pilot Outcome — updated 2026-06-14.** The `replays-fetcher` pilot shipped this
> convergence (v3.0, tag `v3.0`). The shared config package shipped as
> **`@solid-stats/ts-toolchain`** (tags `v0.1.0`–`v0.1.3`), not the working name
> `@solidstats/config` used below. Two empirical findings **supersede** the
> "Verified by Deep Research" / OQ-1 type-aware caveats below for any consumer that
> repeats the pilot:
> - **Type-aware is CI-blockable.** `oxlint-tsgolint@0.23.0` installs clean via pnpm
>   (empty postinstall → no `allowBuilds`; platform binary is an `optionalDependency`;
>   frozen-lockfile-safe) and flags `no-floating-promises`/`require-await` with exit 1.
>   So `oxlint --type-aware` can be a **blocking** gate, not non-blocking. The fetcher
>   kept it non-blocking only due to a now-disproven install assumption.
> - **`server-2` is a full convergence** (oxlint + blocking type-aware + tsdown 2-entry +
>   depcruise/knip + lefthook), gated on a **preset `v0.1.4` pre-hardening** step.
>
> Live decision packs: [`server-2/.planning/DEEP-BRAINSTORM.md`](../../server-2/.planning/DEEP-BRAINSTORM.md),
> [`replay-parser-2/.planning/DEEP-BRAINSTORM.md`](../../replay-parser-2/.planning/DEEP-BRAINSTORM.md).
> The OQ-1/OQ-1b/OQ-1c type-aware open questions below are **resolved** by the pilot.

## Context
- Date: 2026-06-07
- Request: Migrate `replays-fetcher` and `server-2` to the Vite+/VoidZero ecosystem,
  prepare the empty `web` repo, and align all TypeScript products on a single
  toolchain.
- GSD stage: pre-plan brainstorm (decision pack for milestone/phase planning).
- Target outcome: locked decision pack + concrete next steps + remaining questions.
- Artifact owner: Pavlov Alexandr.

## Goal
One coherent VoidZero-based TS toolchain across all three TS products, with a
single source of truth for shared config, so the stack does not drift again
(the founding reason the `plans` repo exists).

## Users And Workflows
- Developers across `replays-fetcher`, `server-2`, `web` — consistent
  `lint` / `format` / `test` / `build` commands and identical rules everywhere.
- CI (GitHub Actions in each repo) — `verify` pipelines rewritten to the new
  command surface.

## Scope
### Must Have
- `replays-fetcher` + `server-2`: Oxlint + Oxfmt + Vitest (already present) +
  tsdown build; Vite+ as task entry point and runtime/PM manager.
- `web`: greenfield on **TanStack Start + React/TSX** (per `web/briefs/web.md`),
  with Vite+ layered on for lint/format/test/task.
- Shared config package as the single source of truth for presets.

### Nice To Have
- Vite Task as a unified task runner across repos.
- CI caching for Oxc/Vitest.

### Also In Scope (Track C item 4)
- Client-side git hooks via **lefthook**, config shipped in `@solidstats/config`
  (`lefthook.yml` preset): **pre-commit** = Oxfmt + Oxlint on staged files;
  **pre-push** = `tsc` typecheck + Vitest. Hooks invoke the same command surface
  this migration introduces and mirror (not replace) the CI `verify` gate.

### Non Goals
- Monorepo. Polyrepo structure (separate git repos + own `.planning/`) is kept.
- Rewriting `server-2` OpenAPI tooling (`@fastify/swagger`, `openapi-typescript`)
  — untouched.
- Replacing TanStack Start's own Vite build pipeline.

## Confirmed Decisions
| Decision | Choice | Rationale | Consequence |
|----------|--------|-----------|-------------|
| Toolchain target | Full Vite+ for `web`; VoidZero building blocks (Oxc + Vitest + tsdown) for backends | Vite+ is a frontend entry point; backends need the pieces, not `vite build` | Two slightly different surfaces, unified by shared presets |
| Consistency mechanism | Shared config package `@solidstats/config` (tsconfig / oxlint / oxfmt / vitest presets) | Copy-paste reproduces the exact drift `plans` was created to kill | Must publish/consume a private package (pnpm/git dep) |
| **Reference config** | The hand-curated config in `vocalclub` (`Estesis/vocalclub`) is the **rule-content source of truth** | User personally tuned it: explicit per-category rule files, `unicorn/no-null` off, `prevent-abbreviations` allowlist, type-aware-heavy | `@solidstats/config` Oxlint preset = port vocalclub's **Oxlint-supported** rules; non-portable rules are dropped |
| Linter | **Full Oxlint** (replace ESLint) — north star is Vite+/Oxlint, not the ESLint reference | User chose Vite+/Oxlint as the standard; vocalclub config is reference-only for rule content | **Mandatory pre-cutover rule audit** (OQ-1b) anchored to vocalclub's rule set; drop any rule Oxlint lacks |
| Formatter | **Oxfmt everywhere** (incl. replacing Prettier in backends) | User accepts losing vocalclub's ~120 hand-tuned `@stylistic` rules for one fast formatter | `@stylistic` fine-tuning is lost; one-time reformat per repo; bleeding-edge risk |
| Backend build | tsdown (Rolldown) — **verified: deps externalized by default** (target=node, ESM, sourcemaps) | 🟢 deep-research (high conf): `dependencies`/`peer`/`optional` are external by default, so `pg`/`amqplib`/`@aws-sdk/*` are never bundled without opt-in | Replaces `tsc -p tsconfig.build.json`; only target/ESM/sourcemap config + Docker smoke-run left to validate |
| `web` framework | TanStack Start + React/TSX | Locked in `web/briefs/web.md` | Scaffold via TanStack create, not `vite new` |
| Runtime/PM mgmt | Hand to Vite+ | Single entry point | Couples dev env to pre-1.0 Vite+; CI/Docker must follow |
| Rollout order | Pilot `replays-fetcher` → `server-2` → `web` | Simplest service first to harden the shared presets | `web` lands last |
| Config right-size | Done **during** the Oxlint migration, curated set lives in `@solidstats/config` | Current config is maximal (`js.configs.all`) → devs suppress rules inline (server-2: 102 `eslint-disable`) | Curated ruleset = smaller Oxlint audit delta + most disables become removable |
| — drop `js.configs.all` | Replace with `recommended` + targeted rules | `all` is the root cause (drags camelcase, id-length, max-classes-per-file, class-methods-use-this, max-params, init-declarations, prefer-arrow-callback) | Removes ~camelcase(31)/max-lines(28)/id-length(10) + small noise |
| — `unicorn/no-null` off | Disable globally | #1 offender: 63 disables; fights Postgres/kysely/typebox DB-null | −63 disables |
| — size/magic rules | **Keep as-is** (explicit overrides retained) | User accepts `no-magic-numbers`(24) / `max-lines-per-function`(20) / `no-use-before-define`(16) and their disables | Those `eslint-disable` comments remain by design |

## Key Finding (reframes the request)
- **Vitest is already in both backends** — the literal "move to Vitest" is done.
- **Vite+ is a frontend entry point** (no documented Node server bundling). So
  "everything on full Vite+" really means: `web` on full Vite+, backends on a
  VoidZero *subset* (Oxlint, Oxfmt, Vitest, tsdown, Vite Task).
- **Vite+ is now MIT / free.** Cloudflare acquired VoidZero (June 2026) and
  Vite+ was fully open-sourced; earlier mixed-licensing plans were dropped. Cost
  is no longer the risk — **maturity is** (Vite+ ~v0.1.x, pre-1.0).

## Verified by Deep Research (run wf_914b6872-e14, 2026-06-07)
Accuracy-first harness: 12 sources → 54 claims → 4 survived verification.
- 🟢 **HIGH — tsdown externalizes deps by default.** `dependencies`/`peerDependencies`/
  `optionalDependencies` are external; only `devDependencies` get bundled. `pg`,
  `amqplib`, `@aws-sdk/*` stay out of the bundle without any manual config.
  ([tsdown.dev/options/dependencies](https://tsdown.dev/options/dependencies))
- 🟢 **HIGH — Oxlint type-aware = tsgolint** (a Go binary on typescript-go), not
  native Rust. ([oxc.rs type-aware](https://oxc.rs/docs/guide/usage/linter/type-aware.html))
- 🔴 **LOW — "59/61 type-aware rules"** is likely a roadmap target; alpha ~43 active.
  Type-aware linting is **alpha / technical preview**, depends on external binary.
- 🔴 **Unverified** — import-x / unicorn coverage in Oxlint; official hybrid-vs-replace
  recommendation; tsdown/Rolldown native-module & dynamic-require/CJS interop behavior.
- ❌ **Refuted** — tsgolint "20–40x faster" (real ~10x per official Oxc); the standalone
  `tsgolint` repo is a prototype "not expected to be production ready" (the production
  path is integrated `oxlint-tsgolint`, in alpha).

**Decision impact:** tsdown for backends is confirmed (and simpler — externalize is the
default). **Full Oxlint replacement is premature** → lean hybrid (Oxlint + ESLint for
type-aware/plugin gaps) until type-aware leaves alpha. See Open Questions OQ-1/OQ-1b.

## Backend And Infrastructure Notes
| Topic | Decision/Default | Consequence | Hidden Cost | Breaking Point |
|-------|------------------|-------------|-------------|----------------|
| Backend bundling | tsdown, all deps external | Fast single-entry build, Docker still ships node_modules | tsdown config per repo | A dep needing inlining / odd dynamic require |
| `web` rendering | TanStack Start SSR, Node in Docker | Start owns its Vite build; Vite+ only lint/test/format/task | Two build owners in one repo | Vite+ and Start Vite-plugin version skew |
| Runtime mgmt | Vite+ manages Node + pnpm | Single entry point dev-side | CI/Docker must replicate Vite+ runtime resolution | pre-1.0 behavior change |
| OpenAPI types | `openapi-typescript` from `server-2` schema (shared by `web`) | Unchanged | none | schema export script must keep working |

## Risks
| Risk | Severity | Why It Matters | Mitigation |
|------|----------|----------------|------------|
| Oxlint can't run vocalclub's `@stylistic` (~120 rules) + several plugins (`import`, `mobx`, `jsx-a11y`, `react`, `next`, `vanilla-extract`) | High | The reference config's formatting layer + plugin rules have no Oxlint equivalent — they are lost, not ported | Formatting moves to Oxfmt (accepted); audit which plugin lint-rules Oxlint covers; drop the rest knowingly |
| Oxlint rule gaps vs vocalclub's curated `eslint`/`ts`/`unicorn`/`import` rules | High | Silent loss of lint coverage; no ESLint fallback under full Oxlint | Port vocalclub rules into the Oxlint preset; run empirical diff (OQ-1b); document every dropped rule |
| Oxfmt won't reproduce `@stylistic` style | Medium | One-time large reformat diff; possible style the user dislikes | Land Oxfmt reformat as one isolated commit per repo; user reviews Oxfmt defaults early |
| Vite+ pre-1.0 | Medium | Defaults/APIs will shift; runtime mgmt coupling | Pin versions; pilot on one repo before spreading |
| tsdown externalization edge cases | Medium | Native/dynamic-require deps can break at runtime | Smoke-run built artifact in Docker before cutover |
| Vite+ × TanStack Start build conflict | Medium | Both are Vite-based; plugin/version skew | Scaffold via TanStack create; Vite+ only for lint/test/format/task |

## Config Right-Size (data from `eslint-disable` audit, 2026-06-07)
Current configs are maximal: `js.configs.all` + tseslint `strictTypeChecked`+`stylisticTypeChecked`
+ `import-x` recommended/typescript + `unicorn` recommended. This drives heavy inline suppression.
- `server-2`: **102** `eslint-disable`. Top: `unicorn/no-null` 63, `camelcase` 31, `max-lines` 28,
  `no-magic-numbers` 24, `max-lines-per-function` 20, `no-use-before-define` 16, `id-length` 10.
- `replays-fetcher`: **15**. Top: `no-await-in-loop` 9 (legit; already off in server-2), `max-lines` 5.
- **Right-size decisions:** drop `js.configs.all`; turn `unicorn/no-null` off; keep size/magic rules.
- **Follow-up:** after right-size, sweep now-redundant `eslint-disable` comments (mechanical).

### Reference config = vocalclub (the desired rule set, not the backends' maximal config)
The migration target is the hand-curated `vocalclub` config, ported to Oxlint. Confirmed alignments:
- **Explicit per-category rules** (no preset spreads) — matches "drop `js.configs.all`".
- `unicorn/no-null` already `0`; `unicorn/prevent-abbreviations` curated allowlist; `reportUnusedDisableDirectives: 2`.
- Heavy type-aware (`ts/no-unsafe-*`, `strict-boolean-expressions`, `no-floating-promises`, …) → leans on Oxlint alpha type-aware.
- Uses `eslint-plugin-import` (NOT `import-x`) and `@stylistic` for formatting.
Per-project nuance: vocalclub sets `no-await-in-loop: 2`, but backends legitimately need it **off** (sequential I/O) — keep as a per-repo override.
**Not portable to Oxlint (dropped/replaced):** all `@stylistic/*` (→ Oxfmt), `mobx`, `vanilla-extract`, and any `react`/`jsx-a11y`/`next` rules Oxlint lacks (web-only anyway).

## Acceptance Criteria
- `pnpm verify` (or Vite+ equivalent) passes in each repo with the new toolchain.
- Curated ruleset (no `js.configs.all`, `unicorn/no-null` off) is the source of truth in `@solidstats/config`.
- Redundant `eslint-disable` comments removed after right-size.
- Lint/format/test rules come from `@solidstats/config`, not local duplicates.
- Backends build with tsdown and the built artifact runs in Docker.
- `web` scaffolds on TanStack Start + React and consumes `@solidstats/config`.
- A documented map of vocalclub rules → Oxlint coverage (ported / dropped) exists.

## Verification Plan
- Pilot `replays-fetcher`: run full `verify`, smoke-run the built CLI in Docker.
- Diff lint findings before/after migration to quantify rule deltas.
- `server-2`: ensure OpenAPI export + integration/postgres tests still pass.
- `web`: build + SSR smoke + Playwright E2E against seeded `server-2`.

## Open Questions
| Priority | Question | Why It Matters | Owner/Status |
|----------|----------|----------------|--------------|
| P0 (OQ-1) | Full Oxlint vs hybrid | RESOLVED → **full Oxlint** (user decision, accepted risk) | Closed 2026-06-07 |
| P1 (OQ-1b) | Which of **vocalclub's** curated rules does Oxlint support, and which are dropped? (target rule set = vocalclub, not backends' maximal config) | Defines the `@solidstats/config` Oxlint preset; unported rules are knowingly dropped (no ESLint fallback) | **Mandatory** — map vocalclub rules → Oxlint coverage, then empirical diff on `replays-fetcher` (`--type-aware`) |
| P1 (OQ-1c) | Is type-aware Oxlint stable enough for CI? (alpha as of 06-2026) | **Elevated**: type-aware is the CORE of the config (whole `strictTypeChecked` set), not a fringe — full Oxlint leans hard on alpha tsgolint | Open — gate cutover on the empirical diff being clean + recheck live oxc.rs docs at migration |
| P2 (OQ-2) | tsdown/Rolldown native bindings + dynamic require/CJS for server ESM | Low surface: deps are externalized, so only own-source dynamic `require`/CJS-only imports are at risk | Close via Docker smoke-run of built artifact (already in Verification Plan) — not a blocker |
| P2 | New CI command surface (`vite lint`/`vite test`/`tsdown`) for each `verify` | CI must be rewritten | Open |
| P2 | How does Vite+ runtime mgmt coexist with Docker base images / CI Node setup? | Deploy reproducibility | Open |
| P2 | tsdown config details for Fastify (entrypoints, externals list) | Build correctness | Open |
| P2 | Vitest browser mode vs existing Playwright E2E in `web` | Avoid duplicate test stacks | Open |

## Question Ledger
| Priority | Question | Answer | Decision Impact |
|----------|----------|--------|-----------------|
| P0 | Meaning of "Vite+ / vite ecosystem" | Full Vite+ (VoidZero) | Set toolchain target |
| P0 | Consistency mechanism | Shared config package | Architecture of alignment |
| P0 | Backend bundling stance | Recommendation → tsdown externalized | Build decision |
| P0 | Vite+ cost/maturity appetite | Wanted analysis → MIT/free, pre-1.0 | Cost de-risked, maturity flagged |
| P1 | Linter | Full Oxlint (then North-star = Vite+/Oxlint) | Lint migration + rule audit |
| P1 | Formatter | Oxfmt everywhere (replace Prettier + drop @stylistic) | Reformat commit; accept style loss |
| P1 | `web` framework | React + TanStack Start | Scaffold path |
| P2 | Rollout order | Pilot `replays-fetcher` | Sequencing |
| P2 | Runtime mgmt | Hand to Vite+ | CI/Docker coupling |
| P0 | North star (golden ESLint vs Vite+/Oxlint) | **Vite+/Oxlint**; vocalclub = rule reference only | Resolved conflict between curated ESLint config and full Oxlint |
| P1 | Config right-size timing | During the Oxlint migration | Curated set authored straight into `@solidstats/config` |
| P1 | Reference config | vocalclub (`Estesis/vocalclub`) is rule-content source of truth | Oxlint preset = ported vocalclub rules |

## Recommended Next GSD Step
- Primary: **`/gsd:spike`** on `replays-fetcher` — (1) author the `@solidstats/config`
  Oxlint preset by porting vocalclub's rules (mark supported/dropped); (2) run Oxlint
  `--type-aware` + Oxfmt and inspect the real format diff + rule-loss; (3) tsdown build
  + Docker smoke-run. Closes OQ-1b / OQ-1c / OQ-2 on real code and yields a ready preset.
- Then: `/gsd:plan-phase` for the pilot migration, then `server-2`, then `web`.
- Early check: review Oxfmt's default style on a real file at the **start** of the spike —
  if it diverges too far from vocalclub's `@stylistic`, decide before reformatting 3 repos.
- Alternative: scaffold `web` first as the reference and align backends to it.
