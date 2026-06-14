/* ARCHIVED 2026-06-14 — superseded / rejected design.
   dependency-cruiser shipped in replays-fetcher via the generic `depcruise --init` preset
   (live .dependency-cruiser.cjs + the `depcruise` step in the verify chain), NOT this
   five-band F1–F8 fence draft — none of its rule names exist in the live config.
   Kept for provenance (records the rejected approach). Do not adopt. */

/**
 * replays-fetcher — dependency-cruiser boundary preset (draft)
 *
 * Five-band model (downward-only):
 *   Command       src/cli.ts
 *   Orchestration src/run/
 *   Capabilities  src/discovery/ src/storage/ src/staging/ src/checkpoint/ src/evidence/
 *   Diagnostics   src/check/ src/contract-check/     (read-only, separate band from Capabilities)
 *   Adapters      *-client.ts *-store.ts *-storage.ts *-repository.ts inside capability dirs
 *   Cross-cutting src/config.ts src/errors/ src/logging/ src/source/
 *
 * Adapter files in the REAL tree (confirmed by file listing):
 *   discovery/source-client.ts
 *   storage/s3-raw-storage.ts, storage/replay-byte-client.ts
 *   staging/postgres-staging-repository.ts
 *   checkpoint/s3-checkpoint-store.ts
 *   evidence/s3-evidence-store.ts
 *
 * Note: adapters live INSIDE capability dirs, not in a top-level src/adapters/.
 * The adapter pattern is enforced via filename patterns (*-client|*-store|*-storage|*-repository).
 */

// ─── Layer path arrays (named constants — convention from wave-2 §2 / fastify-boilerplate) ──────

const commandPaths = ['^src/cli\\.ts$'];

const orchestrationPaths = ['^src/run/'];

const capabilityPaths = [
  '^src/discovery/',
  '^src/storage/',
  '^src/staging/',
  '^src/checkpoint/',
  '^src/evidence/',
];

// Adapter files sit inside capability dirs; matched by filename convention
const adapterFilePaths = [
  '^src/[^/]+-client\\.ts$',                              // e.g. discovery/source-client.ts
  '^src/[^/]+/[^/]+-client\\.ts$',                        // nested adapter files
  'src/storage/s3-raw-storage\\.ts$',
  'src/storage/replay-byte-client\\.ts$',
  'src/staging/postgres-staging-repository\\.ts$',
  'src/checkpoint/s3-checkpoint-store\\.ts$',
  'src/evidence/s3-evidence-store\\.ts$',
];

// Diagnostics band: read-only; may read capabilities/adapters but never the write path
const diagnosticsPaths = ['^src/check/', '^src/contract-check/'];

// Cross-cutting: leaf nodes — nothing inside may import upward
const crossCuttingPaths = [
  '^src/config\\.ts$',
  '^src/errors/',
  '^src/logging/',
  '^src/source/',
];

// Capability write-path adapters (PG / S3 write adapters)
const pgAdapterPaths = ['src/staging/postgres-staging-repository\\.ts$'];

const s3WritePaths = [
  'src/storage/s3-raw-storage\\.ts$',
  'src/checkpoint/s3-checkpoint-store\\.ts$',
  'src/evidence/s3-evidence-store\\.ts$',
];

