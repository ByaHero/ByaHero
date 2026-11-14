# ByaHero

ByaHero is a capstone project for bus tracking, passenger information, conductor operations, and administration. This repository contains the Laravel API, three Android apps, two React web apps, the public landing page, and an optional Python AI service.

## Current deployment

Deployment and release information below reflects the setup on **14 November 2026**.

| Service | Address / setup |
| --- | --- |
| Production API | **<https://api.byahero.app/api>** — Laravel on Vercel, project `byahero-backend` |
| API readiness | <https://api.byahero.app/api/health> — HTTP 200 with `{"ready":true}` when ready |
| Protected backend test | Vercel project `byahero-backend-test`, Preview environment; use the latest successful GitHub Actions deployment URL |
| Passenger website | **<https://passenger.byahero.app>** — Vercel; <https://byahero1.vercel.app> remains available |
| Admin website | **<https://admin.byahero.app>** — Vercel project `byahero-admin-web`; the old alwaysdata admin site remains a backup |
| Public website | <https://byahero.app> — landing page on GitHub Pages |
| Database and uploaded files | Supabase Free: PostgreSQL and private Storage buckets |
| Legacy backend backup | <https://byahero.alwaysdata.net> and its existing MySQL database; coordinated manual rollback only |

The Vercel projects belong to ByaHero's `byaherosupport-2249` account on Hobby. The apex `byahero.app` remains the landing page; `passenger.byahero.app` is the passenger website, and `api.byahero.app` is the backend. Cloudflare manages DNS. Each Vercel hostname uses its own DNS-only CNAME target supplied by its project rather than a changing deployment URL. The passenger domain is attached to project `byahero`; it does not replace the landing page or API binding.

The production API is publicly reachable without Vercel sign-in. **Private API routes still require Laravel session authentication and the appropriate role.** The test project keeps Vercel Authentication enabled for all deployments because it contains copied application data.

## Repository and technology

| Directory | Purpose |
| --- | --- |
| [`laravel-backend/`](laravel-backend/) | Laravel 12 API; PHP 8.2 minimum, PHP 8.3 in the Vercel Apache container |
| [`byahero-mobile/`](byahero-mobile/) | Passenger Android app; Expo 54 / React Native 0.81.5 |
| [`byahero-conductor/`](byahero-conductor/) | Conductor Android app |
| [`byahero-admin/`](byahero-admin/) | Admin Android app |
| [`byahero-passenger-web/`](byahero-passenger-web/) | Passenger website; React, TypeScript, Vite and Leaflet |
| [`byahero-admin-web/`](byahero-admin-web/) | Admin website; React, TypeScript, Vite and Leaflet |
| [`landing-page/`](landing-page/) | Public website and passenger APK download links |
| [`byahero-ai/`](byahero-ai/) | Separate Python AI service; disabled in the current Vercel backend configuration |

Application features include live bus locations, seat availability, routes and schedules, conductor trips and ticketing, passenger boarding, circles and location sharing, SOS alerts, lost-and-found reports, notifications, and administrative analytics. The production backend currently uses its local ETA fallback rather than the separate Python service.

## Supabase data and authentication

Test and production use separate schemas and private buckets within the same Supabase project:

| Backend | PostgreSQL schema | Storage bucket |
| --- | --- | --- |
| Protected test | `byahero_test` | `byahero-test-uploads` |
| Production | `byahero_production` | `byahero-uploads` |

Laravel connects through the Supabase **Session pooler on port 5432**. The production runtime uses a restricted database role. Application tables have row-level security enabled, and anonymous/authenticated Supabase Data API roles have no access to the private production schema. Accounts and password hashes are managed by Laravel; this setup does **not** replace application login with Supabase Auth.

Sessions, cache, and live bus locations persist in PostgreSQL. Uploaded lost-and-found images use private Storage with authorized, short-lived links. Database passwords and server Storage credentials stay on the backend, outside frontend bundles and Git.

The final alwaysdata cutover copy verified **30 application tables / 29,090 rows** on 14 November 2026. Those are checkpoint counts, not current live totals. Subsequent production writes go to Supabase. Neither the test copy nor alwaysdata is continuously synchronized with production.

