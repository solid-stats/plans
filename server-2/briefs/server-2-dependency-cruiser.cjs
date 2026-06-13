/**
 * server-2 — dependency-cruiser boundary preset (draft, parity with the fetcher's)
 *
 * Feature-module model (downward-only inside each module, no cross-module reach-arounds):
 *   Modules        src/modules/<feature>/   (admin, auth, ingest, operations,
 *                                             public-stats, requests, statistics)
 *   Cross-cutting  src/infra/  src/config/  (db, logging, metrics, queue, runtime, storage, env)
 *
 * Role files inside a module (downward-only layer order):
 *   routes / controller  →  usecase  →  service  →  repository
 *   plus leaf files: schemas / models / errors / types
 * Both flat (src/modules/<f>/repository.ts) and nested (src/modules/<f>/repository/repository.ts,
 * src/modules/<f>/service/service.ts, src/modules/<f>/routes/routes.ts) layouts exist in the real
 * tree, so every role pattern matches a *filename* anywhere under a module dir.
 *
 * REALITY CHECK (confirmed by file listing + grep, 2026-06-13):
 *   - There are NO `index.ts` barrels in any module today. Rule C1 (cross-module via index only)
 *     is therefore a forward-looking convention: it will flag EVERY current cross-module import.
 *     See companion notes for the concrete violation list.
 *   - There are NO `*.controller.ts` / `*.usecase.ts` / `*.errors.ts` files today; the role
 *     patterns below still encode the intended layer order and will activate as those roles land.
 *   - Imports use NodeNext `.js` specifiers; depcruise resolves them to real `src/...` `.ts` paths,
 *     so all `from`/`to` matching is on resolved `src/...` paths (extension-agnostic).
 */

// ─── Module + cross-cutting path arrays (named constants — convention from the fetcher preset) ─────

const modulePaths = ['^src/modules/'];

// Cross-cutting leaf bands — nothing inside may import a feature module (no upward).
const crossCuttingPaths = ['^src/infra/', '^src/config/'];

// ─── Role-file patterns (match a filename anywhere under a module dir; flat or nested) ──────────────
// `[^/]*` lets `routes.ts`, `role-routes.ts`, `sitemap-routes.ts` all count as routes-layer, etc.

const routesPaths     = ['/modules/.*[^/]*routes\\.ts$', '/modules/.*[^/]*controller\\.ts$'];
const usecasePaths    = ['/modules/.*[^/]*usecase\\.ts$'];
const servicePaths    = ['/modules/.*[^/]*service\\.ts$'];
const repositoryPaths = ['/modules/.*[^/]*repository\\.ts$'];

// ─── Rules ───────────────────────────────────────────────────────────────────────────────────────

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [

    // C1 — Cross-module imports only via the other module's index.ts.
    // Encodes decision-C rule 1: a file in src/modules/<A>/ may import src/modules/<B>/index.ts
    // ONLY (B !== A); reaching into any non-index file of another module is forbidden.
    // Mechanism: $1 group-captures the SOURCE module name; the `to` pathNot re-injects $1 so that
    // same-module imports (A → A, any file) are exempt, and only a foreign module's index.ts passes.
    {
      name: 'C1-cross-module-via-index-only',
      comment: 'decision-C rule 1: modules/<A>/* may import only modules/<B>/index.ts of a foreign module',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: [
          '^src/modules/$1/',            // same module ($1 = source module) — any internal file is fine
          '^src/modules/[^/]+/index\\.ts$', // a foreign module's public barrel — the only allowed entry
        ],
        dependencyTypesNot: ['npm', 'core', 'type-only'],
      },
    },

    // C2a — repository is the lowest layer: must not import routes/controller, usecase, or service.
    // Encodes decision-C rule 2 (downward-only allowlist), repository tier.
    {
      name: 'C2a-repository-no-upward',
      comment: 'decision-C rule 2: *.repository.ts must not import routes/controller/usecase/service',
      severity: 'error',
      from: { path: repositoryPaths },
      to: {
        path: [...routesPaths, ...usecasePaths, ...servicePaths],
        dependencyTypesNot: ['npm', 'core', 'type-only'],
      },
    },

    // C2b — service may import repository (downward) but not usecase or routes/controller (upward).
    // Encodes decision-C rule 2, service tier.
    {
      name: 'C2b-service-no-upward',
      comment: 'decision-C rule 2: *.service.ts must not import usecase or routes/controller',
      severity: 'error',
      from: { path: servicePaths },
      to: {
        path: [...usecasePaths, ...routesPaths],
        dependencyTypesNot: ['npm', 'core', 'type-only'],
      },
    },

    // C2c — usecase may import service/repository (downward) but not routes/controller (upward).
    // Encodes decision-C rule 2, usecase tier.
    {
      name: 'C2c-usecase-no-upward',
      comment: 'decision-C rule 2: *.usecase.ts must not import routes/controller',
      severity: 'error',
      from: { path: usecasePaths },
      to: {
        path: routesPaths,
        dependencyTypesNot: ['npm', 'core', 'type-only'],
      },
    },

    // C3 — Cross-cutting (infra/ + config/) never imports a feature module (no upward).
    // Encodes decision-C rule 3. No type-only exemption on purpose: a cross-cutting band must not
    // even type-depend on a feature, or shared shapes leak the wrong direction.
    // SIGN-OFF NEEDED: src/infra/storage/client.ts currently `import type`s from
    // modules/requests/routes/models.ts and modules/statistics/parser-artifact.ts — those fire here.
    // Resolve by moving the shared shapes (ParserArtifact, the requests model types) into
    // src/infra/ or a neutral src/types/ rather than relaxing this rule to allow type-only.
    {
      name: 'C3-cross-cutting-no-module-imports',
      comment: 'decision-C rule 3: infra/ + config/ never import src/modules/ (cross-cutting is leaf, no upward)',
      severity: 'error',
      from: { path: crossCuttingPaths },
      to: { path: modulePaths },
    },

    // C4 — No circular dependencies (baseline).
    // Encodes decision-C rule 4.
    {
      name: 'C4-no-circular',
      comment: 'decision-C rule 4: no circular imports anywhere',
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
    tsConfig: { fileName: 'tsconfig.json' },
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
