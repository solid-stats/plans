# infrastructure — Tech-debt backlog

Durable list of known ops/observability debt to clear later. Not a brief; no
behavior changes implied. Surfaced 2026-06-19 during a staging deploy-status
check (Kubernetes + Grafana/Prometheus/Loki + GlitchTip).

## RabbitMQ liveness probe is too heavy → false-positive flaps

**Recorded:** 2026-06-19.

**Observed.** The staging `rabbitmq` StatefulSet uses
`liveness: exec [rabbitmq-diagnostics ping] timeout=5s period=20s #failure=3`.
`rabbitmq-diagnostics ping` boots a **separate Erlang/BEAM VM per invocation** — a heavy
operation that, under the pod's `cpu limit=1` and CPU throttling, intermittently overruns the
5 s timeout. Result: **43 `Unhealthy: liveness probe ... timed out after 5s` events over 5.5
days** (~8/day). They never land 3-in-a-row, so the `#failure=3` threshold is never crossed →
**0 restarts**, pod stays up. The broker itself is healthy throughout: no alarms, memory
0.11 / 5.0 GB, ~18.8 GB free disk, queues responsive. So the probe is the problem, not RabbitMQ.

**Fix approach (lighter probe).** Replace the VM-spawning CLI liveness check with a cheap one:

- **Liveness → `tcpSocket` on the AMQP port (5672)** — no Erlang VM at all, just a socket
  connect. Liveness only needs to answer "is the process accepting connections"; a TCP check
  is sufficient and cannot false-flap on CPU throttling.
- Keep a **heavier check for readiness** if real broker health gating is wanted there
  (e.g. `rabbitmq-diagnostics check_port_connectivity`, or `ping` with `timeout: 15s`) — a slow
  readiness check only delays traffic, it doesn't kill the pod.

Change is in the `rabbitmq` StatefulSet (Helm-rendered staging values in the `infrastructure`
repo). Apply the same probe shape to the production namespace when it goes live.

**Priority:** low (no restarts, no outage — log/alert noise only), but trivial and removes a
standing false-positive that would mask a real liveness failure.

## Application workloads are not scraped by Prometheus → no app-level metrics

**Recorded:** 2026-06-19.

**Observed.** Staging Prometheus is the plain (non-operator) chart — `ServiceMonitor`/`PodMonitor`
CRDs are absent; scrape targets live in the `prometheus-server` ConfigMap (`monitoring` ns). The
configured jobs are infra only:
`alloy, kube-state-metrics, loki, node-exporter, postgres-exporter, prometheus, rabbitmq`. The
three application workloads — **`server-2`, `replay-parser-2`, `replays-fetcher`** — have **no
scrape job**, no `prometheus.io/scrape` pod annotations, and parser/fetcher have no `Service`. So
node / cluster-state / postgres / rabbitmq metrics exist, but **no application metrics** (parse
throughput, queue depth, fetch cadence, API latency/error rates) are collected anywhere. App
observability today rests on Loki (logs) + GlitchTip (errors) alone. This is a gap against
`infrastructure/briefs/observability-plan.md`, whose intent ("workload metrics") and acceptance
("Prometheus must show healthy … targets") assumed app targets that were never wired.

**Fix approach.** Two parts, both required:

1. **App side** — each app must expose a Prometheus `/metrics` endpoint (a probe of `server-2`
   `/metrics` returned an empty 200, so instrumentation is partial/absent; parser listens on
   :8080 with format unconfirmed). Add a metrics exporter to `server-2`, `replay-parser-2`, and
   `replays-fetcher` (coordinate per-repo via each app's conventions). Decide a minimal first
   metric set per app (e.g. parser: parsed/sec, parse-duration histogram, failures; fetcher:
   discovered/fetched/stored/duplicate counters, cycle duration; server-2: HTTP rate/latency/5xx).
2. **Infra side** — add scrape jobs to the `prometheus-server` ConfigMap (or switch to
   annotation-based `kubernetes_sd` discovery and annotate the pods). Parser/fetcher also need a
   `Service` (or pod-level discovery) to be scrapable. Then add baseline dashboards/alerts.

**Priority:** medium. Not a deploy bug — the services run fine — but a real observability hole:
there's currently no metric-based signal or alerting on the apps themselves, only logs and crash
reports. Plan it through `infrastructure` (scrape config) plus per-app instrumentation work.
