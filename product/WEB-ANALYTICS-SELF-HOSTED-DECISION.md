# Decision: self-hosted web analytics stack

Date: 2026-07-02

Status: accepted planning decision

## Decision

Use a two-tool self-hosted analytics stack for Solid Stats:

- **Plausible Community Edition** is the primary web analytics tool for
  traffic metrics: visits, unique visitors, pageviews, referrers, campaigns,
  goals, and custom events.
- **OpenReplay** is the companion UX diagnostics tool for qualitative behavior
  analysis: session replay, heatmaps, click/scroll behavior, rage/dead-click
  investigation, and replay-backed debugging.

Do not try to force one product to cover both jobs. Plausible is the better fit
for a lightweight, privacy-first traffic dashboard; OpenReplay is the better
fit for replay and heatmap workflows. The split is intentional even though it
adds a second service to operate.

## Why This Split

The product needs two different kinds of signal:

- **Quantitative traffic analytics**: how many people visit, which pages and
  sources matter, what devices/browsers/countries dominate, and whether goals
  or campaigns convert.
- **Qualitative UX diagnostics**: what users click, where they get stuck, how a
  real session unfolded, and whether a UI change fixes visible friction.

Plausible's own positioning is focused website analytics. It explicitly does
not record sessions, mouse movements, rage clicks, or heatmaps. OpenReplay
does provide web analytics cards, but its strongest value is replay-backed UX
and debugging; using it as the only traffic dashboard would make the baseline
analytics experience less focused than Plausible.

## Responsibilities

| Need | Primary tool | Notes |
|------|--------------|-------|
| Visits, unique visitors, pageviews | Plausible CE | Source of truth for headline public-web traffic metrics. |
| Referrers, campaigns, top pages, goals, custom events | Plausible CE | Keep dashboard readable for product decisions. |
| Browsers, devices, countries | Plausible CE | OpenReplay can also segment sessions, but Plausible remains primary. |
| Session replay | OpenReplay | Use only on approved surfaces with masking/private-mode policy. |
| Heatmaps, click/rage-click analysis | OpenReplay | Use for UX investigations and post-change validation. |
| Debug context around a user session | OpenReplay | Useful when frontend behavior is hard to reproduce from logs alone. |

## Rejected Alternatives

| Alternative | Why not |
|-------------|---------|
| Plausible only | Does not provide heatmaps or session replay. |
| OpenReplay only | Has web analytics, but the traffic-dashboard job is better served by Plausible. |
| PostHog only | Too broad and operationally heavier for the current need; reserve for future product analytics, feature flags, experiments, or surveys. |
| Matomo only | Mature GA-like option, but heatmap/session recording is a paid yearly plugin and the stack is less focused than the chosen split. |
| Rybbit only | Promising self-hosted analytics with replay, but heatmaps are not the clearest first-class fit for this decision. |
| Umami or GoatCounter | Good lightweight web analytics options, but too basic for replay/heatmap requirements. |

## Adoption Notes

- Treat both tools as infrastructure: backups, upgrades, retention, dashboard
  access, and security updates need explicit ownership in `infrastructure`.
- Keep analytics snippets out of sensitive flows until the privacy policy is
  written down. Start with public pages and explicitly approved product views.
- Do not send sensitive data in URLs, query parameters, custom event names, or
  analytics properties.
- Configure OpenReplay privacy controls before recording real users. Prefer
  masking/private mode by default, then loosen only for specific low-risk
  diagnostic flows.
- Use sampling or route allowlists for OpenReplay if full replay volume is too
  expensive or too privacy-sensitive.
- Plausible and OpenReplay dashboards should not be public by default; access
  belongs to operators/product maintainers only.

## Pre-Adoption Spikes

- Confirm the exact OpenReplay behavior on Solid Stats SPA routes, including
  heatmap URL matching and modal-heavy states.
- Verify replay rendering for the production CSS/font asset setup.
- Decide OpenReplay retention and sampling before launch.
- Decide whether Plausible and OpenReplay are served from analytics subdomains
  or proxied through the main web domain.
- Estimate infra size from real traffic before committing to production
  retention windows.

## Next Planning Work

- `infrastructure`: deployment brief for Plausible CE and OpenReplay, including
  backups, upgrades, TLS, storage, retention, and access control.
- `web`: implement the public-flow instrumentation contract from
  `product/PUBLIC-FLOWS-ANALYTICS-DECISIONS.md`, including sanitized route
  templates, low-cardinality flow events, route allowlists, and data masking.
- `product`: use `product/PUBLIC-FLOWS-ANALYTICS-DECISIONS.md` as the first
  dashboard question set after rollout.

## Source Notes

- Plausible self-hosting and CE:
  https://plausible.io/self-hosted-web-analytics
- Plausible limitations for heatmaps/session replay:
  https://plausible.io/when-not-to-use-plausible
- Plausible CE setup:
  https://github.com/plausible/community-edition
- OpenReplay web analytics:
  https://docs.openreplay.com/en/product-analytics/web-analytics/
- OpenReplay heatmaps:
  https://docs.openreplay.com/en/product-analytics/heatmaps/
- OpenReplay self-hosting requirements:
  https://docs.openreplay.com/en/deployment/deploy-ubuntu/
- Matomo heatmap/session recording plugin:
  https://matomo.org/faq/heatmap-session-recording/faq_24205/
- Umami overview:
  https://docs.umami.is/docs
- PostHog self-hosting:
  https://posthog.com/docs/self-host
- Rybbit self-hosted vs cloud:
  https://rybbit.com/docs/self-host-vs-cloud
