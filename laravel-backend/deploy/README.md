# ByaHero: isolated Vercel + Supabase Free test deployment

This deployment is a separate copy. Keep alwaysdata, its MySQL database, DNS, and the published apps unchanged until the new deployment has passed testing. Do not push these changes into a branch that automatically deploys to alwaysdata during this trial.

The separate production candidate is now prepared but remains protected at the user's request. See [production status and remaining checks](PRODUCTION-STATUS.md). The instructions below continue to describe the isolated test setup.

For ongoing backend updates, merge reviewed changes into `main` to use the [GitHub test deployment and production approval workflow](GITHUB-DEPLOYMENTS.md). The alwaysdata backend/admin upload workflows are manual-only. The user retained the previously merged live code; changing deployment routing does not verify or repair that live backend.

## Free plans only

- Use Vercel **Hobby**, for eligible personal/non-commercial use. Do not start a Pro trial, upgrade the team, or purchase add-ons. Container Runtime is currently beta. If the account offers only paid container access, stop rather than enabling it.
- Use the existing, separately created **Supabase Free** project `dvkpbydrrpurlbjsjlux`. No paid database branches, custom domains, IPv4 add-ons, or compute upgrades are needed.
- Use Supabase's **Session pooler** (IPv4-compatible) on port **5432**. Keep Vercel and the database in nearby regions; `bom1` is configured to match the supplied Mumbai (`ap-south-1`) database connection.
- The current Free allowance is 500 MB database / 1 GB file storage, with bandwidth limits and project pausing after low activity. Review actual usage in both dashboards. Free services do not provide dependable production availability.

