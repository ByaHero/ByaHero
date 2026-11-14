# Application endpoint cutover — 14 November 2026

Production API: **`https://api.byahero.app/api`**. Clients that append `/api/...` internally use the origin `https://api.byahero.app`, avoiding a duplicated `/api/api` prefix.

The user confirmed that live app use is paused for the final sync and authorized leaving email signup/password-reset features unavailable temporarily. Brevo IP blocking is unchanged. Password login and the existing Google identity-token flow are retained.

## Data checkpoint

The read-only source snapshot `alwaysdata-cutover-20261114_005753` completed at **08:58:34 AWST**. A full 36-table Supabase production backup was saved privately as `supabase-before-cutover-20261114_010057`. Comparison against the original import found exactly five new source rows and no conflicting production application changes.

At **09:09:19 AWST**, one row each in `users`, `circles`, `user_locations`, `user_settings`, and `analytics_events` was added to `byahero_production`. No existing application rows were updated or deleted. All **30 application-data tables / 29,090 rows** matched the fresh source snapshot by count and normalized content digest before commit. Identity sequences were advanced where needed. Source MySQL received no writes, and existing destination operational sessions/caches were retained. Private snapshots and operator reports are ignored by Git and excluded from deployments.

## Clients and publication

| Client | New release/configuration |
| --- | --- |
| Passenger Android | `2.0.14`, version code `23`, `byahero.apk` |
| Conductor Android | `3.0.17`, version code `35`, `byahero-conductor.apk` |
| Admin Android | `3.0.7`, version code `217`, `byahero-admin.apk` |
| Passenger website | Same-origin `/api` and attachment rewrites to the production API |
| Admin website | Same-origin PHP proxy to the production API, deployed with its existing manual admin-web workflow |

Changing source code does not modify already installed Android applications. Install the new APKs and sign in again before resuming Android use. Existing signing keys/application IDs are retained. The `Build Android backend updates` workflow builds all three APKs as artifacts; release assets should be uploaded before publication so users are not offered an empty download. The existing release workflows skip a build when the corresponding APK is already attached.

Each client upgrades the saved old default backend on first run, expires cached identity so users sign in on the new origin, and preserves pending offline work. Deliberate custom development servers are retained. Subsequent explicit operator selection of alwaysdata remains possible for a coordinated rollback. Automatic cross-server data fallbacks were removed; offline caches remain available.

Browser clients use same-origin requests to preserve authenticated cookies. The admin proxy has a fixed API upstream, validates incoming origins, forwards the production session cookie, and does not access MySQL. Its PHP proxy is excluded from the isolated `/admin-test` build. The conductor foreground location service uses `/api/conductor/update-location` on the new origin and shares the React Native cookie store for authenticated background updates.

Passenger Android 2.0.15 (version code 24) moves Google's OAuth `redirect_uri` to `https://api.byahero.app/auth/google/callback`. Register that exact URI on the existing Google Web OAuth client before publishing the update. The new callback only returns fragment ID tokens or Google errors to the ByaHero app's root deep link; it rejects arbitrary destinations, does not use database sessions, and disables caching/referrers. The API still verifies the Google ID token. Version 2.0.14 and older use the already registered alwaysdata bridge, so retain that old Google entry and page for those installations and manual rollback. See `GOOGLE-CALLBACK.md` for rollout checks.

## Backup and rollback

Alwaysdata's backend, MySQL database, original files and existing URLs are retained. Backend uploads remain manual-only. The admin website's static deployment may be updated independently; it is not the backup MySQL backend. Do not resume old Android versions against alwaysdata while newer clients write to Supabase. Their datasets would diverge.

Alwaysdata is a **manual rollback target**, not an automatically synchronized failover database. Once real writes reach Supabase, reverting URLs requires pausing writes and reconciling the new data first. Preserve both snapshots and the pre-cutover Git commit `b699391615666770669f85be504b350a912739d2`. The previously observed alwaysdata readiness HTTP 503 remains a separate legacy-host issue; this endpoint cutover does not claim that host passes every production check.

Keep app use paused until the published web deployments, authenticated session checks, and the required Android installations have been verified. Publication/build results are recorded in ignored operator reports and the relevant GitHub Actions run summaries.
