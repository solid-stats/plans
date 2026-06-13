# fetcher-dependency-cruiser — wiring & judgment notes

## How to wire it

1. `pnpm add -D dependency-cruiser` in `replays-fetcher/`
2. Copy `fetcher-dependency-cruiser.cjs` to `replays-fetcher/.dependency-cruiser.cjs`
3. Add to `package.json` scripts (separate from lint per fastify-boilerplate convention):
   `"deps:validate": "depcruise src --config .dependency-cruiser.cjs --output-type err-long"`
4. Add `pnpm run deps:validate` to the `verify` script chain after `typecheck`.

## Rules that are exact (no sign-off needed)

- **F3** no-capability-upward — clean in current tree
- **F4a** discovery-no-write-path — clean (discovery imports only source/ and its own types)
- **F4b/F4d/F4e** storage/checkpoint/evidence isolation — clean (type-only cross-imports only)
- **F5** cross-cutting-is-leaf — clean (source/ errors/ logging/ import nothing upward)
- **F8** no-circular — no cycles detected by inspection

## Rules that need sign-off judgment

- **F1 command-to-run-only:** `cli.ts` is a composition root; it directly imports all capability
  factory fns and adapter constructors (discovery/, staging/, storage/, checkpoint/, evidence/,
  check/, contract-check/). Either (a) exempt cli.ts entirely as a composition root (add its
  imports to `pathNot`) or (b) introduce a DI assembly module and route all construction through
  it. Rule currently has a broad pathNot exemption pending decision.
- **F6/F7a** diagnostics and pg: `check/postgres-connectivity.ts` and `check/s3-connectivity.ts`
  import `pg` and `@aws-sdk/client-s3` directly — they are diagnostics adapters. The five-band
  model does not yet name "diagnostics adapters"; either extend the allowlist in F7a/F7b or add
  a diagnostics-adapter file pattern. Currently allowed via explicit pathNot.
- **F7b** S3 allowlist includes `.fixtures.ts` — fixtures are test-only; decide whether to
  exclude them from depcruise scope via `doNotFollow` instead.
- **F7c** parser package name: `^(@solidgames/replay-parser|...)` is a placeholder. Finalize
  once the parser npm package name is locked.
- **F4c staging-from-storage:** `staging/stage-raw-replay.ts` type-imports `storage/store-raw-replay.ts`
  and `storage/types.ts` — currently type-only, rule allows it. If the team wants zero cross-imports,
  `StoreRawReplayResult` and `RawReplayStorageEvidence` should move to a shared types file.
- **Checkpoint may read staging types?** `run/run-once.ts` type-imports `staging/types.ts` and
  `storage/types.ts` — legitimate orchestration reads; not restricted by current rules.

## Predicted current-tree violations (without running depcruise)

1. **F1 cli.ts → capabilities directly** — `cli.ts` imports `discovery/`, `staging/`, `storage/`,
   `checkpoint/`, `evidence/`, `check/`, `contract-check/` for dependency assembly. These bypass
   run/ and would fire F1 without the composition-root exemption in pathNot.
2. **F6/F7a check/ imports pg/@aws-sdk** — `check/postgres-connectivity.ts` imports `pg`;
   `check/s3-connectivity.ts` imports `@aws-sdk/client-s3`. Already exempted in F7a/F7b; would
   fire without the explicit pathNot entries.
3. **evidence/s3-evidence-store.ts imports run/types.ts** — imports `RunSummary` from `run/`.
   This is an upward import (evidence/ → orchestration band). Fires F3 as currently written.
   SIGN-OFF NEEDED: move `RunSummary` to cross-cutting (e.g. `src/run/types.ts` → `src/errors/` or
   a new `src/types/`) or exempt `run/types.ts` from F3's `to.path`.
