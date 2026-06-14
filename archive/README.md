# Archive

Superseded planning docs, kept for provenance only. **Do not plan against these** —
the active plan of record is [`product/RELEASE-PLAN.md`](../product/RELEASE-PLAN.md).
Each file keeps its original repo-relative path under `archive/` and carries an
`ARCHIVED` banner at the top stating what replaced it and why.

| Archived | Was | Why it's superseded |
|---|---|---|
| [`product/PARITY-COORDINATION.md`](product/PARITY-COORDINATION.md) (2026-06-14) | Async cross-agent mailbox for the parity baseline run (2026-06-13) | Defunct — the baseline went solo (single driver); coordination no longer needed. Findings live in [`product/PARITY-BASELINE-FINDINGS.md`](../product/PARITY-BASELINE-FINDINGS.md). |
| [`replays-fetcher/briefs/fetcher-dependency-cruiser.cjs`](replays-fetcher/briefs/fetcher-dependency-cruiser.cjs) (2026-06-14) | replays-fetcher five-band F1–F8 dependency-cruiser preset draft (2026-06-13) | Rejected design — depcruise shipped in replays-fetcher via the generic `--init` preset, not this ruleset. |
| [`replays-fetcher/briefs/fetcher-depcruise-notes.md`](replays-fetcher/briefs/fetcher-depcruise-notes.md) (2026-06-14) | Wiring/judgment companion to the above draft (2026-06-13) | Tied to the rejected five-band preset; describes wiring + violations for a ruleset never adopted. |
| [`product/V2-CUTOVER-REVIEW.md`](product/V2-CUTOVER-REVIEW.md) (2026-06-13) | server-2 "Finish & Freeze v1" plan (2026-05-31) | Delivered as **server-2 v3.0 "Public API v1"** — complete & archived 2026-06-08, incl. the OpenAPI `1.0.0` contract freeze. |
| [`server-2/briefs/v2-backend-parity-and-full-run.md`](server-2/briefs/v2-backend-parity-and-full-run.md) | server-2 parity milestone brief (2026-05-12) | Shipped as **server-2 v2.0** (phases 1–5: counter ingestion, recalc/coverage report, identity readiness, legacy export, diff harness). Live milestone is in server-2's own `.planning/`. |
| [`replay-parser-2/briefs/v2-backend-parity-and-full-run.md`](replay-parser-2/briefs/v2-backend-parity-and-full-run.md) | replay-parser-2 conditional support brief (2026-05-12) | Conditional trigger (a server-2 parity blocker needing parser changes) **never fired**; `replay-parser-2` is DONE/verified. |
