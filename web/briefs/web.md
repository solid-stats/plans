# web - GSD New Project Brief

**Created:** 2026-04-24  
**Deepened:** 2026-05-09  
**Intended command:** `$gsd-new-project --auto @/home/afgan0r/Projects/SolidGames/plans/web/briefs/web.md`  
**Application:** `web`

This document initializes the Solid Stats frontend application only. It is one part of the product alongside `replays-fetcher`, `server-2`, and `replay-parser-2`.

## Product Context

Solid Stats is a public SolidGames statistics website and moderation interface. It replaces Google Forms and file-based stat browsing with a polished mobile-first web app for stats, profiles, requests, moderation, and admin workflows.

`web` owns the browser UI and user experience. It consumes APIs from `server-2`. It does not parse replay files directly, crawl replay sources, or own PostgreSQL/RabbitMQ/S3 infrastructure.

## Product-Wide GSD Workflow

Development across `replays-fetcher`, `replay-parser-2`, `server-2`, and `web` uses AI agents plus GSD workflow only.

The following standards apply product-wide:

- Keep README and planning docs current when scope, commands, architecture, validation data, or workflow changes.
- End completed work with a clean git tree by committing intended results; do not delete completed work just to make status clean.
- Push back on requests that conflict with architecture, current logic, quality, maintainability, or proportional scope; explain the risk and propose safer alternatives.
- Check cross-application compatibility before execution.

Compatibility checks are risk-based:

- Local-only changes can rely on local planning docs, AGENTS rules, and these `gsd-briefs`.
- Parser contract, ingest staging/source identity, RabbitMQ/S3 message, artifact shape, API/data model, canonical identity, auth, moderation, or UI-visible behavior changes require checking adjacent app docs/repos when available.
- If evidence is missing or contradictory, ask the user before proceeding.

## Core Value

Make SolidGames statistics easy to inspect, filter, trust, and correct through a fast public website and clear request/moderation flows.

## Product Quality Bar

`web` must feel instant, stable, and trustworthy before it feels decorative.

Priority order:

1. UX speed and continuity.
2. Accessibility.
3. SEO.
4. Core Web Vitals and bundle budgets.
5. Visual polish.

The main experience must preserve user context across navigation. A public visitor can open a stats/catalog view, scroll deep into a table, apply filters or sorting, open a detail page, press Back, and immediately return to the same table state and scroll position without a blocking reload or visible jump.

This quality bar applies to public stats pages first, then authenticated player flows, then moderator/admin workflows.

## Design Direction

- Brand/product name: Solid Stats.
- Visual direction: mobile-first esports ops.
- The site is a functional statistics product, not a marketing landing page.
- Prioritize dense but readable data, fast filtering, strong profiles, clear request flows, and efficient moderator/admin screens.
- Use a polished gaming/esports feel without sacrificing readability or accessibility.
- Public stats are available without login.
- Steam login is required for requests and account-specific pages.
- UI must support Russian and English from the start.
- The UI should be simple, beautiful, and laconic.
- Prefer dense but readable operational interfaces over marketing-heavy composition.
- First visual system target: dense esports operations UI. The product should feel like a fast stat operations surface, not like a marketing or fan-content site.
- Default theme is dark, with a first-class light theme available from the start.
- Primary navigation uses a top navigation model on desktop and mobile tabs for core public stat surfaces. Authenticated/admin actions live behind account or role-aware navigation.
- Stats overview should prefer tables, rankings, and microcharts over large dashboard charts.
- Typography should use a distinctive but readable UI type direction, with tabular numerals or a compatible numeric face for stats, ranks, timers, and IDs.
- Avoid decorative UI that harms scanability, table usability, accessibility, or Core Web Vitals.
- Do not use emoji as structural icons; use Lucide as the single SVG icon family.
- Avoid nested cards, card-heavy decorative sections, one-note color palettes, and ornamental gradients/blobs.
- Use stable dimensions for tables, cards, media, skeletons, filters, toolbars, and controls.