References: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Container Runtime](https://vercel.com/docs/functions/runtimes/container), [Supabase pricing](https://supabase.com/pricing), [Laravel connections](https://supabase.com/docs/guides/getting-started/quickstarts/laravel).

## Local credential files

The following are ignored by Git, Docker, and Vercel uploads:

- `.env.migration`: alwaysdata source credentials and its HTTPS asset origin. Prefer a SELECT-only MySQL account where available. This file is used only by the migration script.
- `.env.supabase`: separate test backend environment. Fill the Session pooler host, database password, and a **server** Supabase secret key. The publishable/anon key cannot administer private storage. A new test-only `APP_KEY` has been generated locally.
- `storage/migration/`: private snapshots containing production user data. Back up securely; do not attach them to issues or commit them.

Do not overwrite `.env` on alwaysdata or reuse its database credentials in Vercel. `.env.supabase.example` and `.env.migration.example` contain no secrets and are the shareable templates.

## Copy the live MySQL data

Run from `laravel-backend`. On this Windows workspace use `C:\xampp\php\php.exe -d extension=pdo_pgsql` in place of `php`.

```powershell
php -d extension=pdo_pgsql scripts/migrate-database.php check
php -d extension=pdo_pgsql scripts/migrate-database.php export alwaysdata-test-20261113
php -d extension=pdo_pgsql scripts/migrate-database.php import alwaysdata-test-20261113 --apply
php -d extension=pdo_pgsql scripts/migrate-database.php verify alwaysdata-test-20261113
php -d extension=pdo_pgsql scripts/migrate-database.php assets --apply
```

The export uses an InnoDB consistent read-only snapshot. MyISAM tables are checked for unchanged contents before and after the export; it fails if they change. It does not explicitly lock tables, modify the source, or change its storage engines. The snapshot is a test copy, not continuous replication.

The importer is pinned to the designated Supabase project and creates **only `byahero_test`**, refusing to overwrite any populated schema. Table creation, data, indexes, foreign keys, identity sequences, and content checks run in one transaction. An error rolls back the database import. It preserves the mixed-case `Bus_ID` column, decimal values, and integer flags. It rejects unsupported generated columns, routines, views, or index types rather than silently dropping them.

Sessions, reset codes, queues, caches, and device tokens are empty in the test copy. Account records and password hashes are copied as data; Supabase Auth is not enabled or substituted for Laravel authentication. A new session/cache/live-location schema is created where necessary. The application schema is private, with RLS enabled and no anonymous Data API grants.

**Do not run `migrate:fresh`, `db:seed`, or the full historic `artisan migrate` against the imported snapshot.** Existing migrations are not a complete database baseline and include a destructive fare-table rebuild. The container never runs migrations or seeders on startup or build.

The `assets` command creates the private test bucket and copies referenced lost-and-found images over HTTPS, verifying each copied file. It can be rerun; earlier successful objects remain if a later download fails. HTTP 404 originals are recorded in ignored `storage/migration/asset-copy-report.json`, their database references remain intact, and other available images are still copied. Exit code 2 means some originals were missing. No backup of the missing originals is available. Source images remain intact. External profile-picture URLs retain their existing behavior; inventory any remaining alwaysdata-hosted assets before a final cutover.

Live bus-location files are not copied: conductor location updates on the new backend write to the shared `bus_live_locations` table. Static route GeoJSON is included in `public/routes`.

## Deploy the backend separately

1. Create a **new** Vercel Hobby project, such as `byahero-backend-test`. Keep it separate from the currently deployed frontends. Set Root Directory to `laravel-backend` when deploying this repository. `Dockerfile.vercel` selects the Container preset.
2. Set the test backend environment variables from `.env.supabase` for **Preview** only. Exclude `SOURCE_*` and all source credentials. Do not upload the file itself. Leave `APP_URL` unset initially to use `VERCEL_URL`, or set it to the exact test backend origin; never use the template placeholder.
3. Keep `APP_DEBUG=false`, `DB_SCHEMA=byahero_test`, `EXTERNAL_NOTIFICATIONS_ENABLED=false`, `PYTHON_ML_ENABLED=false`, database sessions/cache, and `QUEUE_CONNECTION=sync`. The startup script refuses a MySQL connection or another schema. The ML feature uses its existing local ETA calculation until a separately hosted ML service is configured.
4. Keep Vercel **Deployment Protection enabled** for this copy of production user data. Existing email-based authentication fallbacks in the app are not a suitable boundary for a publicly accessible clone. Use Vercel's protected preview and authorized bypass facilities for test devices. Do not publish bypass credentials in frontend bundles.
5. Deploy to a **Preview** URL. Do not promote, assign the alwaysdata domain, change DNS, or update published app builds.

No Laravel rewrite is required: Apache serves `public/index.php`, and persistent application state uses Supabase. Logs go to stderr. Uploads are limited to 1.5 MB each (two per report) to stay below Vercel's request-body limit. Laravel's regular `.env` is excluded from the image. `config:cache` and `route:cache` run with the runtime environment, never with source credentials.

## Test before switching

- A separate admin test build is now hosted at `/admin-test/login` on the current protected Preview deployment. Run `npm run build:test-backend` from `byahero-admin-web` to regenerate its files before a backend redeploy. Set `ADMIN_TEST_ENABLED=true` only on the test Preview. See `byahero-admin-web/TEST-BACKEND.md` for the URL and acceptance checks. This build uses same-origin `/api` calls; no CORS change or browser-exposed Vercel bypass credential is required.
- `/up` confirms Laravel booted. `/api/health` confirms the database and core tables exist. `/api/ping` exercises sessions.
- Test a separate local frontend against the Preview origin using `VITE_API_BASE_URL`; the admin frontend already supports this override. Keep the published frontend's environment unchanged. Set `CORS_ALLOWED_ORIGINS` on the test backend to the exact test frontend origins, comma separated. Cookie sessions use `SameSite=None; Secure` and a separate cookie name.
- Sign in with test accounts; verify role behavior and that sessions persist over multiple requests/instances. Test logout.
- Start a test bus trip, send locations, read them as a passenger/admin, update seats, print a test ticket, and stop the trip. Confirm updates are confined to the Supabase copy.
- Check analytics for today/week/month/custom dates, fare generation (including fractional parameters), and notification read/clear actions.
- Create a lost-and-found report with images, refresh, and open the images. Existing migrated attachments should also load.
- Push and OTP email delivery are intentionally disabled. Use isolated test credentials/accounts before testing real delivery; do not enable it with copied production device tokens.
- Verify the new backend URL on each ISP that could not reach alwaysdata. Browser CORS/session checks and native app checks are both necessary.
- Monitor database, file storage, bandwidth, and Vercel compute usage. Keep a reviewed retention period for telemetry; do not silently delete historical records merely to fit a quota.

Local verification:

```powershell
php vendor/phpunit/phpunit/phpunit
php -d extension=pdo_pgsql scripts/smoke-storage.php
docker build -f Dockerfile.vercel -t byahero-backend-test .
docker run --rm --env-file .env.supabase -p 8080:8080 byahero-backend-test
```

Docker is not currently installed in this workspace, so a real container build must be verified remotely or on a Docker-enabled machine.

The opt-in `SupabaseIntegrationTest` suite uses the ignored `.env.supabase` connection and wraps its database changes in transactions. In PowerShell, set `$env:BYAHERO_TEST_PG='1'`, then run `php -d extension=pdo_pgsql vendor/phpunit/phpunit/phpunit --filter SupabaseIntegrationTest`; remove that environment variable afterwards. Default tests do not connect to Supabase.

The active project now belongs to ByaHero's dedicated `byaherosupport-2249` Hobby account (`prj_8KT0zbl5hVNdGERbzw9L58PrsQqA`). Use explicit scope and `--environment preview` when deploying with the CLI. Verify the owner/project with `vercel project inspect --scope byaherosupport-2249 --non-interactive` first. See [current deployment status](STATUS.md) for its URL and checks.

Vercel may force a new project's first deployment to Production even when Preview is explicitly requested. During this setup that first build was canceled before READY, then the Preview deployment was created. Do not add test credentials to Production to work around this behavior. All active test deployments must use Preview variables.

## Later cutover and rollback

The production-specific entry point is `scripts/migrate-production.php`; it explicitly targets `byahero_production` using the ignored `.env.supabase.production` migration connection. The shared importer defaults to `byahero_test` when invoked through `scripts/migrate-database.php`. Both refuse to overwrite a populated target schema. The prepared candidate already has data: do not rerun an import or erase it as a shortcut for refreshing it. Any final refresh needs a reviewed backup/reconciliation procedure. The application uses the separately restricted connection in `.env.production.runtime`, not the migration login.

Testing writes stay in Supabase and are not synchronized back to alwaysdata. The source snapshot will become stale as production users continue working. Before a final switch, arrange a short write freeze or a separately verified incremental migration, make fresh backups, and validate final counts/content. A fresh rehearsal should use another explicitly designated empty schema/project; the importer will not erase the current test copy.

Only after acceptance should API endpoints, app builds, OAuth redirects, notifications, and asset origins be switched together. Keep alwaysdata available for rollback. Rolling the API URL back after new production writes have reached Supabase requires a data-reconciliation plan; switching the URL alone is not a complete rollback.
