# Agent MCP Access to the Observability Stack

> **ARCHIVED (2026-06-15) · DONE.** Both MCPs registered (user scope, `~/.claude.json`) and verified connected/reading from an agent session:
> - **GlitchTip MCP** — `GLITCHTIP_ENABLE_MCP=True` set on the `glitchtip-web` container (infra PR #2, merged + deployed); registered as an HTTP MCP at `errors.solid-stats.ru/mcp` with a GlitchTip API token. Lists projects + issues.
> - **Grafana MCP** — **Grafana is now PUBLIC at `grafana.solid-stats.ru`** (the "internal-only / port-forward" finding below is superseded). Registered `mcp/grafana` as a docker **stdio** MCP with `GRAFANA_URL=https://grafana.solid-stats.ru` + a Viewer service-account token and `-t stdio`. Gotcha: pass the env directly as `docker run -e KEY=value …` — claude's own `-e` did NOT propagate into the container (that was the initial "Failed to connect"). Reads datasources (Loki + Prometheus) + dashboards.
>
> Open questions resolved: Grafana has a public domain now; tokens live in `~/.claude.json` (user scope); production agent access deferred until the prod observability stack exists. Notes below kept for history.

Follow-on to [observability-plan.md](observability-plan.md). Goal: give AI agents
(Claude Code, running locally for now) read access to the self-hosted
observability stack over MCP — Grafana for metrics and dashboards, GlitchTip for
application errors. Planning document, not a runbook.

## Goal

- Grafana: query metrics, list and read dashboards from an agent.
- GlitchTip: list and read issues / error events from an agent.
- Read-only by default. No write access unless a concrete need appears.

## Findings

### Grafana — official MCP server, no Claude plugin

- There is no Claude Code plugin for Grafana. The supported path is the official
  `grafana/mcp-grafana` MCP server, run as a stdio MCP (docker or binary).
- Auth: a Grafana **service account token** (recommended over user/password).
  Viewer role covers read-only metrics + dashboards; Editor only if the agent
  should build dashboards.
- Reachability: Grafana currently has **no public domain** (internal only). With
  the agent running locally, it connects over a `kubectl port-forward`
  (`GRAFANA_URL=http://localhost:3000`). A public Grafana domain would remove the
  port-forward requirement — see Open Questions.

### GlitchTip — native MCP, gated behind a feature flag

- The hosted Sentry MCP plugin does **not** work here: it authenticates by OAuth
  against `sentry.io` and cannot target a self-hosted GlitchTip. Do not use it
  for GlitchTip.
- GlitchTip ships a **native MCP server** at `/mcp` on the instance
  (`errors.solid-stats.ru/mcp`), Streamable HTTP transport, auth via GlitchTip
  API token.
- Root cause of the current 404: the endpoint is gated behind
  `GLITCHTIP_ENABLE_MCP=True` (default `False`), which is **not set** in the
  `infrastructure` repo's `k8s/observability/91-glitchtip.yaml`. The deployed
  image (`glitchtip/glitchtip:6.1.8`) already contains the feature, and the
  public URL is live (settings API returns 200). It is a config flag, not a
  version or DNS problem.

## Decisions

- Read-only scopes first: Grafana Viewer service account; minimal-scope GlitchTip
  API token.
- Target the local agent for the first pass; cloud/scheduled agents are a later
  concern (they would need public, authenticated endpoints rather than
  port-forward).
- Enable the GlitchTip MCP flag on the **web** container only, not the worker.
- Treat the manifest change as a GSD-tracked infra edit (`/gsd-quick`), not an
  ad-hoc edit.

## Implementation Plan

1. **(GSD, infra repo)** Add `GLITCHTIP_ENABLE_MCP=True` to the GlitchTip web
   container env in `k8s/observability/91-glitchtip.yaml`; render, dry-run,
   apply, restart. Verify `GET errors.solid-stats.ru/mcp` no longer returns 404.
2. **GlitchTip MCP register.** Create a GlitchTip API token (Profile → Auth
   Tokens), then register as a remote HTTP MCP in Claude Code
   (`claude mcp add --transport http glitchtip https://errors.solid-stats.ru/mcp`).
3. **Grafana service account.** Create a Viewer service account + token in
   Grafana.
4. **Grafana MCP register.** Run `grafana/mcp-grafana` (docker stdio) with
   `GRAFANA_URL` pointed at the port-forwarded local Grafana and
   `GRAFANA_SERVICE_ACCOUNT_TOKEN` set.

## Validation Gates

- `errors.solid-stats.ru/mcp` responds (not 404) after the flag is enabled.
- The GlitchTip MCP lists at least one project/issue from an agent session.
- The Grafana MCP returns datasource/dashboard listings from an agent session.
- No token values land in committed files, rendered manifests, or logs.

## Open Questions

- Should Grafana get a public, authenticated domain so the MCP works without a
  port-forward — and to enable future cloud/scheduled agents? (The original
  observability plan reserved `grafana.stats-staging.solid-stats.ru` but the
  instance is currently internal-only.)
- Token storage and rotation: where do the Grafana SA token and GlitchTip API
  token live for the agent, and how are they rotated?
- Production: does agent MCP access mirror to the production observability stack
  once it exists, or stay staging-only?