## Frontend Stack

- TanStack-first React/TSX architecture.
- Use TanStack Start as the primary application framework and rendering layer.
- TanStack Router for URL-first navigation, route-level code splitting, preloading, and scroll restoration.
- TanStack Query for server-state caching, prefetching, stale-while-revalidate behavior, optimistic reads where safe, and avoiding blocking reloads on back navigation.
- TanStack Table for table state, sorting, filtering, pagination/cursor handling, and virtualization where row counts require it.
- Nano Stores only for lightweight client state that does not belong in the URL, router state, or TanStack Query cache.
- vanilla-extract for styling and design tokens unless a later phase documents a stronger alternative.
- Ark UI for accessible headless primitives such as dialogs, menus, tabs, selects, tooltips, and popovers.
- Typed ICU-capable i18n is required for RU/EN UI, pluralization, formatting, and localized metadata.
- `openapi-typescript` for generated API types from the `server-2` OpenAPI schema.
- Runtime and deployment target: Node.js service in Docker.

## Rendering, Caching, and Realtime Strategy

- SEO-important public pages must return meaningful HTML before client JavaScript runs.
- Use SSR, streaming, SSG, or ISR-style regeneration according to data freshness and framework support.
- Public detail pages should be renderable and indexable without relying on client-only fetching.
- Route-level bundles must split heavy catalog, table, detail, moderation, and admin code.
- Static assets should use long-lived immutable caching when content-hashed.
- Data fetching should use explicit cache lifetimes and stale policies per query type.
- List/detail navigation should prefetch detail data when likely and preserve list data in cache on return.
- Public stats may use long cache lifetimes because SSE supplies freshness signals. Cached or stale data must be explicitly labeled when offline, timed out, or served after backend errors.
- Real-time updates should use SSE by default.
- WebSocket is reserved for flows where the client must send live messages to the server.
- SSE updates must not reorder or insert content above the current viewport in a way that causes layout shift.
- When live data changes while the user is reading a table, prefer a "new updates available" affordance or controlled merge over unexpected viewport movement.
- SSE merge behavior is page-specific: small local changes can auto-merge with a notification; large recalculations or updates that affect multiple tables/charts require explicit user confirmation before applying.
- Reconnect, offline, timeout, and stale-data states must be visible, accessible, and testable.

## Users

### Public Visitor

- Views public stats without login.
- Searches players and squads.
- Opens player/squad/rotation/commander/bounty pages.

### Player

- Logs in through Steam OAuth via `server-2`.
- Submits correction/identity requests.
- Uploads evidence attachments.
- Tracks request status and moderator decisions.

### Moderator

- Reviews request queue.
- Opens request details, evidence, linked entities, and audit context.
- Approves/rejects with a comment.
- Manually fills old commander-side winner data when needed.

### Admin

- Manages moderator/admin roles.
- Manages rotations.
- Reviews parse job/failure status through `server-2` APIs.

## v1 Scope

The first launch slice prioritizes public stats quality first, while still treating the authenticated request loop and admin/ops screens as launch-blocking v1 work.

Public stats implementation priority:

1. Player and squad lists/profiles.
2. Commander-side stats.
3. Bounty stats and leaderboards.

### Public Pages

- Stats overview.
- Player list with search/filtering.
- Player profile.
- Squad list with search/filtering.
- Squad profile.
- Rotation pages or rotation filter views.
- Commander-side stats.
- Bounty stats/leaderboards.
- Public replay detail pages.

### Authenticated Player Pages

- Steam OAuth login/session UI.
- Request submission.
- Evidence attachment upload.
- Request status/history.

### Moderator/Admin Pages

- Request queue.
- Request detail/review.
- Request approval/rejection with comment.
- Admin role management.
- Admin rotation management.
- Ingest conflict/status and parser/job failure visibility through `server-2` APIs, with limited actions only for explicitly audited backend endpoints.