// ─── Rules ───────────────────────────────────────────────────────────────────────────────────────

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [

    // F1 — Command may only import orchestration (run/) and cross-cutting; no capability shortcuts
    // Template: S2 (dependency-cruiser/bin-to-cli-only)
    {
      name: 'F1-command-to-run-and-cross-cutting-only',
      comment: 'Fence 1: cli.ts → run/ + cross-cutting only; no direct capability or adapter imports',
      severity: 'error',
      from: { path: commandPaths },
      to: {
        path: '^src/',
        pathNot: [
          ...orchestrationPaths,
          ...crossCuttingPaths,
          // cli.ts assembles deps so it imports capability factory fns and adapter constructors
          // SIGN-OFF NEEDED: cli.ts currently imports capability dirs directly (discovery/, staging/,
          // storage/, checkpoint/, evidence/, check/, contract-check/) to assemble deps.
          // Two options: (a) accept cli.ts as a composition root exempt from this fence,
          // (b) add an explicit exceptions list here. This rule is flagged for sign-off.
          ...capabilityPaths,
          ...diagnosticsPaths,
        ],
        dependencyTypesNot: ['npm', 'core', 'type-only'],
      },
    },

    // F2 — Orchestration must not reach past capabilities into write adapters directly
    // Template: S1 (no-domain-to-infra-deps)
    {
      name: 'F2-no-run-to-write-adapters',
      comment: 'Fence 2: run/ may import capability public API and cross-cutting but not write-adapter internals',
      severity: 'error',
      from: { path: orchestrationPaths },
      to: {
        // run/ currently holds only type-only imports from adapter files; value imports are banned
        path: [...pgAdapterPaths, ...s3WritePaths].join('|'),
        dependencyTypesNot: ['type-only'],
      },
    },

    // F3 — Capabilities must not import upward into orchestration or command
    // Template: S1
    {
      name: 'F3-no-capability-upward',
      comment: 'Fence 3: capability dirs never import orchestration or command',
      severity: 'error',
      from: { path: capabilityPaths },
      to: { path: [...orchestrationPaths, ...commandPaths] },
    },

    // F4a — discovery/ never imports storage| staging (read-only capability; no write path)
    {
      name: 'F4a-discovery-no-write-path',
      comment: 'Fence 4a: discovery/ is read-only — never imports storage/ staging/ checkpoint/ evidence/',
      severity: 'error',
      from: { path: '^src/discovery/' },
      to: {
        path: '^src/(storage|staging|checkpoint|evidence)/',
        pathNot: ['\\.types\\.ts$'],
        dependencyTypesNot: ['type-only'],
      },
    },

    // F4b — storage/ never imports staging/ (separate write-path capabilities)
    {
      name: 'F4b-storage-isolated-from-staging',
      comment: 'Fence 4b: storage/ and staging/ are isolated write-path siblings',
      severity: 'error',
      from: { path: '^src/storage/' },
      to: {
        path: '^src/staging/',
        pathNot: ['\\.types\\.ts$'],
        dependencyTypesNot: ['type-only'],
      },
    },

    // F4c — staging/ may import storage/ types (StoreRawReplayResult) but not its write adapter
    // SIGN-OFF NEEDED: staging/stage-raw-replay.ts imports 'storage/store-raw-replay.ts' and
    // 'storage/types.ts' as type-only — this is the real cross-capability import. Allowed because
    // they are type-only and staging needs the result shape. If we tighten to zero cross-imports,
    // this becomes a violation; shared types should move to a shared types file.
    {
      name: 'F4c-staging-no-value-import-from-storage',
      comment: 'Fence 4c: staging/ may not value-import from storage/; type-only is permitted',
      severity: 'error',
      from: { path: '^src/staging/' },
      to: {
        path: '^src/storage/',
        dependencyTypesNot: ['type-only'],
      },
    },

    // F4d — checkpoint/ never imports staging/ or storage/ internals (value imports)
    {
      name: 'F4d-checkpoint-isolated',
      comment: 'Fence 4d: checkpoint/ never value-imports staging/ or storage/ — state is an opaque cursor',
      severity: 'error',
      from: { path: '^src/checkpoint/' },
      to: {
        path: '^src/(staging|storage)/',
        dependencyTypesNot: ['type-only'],
      },
    },

    // F4e — evidence/ never imports staging/ or storage/ (isolated S3 write capability)
    {
      name: 'F4e-evidence-isolated',
      comment: 'Fence 4e: evidence/ never imports staging/ or storage/; it reads run/types for RunSummary',
      severity: 'error',
      from: { path: '^src/evidence/' },
      to: {
        path: '^src/(staging|storage|checkpoint)/',
        pathNot: ['\\.types\\.ts$'],
        dependencyTypesNot: ['type-only'],
      },
    },

    // F5 — Cross-cutting is leaf-only: source/, errors/, logging/ never import upward
    // Template: S1
    {
      name: 'F5-cross-cutting-is-leaf',
      comment: 'Fence 5: source/ errors/ logging/ config.ts never import capability, orchestration, or command',
      severity: 'error',
      from: { path: crossCuttingPaths },
      to: {
        path: [
          ...commandPaths,
          ...orchestrationPaths,
          ...capabilityPaths,
        ].join('|'),
      },
    },

    // F6 — Diagnostics band (check/ + contract-check/) never imports the write path
    // check/s3-connectivity.ts imports @aws-sdk/client-s3 directly — SIGN-OFF NEEDED (see notes)
    // check/postgres-connectivity.ts imports pg directly — same
    {
      name: 'F6-diagnostics-no-write-path',
      comment: 'Fence 6: diagnostics band (check/ contract-check/) never imports staging/ storage/ write adapters',
      severity: 'error',
      from: { path: diagnosticsPaths },
      to: {
        path: [...pgAdapterPaths, ...s3WritePaths].join('|'),
        dependencyTypesNot: ['type-only'],
      },
    },

    // F7a — pg only importable from staging/ (write adapter) and check/ (diagnostic)
    // Template: S3 inverted allowlist
    // SIGN-OFF NEEDED: check/postgres-connectivity.ts imports pg directly; this is a diagnostics
    // adapter pattern not yet reflected in the five-band model. Allowlist includes check/ for now.
    {
      name: 'F7a-pg-only-in-staging-adapter-and-check',
      comment: 'Fence 7a: pg driver only in staging/postgres-staging-repository.ts and check/postgres-connectivity.ts',
      severity: 'error',
      from: {
        pathNot: [
          'src/staging/postgres-staging-repository\\.ts$',
          'src/check/postgres-connectivity\\.ts$',
        ],
      },
      to: { path: '^pg$' },
    },

    // F7b — @aws-sdk/client-s3 only importable from storage/ checkpoint/ evidence/ and check/s3
    // SIGN-OFF NEEDED: check/s3-connectivity.ts imports @aws-sdk directly — same diagnostics-adapter pattern.
    {
      name: 'F7b-s3-sdk-only-in-storage-checkpoint-evidence-check',
      comment: 'Fence 7b: @aws-sdk/client-s3 only in storage/ checkpoint/ evidence/ and check/s3-connectivity.ts',
      severity: 'error',
      from: {
        pathNot: [
          ...s3WritePaths,
          'src/check/s3-connectivity\\.ts$',
          // fixtures files (not in production path)
          '\\.fixtures\\.ts$',
        ],
      },
      to: { path: '^@aws-sdk/client-s3$' },
    },

    // F7c — No replay content parsing / decode in production code
    // "No parser/content-decode imports" fence. Package names are tentative until the
    // parser package is named at sign-off; pattern covers common decode/parse libraries.
    // SIGN-OFF NEEDED: finalize exact package name(s) once replay-parser-2 npm package is published.
    {
      name: 'F7c-no-replay-parser-imports',
      comment: 'Fence 7c: no replay content-parsing libraries imported anywhere in fetcher (raw bytes only)',
      severity: 'error',
      from: {},
      to: {
        // Adjust package pattern once parser package is named
        path: '^(@solidgames/replay-parser|replay-parser|rofl-parser|sc2-replay-parser)$',
      },
    },

    // F8 — No circular dependencies (baseline)
    {
      name: 'F8-no-circular',
      comment: 'Fence 8: no circular imports anywhere',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },
  },
};
