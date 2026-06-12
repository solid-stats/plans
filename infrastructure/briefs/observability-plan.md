# Observability Plan

This plan captures the intended staging observability stack for Solid Stats. It
is a planning document, not an implementation runbook. The first reader should
be able to understand the target architecture, what is intentionally in scope,
what is deferred, and how to start implementation safely.

> **Update 2026-06-12 (decision D2).** The first version below remains
> **staging-first**, but production observability is **no longer deferred
> indefinitely**: per the pre-prod decision (see `product/RELEASE-PLAN.md`), the
> full stack must be **live on production before the backend takes traffic**.
> The path is staging-first → validate → **mirror the config to a production
> namespace**. See [Production mirror](#production-mirror-d2) for the net-new
> prod scope this adds.

## Goal

Add full self-hosted observability for the staging k3s environment:

- Grafana and Prometheus for system, Kubernetes, and workload metrics.
- Loki and Grafana Alloy for Kubernetes logs.
- GlitchTip for Sentry-compatible application error tracking.

The stack should run inside k3s, stay separate from the application runtime
deploy path, and use public staging domains protected by local application
authentication.

## Decisions

- Deploy observability into k3s, not Docker on the host.
- Use two namespaces: one for metrics/logging and one for error tracking.
- Use Helm values rendered before apply, then apply rendered manifests through
  the existing remote Kubernetes deployment model.
- Keep observability deployment separate from the staging runtime deployment.
- Use public domains:
  - `grafana.stats-staging.solid-stats.ru`
  - `errors.stats-staging.solid-stats.ru`
- Use local users for Grafana and GlitchTip. Do not add OAuth in the first
  version.
- Keep external alerts out of the first version.
- Use GlitchTip instead of self-hosted Sentry because it is lighter and still
  works with Sentry SDKs.
- Give GlitchTip its own PostgreSQL database, separate from the application
  database.
- Store only configuration as the source of truth. Staging observability data
  can be lost and rebuilt.
- Collect Kubernetes logs conservatively from the whole cluster.
- Send application errors only to GlitchTip in the first pass. Do not enable
  traces or application-log ingestion there yet.
- Keep secrets sourced from GitHub environment secrets and rendered into
  Kubernetes Secrets.
- Add Postgres and RabbitMQ exporters in the first version.
- Set resource quotas only after a resource preflight snapshot.
- Enforce NetworkPolicy only after confirming the staging CNI supports it.

## Scope

In scope:

- Resource preflight for CPU, memory, disk, storage class, ingress, TLS, CNI,
  and existing packaged k3s components.
- Monitoring namespace for Grafana, Prometheus, kube-state-metrics,
  node-exporter, Loki, and Alloy.
- Error-tracking namespace for GlitchTip and its database.
- Grafana dashboards from the standard charts plus a small Solid-specific set
  for workloads, rollouts, queues, database health, backups, and CronJobs.
- Loki retention around 7-14 days.
- Conservative log collection that avoids parsing request bodies or secrets.
- Separate observability CI/manual workflow.
- Separate application repository PRs for Sentry SDK integration.
- Validation through dry-runs, rollout checks, datasource checks, log queries,
  exporter target health, and a test error event.

Out of scope for the first version:

- Production observability — **scoped, not abandoned.** The first version stays
  staging-only; production rollout is handled as a follow-on mirror, see
  [Production mirror](#production-mirror-d2).
- Production traffic cutover.
- Long-term backups for metrics, logs, or error events.
- External alert delivery through Telegram, Discord, Slack, or email.
- OAuth or SSO.
- Traces, APM, or session replay.
- GlitchTip application-log ingestion.
- Full custom dashboards for every domain workflow.

## Implementation Plan

1. Start with a GSD workflow before editing implementation files.
2. Run discovery and preflight checks against the staging VPS and cluster.
3. Confirm public edge ownership: k3s Ingress, host nginx, TLS, and DNS.
4. Add the observability deployment path with Helm rendering and remote apply.
5. Add secret rendering for Grafana, GlitchTip, database, exporter, and public
   host configuration.
6. Add namespaces, then add NetworkPolicy only after CNI enforcement is proven.
7. Deploy the metrics stack and verify Prometheus targets and Grafana access.
8. Deploy Loki and Alloy, then verify that cluster logs appear in Grafana.
9. Deploy GlitchTip with its own database, closed registration, and local users.
10. Add Postgres and RabbitMQ exporters and wire first dashboards.
11. Prepare separate application repository PRs for errors-only Sentry SDK
    integration in `server-2`, `replay-parser-2`, and `replays-fetcher`.
12. Validate the full stack with dry-runs, rollouts, datasource checks, a Loki
    query smoke test, exporter health, and a forced test error.

## Validation Gates

- The staging runtime deployment must not depend on the observability
  deployment succeeding.
- Rendered manifests must pass Kubernetes dry-run validation before apply.
- Grafana must have healthy Prometheus and Loki datasources.
- Prometheus must show healthy Kubernetes, Postgres, and RabbitMQ targets.
- Loki must show recent logs from application and system namespaces.
- GlitchTip must receive a deliberate staging test error.
- No secret values should be visible in rendered manifests, logs, dashboards, or
  committed documentation.

## Production mirror (D2)

Added 2026-06-12. The staging stack above ships first; production observability
is then brought up by **mirroring the validated staging config into a production
namespace**, and it must be live and validated **before the backend takes
production traffic**. Reuse, do not redesign — the staging Helm values, rendered
manifests, dashboards, and exporter wiring are the source artifacts.

What is genuinely net-new for the production mirror (not covered by the
staging-only first version):

- **Production sizing.** Re-do the resource preflight against the production VPS;
  staging CPU/memory/disk/storage-class numbers do not transfer.
- **Retention.** Pick production Loki / Prometheus retention deliberately
  (staging's ~7–14 day Loki window is a staging default, not a prod policy).
- **Observability-data backups.** Staging explicitly treats obs data as
  disposable ("can be lost and rebuilt"); decide what — if anything — is backed
  up in production (dashboards/config at minimum; metrics/logs/error history TBD).
- **Production domains + auth.** Production hostnames for Grafana/GlitchTip; local
  users carry over for v1 (OAuth/SSO still out of scope unless revisited).
- **Production secrets** sourced from the production environment, rendered into
  the production namespace — same model as staging, distinct values.
- **Edge/TLS ownership** on the production host (the same open question as
  staging, answered separately for prod).

Out of scope even for the mirror (still deferred): external alert delivery,
traces/APM/session replay, GlitchTip application-log ingestion, OAuth/SSO.

Sequencing: this mirror is part of the `infrastructure` v2 production-readiness
work. The full stack (metrics + logs + error tracking) is required on production
before traffic; it is **not** reduced to the parity-critical visibility subset.

## Open Questions

- Which public edge layer will own TLS and routing after discovery?
- For the production mirror: what production sizing, retention, and
  obs-data-backup policy apply, and which host/edge owns production TLS?
- What exact CPU, memory, disk, and retention limits fit the staging VPS?
- Which sibling application repositories are present locally when the SDK PRs
  are prepared?