### Critical Navigation Journey

This journey is a launch-blocking UX requirement:

1. User opens a public stats/catalog table.
2. User applies filters, sorting, search, and/or pagination/cursor state.
3. User scrolls deep into the result set.
4. User opens a detail page.
5. User presses browser Back.
6. The original table state, scroll position, virtualized row position, filters, sorting, search, and cached data are restored immediately.
7. No blocking reload, loading flash, hydration mismatch, console error, or layout shift is allowed.

### Out of Scope

- Rust parser implementation.
- Replay source crawling or ingest implementation.
- Backend API implementation.
- PostgreSQL/RabbitMQ/S3 infrastructure.
- Google Forms.
- Financial reward/payment UI.
- Supporting replay upload UX beyond the API-backed flows explicitly required by `server-2`.
- Annual/yearly nomination statistics and nomination pages; these are a separate v2 product surface.
- Player/squad/rotation comparison views; comparison is v2.
- Global search or command-palette search across the full product; v1 search is scoped to the relevant public table or surface.
- Full marketing/news portal unless later added.

## Clarified v1 Product Contracts

### Public URL Model

- Public player and squad URLs are slug-only. The current slug owner is authoritative.
- Different players cannot have the same active nickname at the same time.
- Historical slug stability is not guaranteed. If a nickname is reused by another player later, the slug route opens the current owner.
- Replay detail URLs use replay ID only.
- Rotation URLs should exist as canonical pages, and rotation must also be available as a filter context across key stat surfaces.

### Public Tables and State

- Public tables should be designed for 10k-100k row datasets.
- Search, filters, sorting, and cursor/pagination are server-driven.
- Shareable core state belongs in the URL: search, filters, sorting, and cursor/page.
- Ephemeral state belongs outside the URL: scroll position, virtualized row position, table density, and cached data.
- Mobile table baseline: compact rows with sticky context/filter controls and detail navigation.
- Desktop table baseline: dense productivity views with a user-facing density toggle.

### Public Data Trust

- Public UI should show visible provenance where available: last updated state, relevant replay/source links, unknown badges, conflict badges, and parse/status context.
- Legacy commander-side games with unknown outcome must be shown as an explicit unknown status and be filterable.
- Bounty points should include formula breakdown where data exists, including victim player effectiveness, squad effectiveness, and rotation context.
- Squad effectiveness should be explainable on squad and bounty surfaces, not hidden as an opaque number.
- Player profiles may show public-safe Steam identity state. SteamID may be displayed only in masked form, with only the last four digits visible.
- Full nickname history is public. Squad membership history should be public as a timeline with dates and unknown gaps where available.

### Replay Pages

- Replay detail pages are public and indexable.
- Replay pages should server-render summary and participant context first.
- Timeline/event data should load progressively so replay pages keep good LCP and avoid excessive initial HTML.
- Mobile replay event UI should use a grouped timeline. Desktop replay event UI should use a dense table with filters.
- Key replay events should provide request entrypoints where appropriate, especially kills, teamkills, commander disputes, player identity/squad anomalies, and bounty-relevant events.
- Event-linked requests should carry replay, event, and actor context where available.

### Requests and Moderation

- Auth-gated actions use inline login prompts and return the user to the original flow after Steam OAuth.
- v1 request flows are separate guided flows for: identity, add/remove kills, add/remove teamkills, remove player from replay, and commander dispute.
- Request forms use short steppers. They do not include a final review step.
- Validation behavior: after submit, show validation errors and then update them live as each error is fixed.
- Requests require guided linked entities where the request type needs them.
- Request approval creates or confirms a correction event; `server-2` applies corrections and recalculates affected aggregates.
- Player request drafts are `server-2` resources, not local-only state. `web` SSR prefetches drafts to avoid hydration-only form filling.
- Drafts are created after the first meaningful edit, autosaved with debounced save/saving/error states, and expire after 7 days.
- Evidence support in v1: image uploads and external links. Use moderate upload limits by default and show safe external-link handling.
- Request UI must handle rate-limit, duplicate, cooldown, validation, and rejection states from `server-2`.
- Request visibility is limited to the requester and staff.
- All moderation comments are visible in request history.
- Request status notifications are in-app only for v1.
- Rejected requests can be reopened.
- Request detail uses an immutable audit timeline.
- Bulk moderation decisions are out of scope for v1.
- Moderator queue default priority is risk plus age.

