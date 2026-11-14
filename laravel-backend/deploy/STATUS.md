# Test deployment status — 13 November 2026

Production access is recorded separately in [production backend status](PRODUCTION-STATUS.md), updated 14 November. The production API is public at the user's request, with private routes still requiring Laravel authentication. The test backend remains protected; live app endpoints still use alwaysdata.

For current deployment behavior, see [GitHub deployments](GITHUB-DEPLOYMENTS.md): reviewed backend changes on **main** deploy to the protected test project, with production awaiting approval. Alwaysdata backend/admin uploads are manual-only. The test URLs and manual verification record below are historical; use the latest Actions job summary for the current test URL.

The separate Laravel backend is READY on Vercel Hobby:

- [Admin test login](https://byahero-backend-test-hj76bh7bn-byaherosupport-2249.vercel.app/admin-test/login)
- [Protected test backend health](https://byahero-backend-test-hj76bh7bn-byaherosupport-2249.vercel.app/api/health)
- [Vercel project](https://vercel.com/byaherosupport-2249/byahero-backend-test)
- [Supabase project](https://supabase.com/dashboard/project/dvkpbydrrpurlbjsjlux)

Current deployment ID: `dpl_8nZm8gfhqgommZAnZSQGxV3uRwGX`, including the admin test build at `/admin-test/`. Owner: ByaHero's dedicated `byaherosupport-2249` Hobby account. Vercel environment: **Preview** (CLI `--environment preview`). Region: Mumbai (`bom1`), matching the Supabase connection. Source was uploaded directly; no Git push or changes to existing hosting integrations were made.

The admin test UI uses same-origin `/api` requests, a subdirectory-aware router, and an amber test banner. The normal admin production build retains its alwaysdata API and root routing. Both build modes compile, changed frontend files pass lint, and hosted login/deep-link/asset routes return HTTP 200. A new transactional test passed admin login, authenticated dashboard access, and logout against the Supabase copy (11 assertions); its temporary account was rolled back. See [admin test instructions](../../byahero-admin-web/TEST-BACKEND.md).

Read-only Chrome acceptance checks subsequently confirmed the signed-in dashboard and all 13 sidebar destinations loaded on the test origin, and a nested profile refresh retained the authenticated view. The ETA “Last Trained” field has a remaining “Invalid Date” display issue. See [the browser verification report](ADMIN-VERIFICATION.md) for results and limits.

## Dedicated-account deployment

The replacement project is `prj_8KT0zbl5hVNdGERbzw9L58PrsQqA` in `team_v3g9PH1rTsopQvRzEZ1sb6h3` (`byaherosupport-2249`). All 34 application variables are scoped only to Preview; `APP_KEY`, the database password, and the Supabase server key are stored as Secrets. `APP_URL` is inferred from the deployment hostname. Deployment Protection remains enabled. No Git integration or custom domain is attached to this separate project.

Verified on this deployment: `/up`, `/api/health` (`ready: true`), `/api/ping`, admin login, the nested analytics route, and the hosted test JavaScript returned HTTP 200 through authorized access. An unauthenticated health request returned HTTP 302 to Vercel Authentication. The hosted JavaScript contains the test banner and no alwaysdata API origin. The user's Chrome session confirmed the signed-in dashboard, bus directory, nested refresh, and browser Back/Forward; Chrome was left on the new test dashboard. The runtime scan found no failure matches across 100 returned records, with no further page of logs.

The first build was forced to Production by Vercel despite an explicit Preview request and was canceled before READY (`dpl_4AJLdJpMN7PdneLewQ3UGkan5ArC`). An initial Preview then exposed a cache-directory permission error. `deploy/start.sh` now restores writable/traversable Laravel cache directories and generates caches as Apache's request user. The successful replacement above includes that fix; its container build took approximately 34 seconds with cache.

The previous personal-account preview (`dpl_7Zss3YscdSnuCJanU8aPW2FbULsw`, under `timbibats-projects`) remains available for fallback and has not been deleted. Both test backends use the **same existing Supabase test copy**; moving the Vercel account did not recopy or overwrite the database. The published `byahero` frontend project (`prj_5ASz2QZmIHzX3RaL4D7V3TtVCvl8`) was not changed; its configuration update timestamp was verified unchanged before and after this work.

## Completed

- Refreshed the comparison against alwaysdata at **23:18 AWST on 13 November** and reconciled the Supabase test copy at **23:23 AWST**. All 29,085 included application rows match by count and normalized content digest. Only two extra test analytics events required removal; the full pre-change test data is backed up privately, and test sessions were preserved. See [latest test sync](LATEST-TEST-SYNC.md).

- Copied the alwaysdata MySQL snapshot into private `byahero_test`: 33 source tables and 29,085 data rows. Three shared-state support tables were added, for 36 tables total.
- Verified all imported row counts and normalized content digests before commit and again after the integration tests rolled back.
- Preserved account IDs/password hashes, foreign keys, indexes, identity sequences, legacy integer flags, and mixed-case column names. Preserved 465 existing blank SOS statuses without altering the originals.
- Left test sessions, reset codes, device tokens, queued work, and caches empty at import. Ordinary preview health/ping requests subsequently create separate test sessions.
- Enabled RLS on all 36 application tables. `anon` and `authenticated` have no schema access. The database occupies approximately 20.1 MiB including Supabase system data, well within the Free database allowance.
- Created a private test upload bucket. Copied and byte-verified four attachments (3,701,660 bytes). One original returns 404 on alwaysdata; no backup is available, and its stored reference is retained. The detailed inventory is in ignored `storage/migration/asset-copy-report.json`.
- Verified a new private upload and its signed download against Supabase; removed that temporary test object afterwards.
- Confirmed `/up`, `/api/health`, and `/api/ping` return HTTP 200 through authenticated Vercel access. Confirmed an existing attachment route redirects to Supabase's signed download.
- Default local test run: 15 tests / 35 assertions passed. Separate opt-in PostgreSQL run: 3 tests / 30 assertions passed, covering analytics, fractional fare generation, trip/location/event/stop state, and device registration. Integration data changes were rolled back.
- Linted 90 PHP files successfully. No error/fatal runtime logs were found for the successful preview during the smoke-test window.

## Preserved and pending

Alwaysdata's files, MySQL data, DNS, published frontend settings, and app API endpoints were not switched. Its application can continue accepting production writes; those later writes are not replicated into this test copy.

The preview remains protected by Vercel Authentication. Sign in to the owning Vercel account to open it. Test from the affected ISPs and use a separately configured local/test frontend for browser session/CORS and native-app acceptance checks. A user device on another ISP cannot be tested from this workspace.

External email/push delivery and the separate Python ML service are disabled in the test environment. ETA uses the existing local fallback. This existing test deployment retains the earlier email-based identity fallbacks; keep it protected. The separately prepared production candidate contains the authentication hardening described in its status report.

No paid upgrades or add-ons were enabled. The connected Vercel team was verified as Hobby. The user created the separate Supabase project for the Free plan. The Supabase connector does not have access to that project; migration and privilege checks used the separately supplied database connection.

Before a production cutover, follow [the deployment guide](README.md), take a fresh source snapshot or plan a verified incremental sync/write freeze, and complete ISP, frontend, session, notification, and app acceptance tests. Do not overwrite the existing test schema or run historic destructive migrations to refresh it.