**Code deployments do not import, synchronize, seed, or migrate data.** Schema changes need a separate compatible migration and backup plan. Do not run the historic migration set, `migrate:fresh`, or seeders against the imported databases; the historic migrations are not a safe baseline for those copies.

## Backend and admin updates with production approval

Use [Backend and admin - Vercel releases with production approval](https://github.com/ByaHero/ByaHero/actions/workflows/deploy-vercel-backend.yml).

1. Review and merge changes into `main`. Relevant changes under `laravel-backend/`, `byahero-admin-web/`, and the deployment workflow/scripts trigger the pipeline. It can also be run manually on `main`. A README-only change does not automatically trigger this backend workflow.
2. GitHub runs backend/admin deployment and callback guards, PHP tests, the Composer production-dependency audit, startup checks, the isolated admin test build, and the static Vercel admin build. It deploys to `byahero-backend-test` in Preview and checks readiness and application authentication behind Vercel protection.
3. Open the test URL from the successful job summary using an authorized ByaHero Vercel session. The isolated admin UI is at `/admin-test/login`. Verify the change against the test data.
4. The production job waits for **`timbibat`**. In that run, choose **Review deployments**, select `vercel-backend-production`, and approve the exact commit only after testing it.
5. Approval builds that same Git commit separately in `byahero-backend` with Production configuration. It stages with `--prod --skip-domain`, verifies the immutable deployment, then updates **only `api.byahero.app`** and checks it again. Readiness must return HTTP 200; an anonymous private dashboard request must return Laravel HTTP 401.
6. In the same approved job, GitHub stages the admin frontend in the separate `byahero-admin-web` project. It checks the protected deployment's HTML, SPA refresh routes, API proxy readiness and anonymous rejection, then updates **only `admin.byahero.app`** and repeats public checks. The admin project has no automatic Git production integration. Its preview/generated deployment URLs stay Vercel-protected; the production custom hostname uses ByaHero's normal admin login.

This gate covers both the API and admin frontend from the same commit. The API deploys first; a later admin deployment failure does not automatically roll back the already verified API. Keep backend changes compatible with the previous frontend, and inspect the job summaries before retrying. Neither step changes alwaysdata or synchronizes databases.

The Preview and Production builds have different configuration; production is not a promotion of the Preview artifact. A new matching push cancels the older run. The release script also rejects stale commits that are no longer the head of `main`; rerun the workflow for current `main` if an approval has become stale.

Both GitHub environments are restricted to `main`:

| GitHub environment | Vercel target | Gate |
| --- | --- | --- |
| `vercel-backend-test` | `byahero-backend-test` / Preview | Automatic after checks |
| `vercel-backend-production` | `byahero-backend` and `byahero-admin-web` / Production | One required reviewer approval |

Each environment contains `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` variables and a `VERCEL_TOKEN` secret entered directly in GitHub. Application secrets remain in the matching Vercel environment. The backend projects use this workflow rather than automatic Vercel Git deployments. The workflow changes no client endpoints, Cloudflare records, or database data.

### Frontend and legacy deployment paths

- **Passenger web:** its existing Vercel Git integration deploys `main`. The backend approval gate does not gate this frontend integration.
- **Admin web:** deploys to Vercel through the backend/admin approval workflow above. [Deploy Admin Web to AlwaysData](https://github.com/ByaHero/ByaHero/actions/workflows/deploy-admin-web.yml) remains manual-only on `main`, requiring `DEPLOY_ALWAYSDATA`, for an intentional update of the backup admin frontend.
- **Backup backend:** [Deploy to AlwaysData via FTP](https://github.com/ByaHero/ByaHero/actions/workflows/alwaysdata.yml) is also manual-only on `main`, requiring `DEPLOY_ALWAYSDATA`. A normal merge no longer uploads the backend to alwaysdata.
- **Landing page and Python AI:** retain their separate workflows and path triggers. The AI workflow's existence does not enable the Python service in the Vercel backend.

The browser apps use same-origin `/api` requests through Vercel rewrites to the production API so browser session cookies can work. The backup alwaysdata admin site retains its fixed-upstream PHP proxy. The Vercel admin build uses `npm run build:vercel` and excludes the PHP proxy and Apache `.htaccess`; the normal `npm run build` still supports alwaysdata. Native clients use the API origin directly. Configuration that appends `/api/...` internally should use `https://api.byahero.app`, avoiding `/api/api`.

Production `CORS_ALLOWED_ORIGINS` includes `https://passenger.byahero.app` and `https://admin.byahero.app`, retaining the existing `https://byahero1.vercel.app` and `https://byahero.app` entries. Add a new website's exact origin before serving authenticated requests from it. Browser storage and sessions are scoped to the hostname, so sign in again when moving to either custom domain. These website-domain changes require no new Android APK or API endpoint change.

## Android APK releases

Publishing backend code does not update installed Android apps. Publish a new APK whenever native app code, its embedded server configuration, or the Google callback changes.

| App / workflow choice | Release tag pattern | APK filename | Build artifact |
| --- | --- | --- | --- |
| Passenger / `passenger` | `vX.Y.Z` | `byahero.apk` | `byahero-passenger-update` |
| Conductor / `conductor` | `conductor-vX.Y.Z` | `byahero-conductor.apk` | `byahero-conductor-update` |
| Admin / `admin` | `admin-vX.Y.Z` | `byahero-admin.apk` | `byahero-admin-update` |

Release snapshot on 14 November 2026: **passenger 2.0.15 / Android code 24**, **conductor 3.0.17 / code 35**, and **admin 3.0.7 / code 217**. Use a new version/tag and a larger version code for each subsequent app release; the apps have independent version sequences.

### 1. Update the app's version

Keep these fields consistent in the selected app directory:

| File | Fields |
| --- | --- |
| `android/app/build.gradle` | `versionName` and increasing `versionCode` |
| `app.json` | `expo.version` and `expo.android.versionCode` |
| `package.json` | `version` |
| `package-lock.json` | Top-level `version` and root `packages[""].version` |

Keep the existing application ID and signing keystore so users can install over the previous app. Review and merge the app/version changes into `main` before building.

### 2. Build before publishing

1. Open [Build Android backend updates](https://github.com/ByaHero/ByaHero/actions/workflows/build-app-updates.yml).
2. Choose **Run workflow**, select **main**, and select `passenger`, `conductor`, `admin`, or `all`.
3. Wait for success, then download and extract the appropriate artifact. It contains the named APK and its `.sha256` file. Artifacts are retained for 14 days; they are not public releases.
4. Verify the version, checksum, and signing certificate against the previous app, and test installation and sign-in on a device.

The workflow uses Node 22, Java 17, `npm ci --legacy-peer-deps`, client-settings and callback tests, and Gradle `assembleRelease`. It **builds artifacts only** and does not publish them automatically. Recent full builds took about 22 minutes.

For a local build, install the app's locked dependencies and use Java 17 plus its required Android SDK. From the app's `android/` directory, run `./gradlew assembleRelease` (`.\gradlew.bat assembleRelease` in PowerShell). The output is `app/build/outputs/apk/release/app-release.apk`; rename it using the table above before uploading. Follow any app-specific `AGENTS.md` instructions before changing native source.

### 3. Attach and publish the release

1. Open [Draft a new release](https://github.com/ByaHero/ByaHero/releases/new). Create the matching version tag using the **same commit that produced the APK**; do not accidentally tag a newer, different build of `main`.
2. Enter a title and release notes. Attach the **APK first**, followed by its `.sha256` file. Save as a draft until the files are uploaded and checked.
3. Publish the release with the APK already attached. The existing release-triggered APK workflows skip rebuilding when their matching APK asset is present.
4. Keep the passenger release as GitHub's **Latest** release for the generic passenger download link. Conductor/admin releases should use their own tag and asset links without replacing that default.
5. Verify the public APK link and install it over the previous app. Publishing makes the update discoverable; users still need to install it.

The app update hooks check GitHub Releases directly first, then fall back to `GET /api/app-version?app=passenger`, `conductor`, or `admin`. The backend selects the matching app release and caches its metadata for up to five minutes. The public landing page also finds the passenger APK from GitHub Releases.

References: [running a GitHub workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow) and [managing GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

## Google sign-in and current limitations

Passenger **2.0.15 and later** use **<https://api.byahero.app/auth/google/callback>** for Google sign-in/sign-up. The exact URL is registered on the existing Google Web OAuth client. The browser callback returns the fragment ID token to the installed ByaHero app; Laravel verifies it through the production API. It accepts only the production app's root deep link, not arbitrary websites or Expo Go destinations.

Passenger 2.0.14 and older retain the old alwaysdata callback until updated. Keep the old Google redirect entry and page while those installations or the rollback path are needed. The new APK does not require alwaysdata for its Google callback.

Passenger web's Google button uses `https://passenger.byahero.app` as an authorized JavaScript origin on the existing Google Web client. Keep the existing Vercel website origin too. This browser origin setting is separate from the mobile callback redirect URI above.

Email signup/OTP and password reset are enabled on the **passenger website**. The production backend sends directly through Brevo as **ByaHero Support <noreply@byahero.app>**; the domain is authenticated and the sender is verified. Brevo's API-key unknown-IP blocking is disabled to support Vercel's changing outgoing IPs; SMTP IP blocking remains enabled. No alwaysdata email relay is used. The Brevo API key stays in the production backend's Secret settings, and the isolated test backend keeps external notifications disabled.

The existing passenger, conductor and admin Android APKs still have email features disabled. Restoring them requires separate app changes and new APK releases; a website or backend deployment does not update installed APKs. Existing password sign-in and Google sign-in remain available.

Alwaysdata's backend, MySQL data, and files remain a **manual rollback copy**, not an automatically synchronized failover. Before reverting after Supabase has received writes, pause app writes and reconcile the data. Its readiness check previously returned HTTP 503; it is not a verified hot standby. One migrated attachment's original file was missing and has no backup; its stored reference was preserved.

## Development and operational notes

Use a separate development/test backend and database for development work. **The current native defaults and both Vite development proxies target the production API**; starting a local UI does not make its writes local. Retarget the client/proxy to an isolated backend before using it for data-changing tests. Use the protected `/admin-test/login` deployment for isolated admin acceptance checks.

Backend tooling needs PHP 8.2+ and Composer 2; CI uses PHP 8.3. The backend, admin-web, and manual Android build workflows use Node 22; Android builds use Java 17. Install locked dependencies in the component being worked on rather than upgrading frameworks as part of an unrelated change.

Never commit `.env` files, database passwords, Vercel tokens, Firebase private keys, Supabase server keys, or migration snapshots. Ignored operator files such as `.env.migration`, `.env.supabase`, `.env.supabase.production`, `.env.production.runtime`, `.vercel/`, and `storage/migration/` are not deployment artifacts. Share only the credential-free example templates and keep test/production settings separate.

Further reading:

- [Backend/admin workflow details](laravel-backend/deploy/GITHUB-DEPLOYMENTS.md)
- [Admin Vercel deployment and backup](byahero-admin-web/VERCEL.md)
- [App cutover checkpoint and rollback record](laravel-backend/deploy/APP-CUTOVER.md)
- [Google callback migration](laravel-backend/deploy/GOOGLE-CALLBACK.md)
- [Initial isolated test setup](laravel-backend/deploy/README.md)
- [Admin test UI](byahero-admin-web/TEST-BACKEND.md)

Some deployment notes record earlier preparation stages. Use this README's dated overview for current routing/releases and the checked-in workflows for exact automation behavior.

## Developers

CJ, EDGAR, TIMOTHY, CHELSEA, MIEL, and PAUL.

## Historical panel suggestions

The pre-oral defense notes included thermal scanning/ticket printing, additional AI/ML speed detection, route optimization, conductor ticketing improvements, fare integration, native applications, and e-ticket transfer. These are historical suggestions, not a statement that every item remains unimplemented.

## License

See [LICENSE](LICENSE).