### Admin and Ops

- Request moderation, role management, rotation management, and ops visibility are all launch-blocking v1 surfaces.
- RBAC UI is driven by roles plus explicit capabilities from session/API data.
- Unauthorized admin/mod routes show a contextual 403 page with missing-rights context and recovery actions.
- Ops views may include limited actions such as retry or mark-reviewed only when the backend API explicitly supports them and auditability is available.

## UX Requirements

### Mobile-First

- Mobile is the primary target.
- Public stats must be usable on phone screens.
- Dense tables need mobile-specific layouts such as compact rows, sticky context, filters, or responsive detail views.
- Desktop must still support large tables and moderator productivity.

### Accessibility

- Target WCAG 2.2 AA minimum, with AAA-quality behavior where practical.
- Visible focus states for all interactive controls.
- Keyboard navigation for menus, forms, dialogs, tabs, tables, filters, pagination, and moderation actions.
- No keyboard traps.
- Focus must not be hidden by sticky headers, toolbars, or fixed panels.
- Provide skip links and semantic landmarks.
- Use a logical heading hierarchy with one meaningful page H1.
- Sufficient color contrast: 4.5:1 for normal text, 3:1 for large text and UI graphics.
- Do not convey meaning by color alone.
- No icon-only buttons without accessible names; tooltips are not a substitute for accessible names.
- Form fields have visible labels, helper text where needed, and associated errors.
- Errors appear near fields, are announced accessibly, and include recovery guidance.
- Dynamic updates, upload/progress states, reconnect states, and async errors use appropriate live-region behavior without stealing focus.
- Route changes should manage focus for screen reader users.
- Table sort/filter state must be announced correctly.
- Touch targets should be at least 44x44 CSS pixels for primary controls where layout allows, and never below WCAG 2.2 minimum target-size requirements.

### Performance

- Use route-level splitting where useful.
- Use TanStack Query caching for stats.
- Avoid blocking public pages on unnecessary authenticated data.
- Keep filtering/searching responsive.
- Use skeleton/loading states for stats and request pages.
- Preserve list/table state, query cache, and scroll position across list-to-detail-to-back navigation.
- Virtualize large lists/tables where needed, while keeping keyboard navigation and screen reader behavior usable.
- Keep interaction handlers short; defer non-critical work so INP remains within budget.
- Reserve space for all async content to prevent layout shift.
- Avoid client-only rendering for SEO-critical content.
- Skeletons must reserve final layout space and avoid CLS.
- Filtering and searching should use debouncing or transitions where needed.
- CPU-heavy transforms should move off the main thread or be chunked when datasets require it.

### Core Web Vitals

- LCP must be 2.5s or lower at the 75th percentile target.
- INP must be 200ms or lower at the 75th percentile target.
- CLS should be 0.02 or lower and must not exceed 0.05 for critical journeys.
- No image, media, table, skeleton, font, hydration, or SSE update may cause avoidable layout shift.
- LCP content should be in initial HTML and should not wait for client-side fetches.
- Critical fonts and images should be loaded deliberately; avoid unnecessary preload usage.
- Animations must use transform/opacity and respect `prefers-reduced-motion`.
- Third-party scripts are blocked by default unless a phase explicitly justifies them.
- Bundle budgets must be defined and enforced in CI.

### SEO

