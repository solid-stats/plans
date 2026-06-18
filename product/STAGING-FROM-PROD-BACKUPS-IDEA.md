# Idea: refresh staging DB from prod's daily backups

Prod already takes a daily backup. Have staging restore its database from that
backup on a schedule.

Two birds with one stone:

- **Backup verification** — restoring the backup every day continuously proves
  the backups are actually valid and restorable, not just being written.
- **Staging stays near-current** — staging runs on data that's at most a day
  behind prod, instead of drifting on stale or synthetic data.

## Open questions (for later)

- Anonymization / scrubbing of PII before the restore lands in staging.
- Restore cadence (nightly after the backup completes?) and how it's triggered.
- Handling of staging-only schema migrations not yet on prod.
- Restore duration vs. staging availability window.
