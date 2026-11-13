# Latest alwaysdata-to-test sync — 13 November 2026

The dedicated Supabase test copy was reconciled with a fresh alwaysdata snapshot. Alwaysdata data, files, live app endpoints, DNS, and published frontend configuration were not changed.

## Snapshot and result

- Source export completed: **13 November 2026, 23:18:43 AWST** (`2026-11-13T15:18:43Z`).
- Private source snapshot: `storage/migration/alwaysdata-refresh-20261113_151803`.
- Source inventory: **33 tables, 29,085 application rows**. Production sessions, reset codes, and device tokens remain intentionally omitted under the existing migration policy.
- The new source snapshot's row counts and normalized content digests matched the original source export. The target comparison found exactly two additional test analytics events; every existing source analytics record was present and unchanged.
- At **23:23:25 AWST**, a guarded transaction removed those **two test-only `analytics_events` rows** from `byahero_test`. No source row was inserted, updated, or deleted. No test schema, sequence, role, policy, app URL, or deployment setting was changed.
- All **30 application-data tables / 29,085 rows** passed count and normalized content-digest checks before commit and again through a new read-only connection after commit. The three intentionally omitted source tables remain separate: test sessions were preserved (three at verification), password resets were empty, and device tokens were empty.

The synchronization writes were limited to `byahero_test.analytics_events` in Supabase project `dvkpbydrrpurlbjsjlux`. Both Vercel test previews use this same test copy.

## Backup and safeguards

Before the reconciliation, all **36 Supabase test tables** were exported in a repeatable-read, read-only transaction, including the two test analytics records and existing test sessions. The private pre-change backup is:

`storage/migration/supabase-before-sync-20261113_152302`

Its manifest includes per-table row counts, SHA-256 file checksums, column metadata, indexes, and constraint definitions. The backup files were checked before the two-row reconciliation. The exact applied-operation report is in ignored `.vercel/refresh-applied.json`; the independent readback report is in `.vercel/refresh-audit.json`.

The write transaction locked only the test tables, used bounded lock/statement timeouts, checked that target analytics data still matched the backup, required exactly two extra primary keys, and reverified all included application tables before commit. Any failed guard would roll back both deletions. The original importer continues to refuse nonempty schemas; no destructive migration or schema replacement was used.

Alwaysdata was read using the existing export routine's consistent read-only InnoDB snapshot and MyISAM content checks. No source locks, writes, schema changes, or app configuration changes were performed.

## Verification

- Deployed test `/api/health`: HTTP 200, `ready: true`.
- RLS remains enabled on all **36** test tables.
- `anon` and `authenticated` still lack `USAGE` on the private test schema.
- Supabase database size at verification: **21,116,595 bytes**, approximately 20.1 MiB. No paid service or upgrade was enabled.
- The live Vercel `byahero` frontend's configuration update timestamp remained unchanged.

This is a one-time snapshot sync. Later alwaysdata writes are not automatically replicated, and subsequent testing can create new test-only records. Uploaded files were not recopied during this database reconciliation; the previously documented missing source attachment remains unresolved.