- Public indexable pages need unique title tags and meta descriptions.
- Use canonical URLs for indexable pages.
- Provide sitemap and robots configuration.
- Use structured data where applicable, including `VideoGame`, `BreadcrumbList`, and `ItemList` when the page content supports it.
- Detail pages must have server-rendered meaningful content.
- Avoid creating crawl traps from volatile filter/search combinations.
- Non-indexable dynamic states should use explicit noindex/canonical strategy.
- Descriptive link text is required; avoid generic "read more" style links.
- Important pages must not depend on authenticated data for public rendering.
- Indexable v1 public surface: overview, player/squad lists, player/squad profiles, rotation pages, commander pages, bounty pages, and replay detail pages.
- All replay detail pages are indexable.
- Arbitrary search/sort/cursor URLs must not create crawl traps. Use curated indexable filter/category URLs and explicit canonical/noindex handling for volatile states.
- Large public URL sets, especially replay pages, require segmented sitemaps through a sitemap index.

### Internationalization

- Russian and English required from the start.
- UI strings should not be hardcoded directly in components without an i18n path.
- Public localized routes use `/ru/...` and `/en/...` prefixes.
- First visit to `/` redirects by browser language preference where possible, with an explicit language switcher and persisted user choice.
- Dates and times are localized for the user. Ops/moderation contexts should expose UTC in a secondary hint or tooltip where useful.

## Key Screens

### Stats Overview

- Shows current/high-level stats.
- Entry points to players, squads, rotations, commander stats, and bounty stats.
- Public and fast.
- Uses tables, leaderboards, compact rankings, and microcharts rather than a chart-heavy dashboard.

### Player Profile

- Current display name.
- Nickname history.
- Steam/account link state where public-safe.
- Current/previous squad history.
- Rotation stats.
- Bounty-related stats.
- Links to relevant replays or stat details where API supports them.
- Mobile order: summary/header, key stats, squad/status context, then tabs for rotations, bounty, history, replay context, and provenance.

### Squad Profile

- Current/known squad identity.
- Historical membership view where available.
- Squad rotation stats.
- Squad effectiveness inputs relevant to bounty scoring.
- Squad effectiveness is explained where it affects bounty scoring.

### Commander-Side Stats

- Commander-side games.
- Wins/losses where known.
- Unknown outcomes for legacy data.
- Filters by rotation/player/side where API supports it.

### Bounty Stats

- Per-rotation bounty leaderboards.
- Enemy-kill based points.
- Clear distinction that this is points/statistics only, not money.
- Show why a kill was valuable where API provides data: victim player effectiveness component, squad effectiveness component, and rotation context.

### Replay Detail

- Public and indexable.
- Shows replay summary, map/rotation/date where available, participants, sides, parse/provenance state, and key stats.
- Shows replay timeline/events progressively.
- Provides request entrypoints from key events where a correction may be submitted.
- Mobile uses grouped timeline sections; desktop uses dense event tables with filters.

### Request Submission

- User chooses request type.
- User links relevant player/replay/squad/stat where possible.
- User writes description.
- User uploads evidence attachments.
- Form validates and shows upload/submit progress.
- Success state clearly shows created request and next step.
- Request types are separate guided flows for identity, add/remove kills, add/remove teamkills, remove player from replay, and commander dispute.
- Drafts are loaded from `server-2`, autosaved after meaningful edits, and kept for 7 days.
- Evidence supports image uploads and external links.
- Validation errors appear after submit, then update live as the user fixes each issue.

### Moderator Request Queue

- Filter by status/type/date.
- Shows requester, request type, affected entity, age, and priority/status.
- Mobile usable, desktop efficient.
- Default sorting prioritizes risk plus age.

### Request Detail

- Shows submitted text, attachments, linked entities, current stats/context, and audit history.
- Moderator can approve/reject with required comment.
- Approved corrections should make clear that `server-2` will recalculate aggregates.
- All moderation comments are visible in request history.
- Shows an immutable audit timeline.
- Rejected requests can be reopened.

## API Assumptions

`web` consumes `server-2` APIs for:

- Public stats.
- Player/squad/rotation/commander/bounty data.
- Steam OAuth/session.
- Request creation/status.
- Request draft creation/autosave/resume.
- Attachment upload.
- Moderator actions.
- Admin roles.
- Admin rotations.
- Ingest staging/conflict status where exposed by `server-2`.
- Job/failure visibility.

`web` must use `openapi-typescript` (https://github.com/openapi-ts/openapi-typescript) to generate TypeScript API types from the `server-2` OpenAPI 3.x schema. The generated types are the default source of truth for frontend API request/response typing.

Primary OpenAPI source for generation is the live `server-2` Swagger/OpenAPI schema from a locally running or otherwise reachable backend. `web` should fail CI when generated types are stale relative to that schema.

Type safety rules:

- `server-2` owns the OpenAPI schema and keeps it versioned with API changes.
- `web` regenerates types when the OpenAPI schema changes and does not hand-write duplicate API DTO types.
- Generated API types should be used by API clients, TanStack Query hooks, request forms, moderation/admin screens, and public stats views.
- TypeScript should enable `noUncheckedIndexedAccess` for stricter generated-type safety.
- `web` uses a typed thin API client over generated OpenAPI types rather than raw scattered fetch calls.
- API and UI errors use stable unique error codes. UI recovery copy must distinguish user-action errors from application/server errors; application errors should include a path to contact the application maintainers and include request/debug identifiers where available.
- Public lists use cursor-based pagination with server-side filtering and sorting.

## Suggested Requirements

### App Foundation

- **APP-01**: React/TSX project is configured with TanStack Router.
- **APP-02**: TanStack Query is configured for API data fetching and caching.
- **APP-03**: TanStack Table is configured for table state, sorting, filtering, pagination/cursor behavior, and virtualization where needed.
- **APP-04**: Nano Stores is configured only for lightweight client state that does not belong in URL/router/query state.
- **APP-05**: vanilla-extract is configured for styling and design tokens.
- **APP-06**: TanStack Start supports meaningful server-rendered HTML for SEO-critical public pages.
- **APP-07**: Route-level code splitting and preloading are configured for public catalog/detail flows.
- **APP-08**: SSE infrastructure exists for real-time server-to-client updates.
- **APP-09**: WebSocket is not introduced unless a documented flow requires client-to-server live messaging.
- **APP-10**: RU+EN i18n foundation exists.
- **APP-11**: `openapi-typescript` is configured to generate API types from the `server-2` OpenAPI schema.
- **APP-12**: Frontend API clients and TanStack Query usage consume generated API types instead of duplicated hand-written DTO types.
- **APP-13**: Ark UI primitives are integrated for accessible headless interactive components.
- **APP-14**: App deploys as a Node.js service in Docker.
- **APP-15**: A typed thin API client wraps generated OpenAPI types, standardizes auth/session handling, error codes, and TanStack Query integration.

### Public Stats

- **STAT-01**: Public visitor can view stats overview without login.
- **STAT-02**: Public visitor can search/filter players.
- **STAT-03**: Public visitor can open player profile.
- **STAT-04**: Public visitor can search/filter squads.
- **STAT-05**: Public visitor can open squad profile.
- **STAT-06**: Public visitor can view rotation-filtered stats.
- **STAT-07**: Public visitor can view commander-side stats.
- **STAT-08**: Public visitor can view bounty stats.
- **STAT-09**: Public stats list/table state is encoded in URL where shareable and restored from navigation/session state where ephemeral.
- **STAT-10**: Opening a detail page and pressing Back restores the previous list/table state, scroll position, virtualized row position, and cached data without a blocking reload.
- **STAT-11**: Real-time SSE updates can arrive while the user is on a stats list without causing CLS or unexpected viewport movement.
- **STAT-12**: Public visitor can open indexable replay detail pages.
- **STAT-13**: Player and squad routes use slug-only current-owner resolution.
- **STAT-14**: Public table filtering, sorting, and cursor pagination are server-driven for 10k-100k row scale.
- **STAT-15**: Public UI displays provenance, unknown/conflict states, and stale-data warnings where applicable.

### Authenticated Player UX

- **AUTH-01**: User can start Steam OAuth login.
- **AUTH-02**: App reflects logged-in/logged-out session state.
- **REQ-01**: Logged-in player can submit correction/identity request.
- **REQ-02**: Request form supports evidence attachment upload.
- **REQ-03**: Player can view request status and decision.
- **REQ-04**: Request submission supports guided flows for identity, add/remove kills, add/remove teamkills, remove player from replay, and commander dispute.
- **REQ-05**: Request drafts are created, autosaved, resumed, and expired through `server-2`.
- **REQ-06**: Request validation, duplicate, cooldown, rate-limit, and rejection states are represented with actionable UI.
- **REQ-07**: Rejected requests can be reopened.

### Moderation/Admin

- **MOD-01**: Moderator can view request queue.
- **MOD-02**: Moderator can review request detail and attachments.
- **MOD-03**: Moderator can approve/reject with comment.
- **ADMIN-01**: Admin can manage roles.
- **ADMIN-02**: Admin can manage rotations.
- **OPS-01**: Admin/moderator can view ingest conflicts/status and parser/job failures through `server-2` APIs.
- **OPS-02**: Ops views expose limited audited actions only where `server-2` explicitly supports them.
- **RBAC-01**: Admin/moderator UI is driven by roles plus capabilities from session/API data.

### UX Quality

- **UX-01**: Mobile layouts are first-class for public stats.
- **UX-02**: Desktop layouts support efficient table-heavy workflows.
- **UX-03**: Forms have visible labels, inline validation, loading, success, and error states.
- **UX-04**: Interactive elements are keyboard accessible.
- **UX-05**: UI uses accessible contrast and focus states.
- **UX-06**: Route changes manage focus correctly for screen reader users.
- **UX-07**: Reduced-motion users do not receive non-essential animation.
- **UX-08**: Loading, empty, error, offline, reconnecting, and stale-data states are designed and implemented for critical screens.
- **UX-09**: No critical journey has avoidable CLS.
- **UX-10**: The visual system is simple, laconic, responsive, and operational rather than marketing-heavy.

### SEO and Metadata

- **SEO-01**: Public pages have unique titles and meta descriptions.
- **SEO-02**: Public detail pages render meaningful HTML before client JavaScript.
- **SEO-03**: Canonical URLs are defined for indexable pages.
- **SEO-04**: Sitemap and robots configuration exist.
- **SEO-05**: Structured data is added where content supports it.
- **SEO-06**: Filter/search URLs do not create crawl traps.
- **SEO-07**: Localized public routes use `/ru/...` and `/en/...` with canonical/hreflang behavior.
- **SEO-08**: Replay detail pages are indexable and covered by segmented sitemaps.

### CI, Playwright, and Quality Gates

- **CI-01**: Playwright is configured and required in CI.
- **CI-02**: Critical journeys are covered by Playwright before launch.
- **CI-03**: Browser matrix includes Chromium, Firefox, WebKit, mobile Chrome-like viewport, mobile Safari/WebKit viewport, reduced-motion mode, and high-contrast or forced-colors checks where feasible.
- **CI-04**: Playwright covers catalog render, search/filter/sort, list-to-detail-to-back restoration, query-cache preservation, SSE update behavior, loading/error states, keyboard navigation, and responsive smoke flows.
- **CI-05**: Accessibility checks run in Playwright with axe or an equivalent tool; serious and critical violations block merge.
- **CI-06**: Console errors during critical journeys block merge.
- **CI-07**: Scroll restoration, cache restoration, and CLS regressions block merge.
- **CI-08**: Lighthouse or equivalent budgets for performance, accessibility, and SEO block merge for critical pages.
- **CI-09**: Bundle budgets block merge when exceeded.
- **CI-10**: Smoke screenshot regression tests cover key desktop and mobile states without turning every minor visual change into a high-maintenance full visual gate.
- **CI-11**: Full Playwright browser/performance matrix runs on every PR.
- **CI-12**: Playwright E2E tests run against a deterministic seeded `server-2` backend.
- **CI-13**: Local frontend development requires a reachable `server-2` API; mocks are not the primary development mode.

## Suggested GSD Initialization Settings

- Granularity: Standard.
- Execution: Parallel where possible.
- Git tracking: Yes.
- Research: Yes.
- Plan Check: Yes.
- Verifier: Yes.
- Model profile: Balanced or Quality.

## Key Decisions

| Decision | Outcome |
|----------|---------|
| Product name | Solid Stats |
| Frontend stack | TanStack Start + React + TSX |
| Router | TanStack Router |
| Data fetching | TanStack Query |
| Tables | TanStack Table |
| Rendering | TanStack Start SSR for SEO-critical public pages |
| Runtime | Node.js in Docker |
| Realtime | SSE by default; page-specific auto/manual merge behavior |
| Cache posture | Long public cache lifetimes plus SSE freshness and stale banners |
| API typing | `openapi-typescript` generated from live `server-2` Swagger/OpenAPI |
| API client | Typed thin client over generated OpenAPI types |
| Client state | Nano Stores |
| Styling | vanilla-extract |
| UI primitives | Ark UI |
| Icons | Lucide only |
| Auth source | Steam OAuth through `server-2` |
| Public stats | Visible without login |
| Languages | Russian and English via `/ru` and `/en` routes |
| i18n | Typed ICU-capable i18n |
| Design direction | Dense mobile-first esports ops |
| Theme | Dark default with first-class light theme |
| Navigation | Desktop top nav; mobile tabs for core public stats |
| Public route model | Player/squad slug-only current-owner routes; replay ID routes |
| Public table model | Server-driven filtering, sorting, cursor pagination for 10k-100k row scale |
| Launch priority | Public player/squad stats, then commander stats, then bounty |
| Replay pages | Public, indexable, summary SSR plus progressive timeline/events |
| Request flows | Identity, add/remove kills, add/remove teamkills, remove player from replay, commander dispute |
| Request drafts | `server-2` drafts, created after meaningful edit, debounced autosave, 7-day TTL |
| Moderation | Risk-plus-age queue, immutable audit timeline, reopen rejected requests, no bulk decisions v1 |
| Admin/ops | Requests, roles, rotations, and limited ops actions are launch-blocking |
| Quality priority | UX continuity, then accessibility, then SEO |
| CI gate | Full Playwright browser/performance matrix every PR, axe, Lighthouse/budgets, bundle budgets, smoke screenshots |
| E2E data | Deterministic seeded `server-2` backend |
| Parser ownership | `replay-parser-2` |
| Ingest ownership | `replays-fetcher` through `server-2` APIs only |
| Backend ownership | `server-2` |

## Follow-Up Details for Implementation Phases

- Exact visual identity tokens: palette, type scale, spacing scale, density scale, elevation, and state colors.
- Exact typed ICU i18n library and translation file layout.
- Exact live `server-2` OpenAPI URL, generation command, generated output path, and stale-generated-types CI check.
- Exact TanStack Query cache lifetimes per query family.
- Exact SSE event contract, reconnect policy, event classification, and per-page merge rules.
- Exact request draft API, autosave conflict behavior, and 7-day cleanup semantics.
- Exact image evidence limits, allowed MIME types, scanning/validation behavior, and upload API contract.
- Exact role/capability matrix for moderator, admin, and ops actions.
- Exact seeded `server-2` E2E dataset and Playwright runtime budget for full PR matrix.
