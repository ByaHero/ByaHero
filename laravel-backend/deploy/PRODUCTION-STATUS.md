# Production backend status — 14 November 2026

**Public API access enabled; live app endpoints unchanged.** The user explicitly requested removal of Vercel sign-in protection from the production backend. Brevo's unknown-IP blocking remains enabled. Alwaysdata remains the live source of truth; no endpoint cutover, DNS change, data refresh, or alwaysdata upload was performed by this access change. Private API routes still require Laravel authentication.

- [Production API base](https://api.byahero.app/api)
- [Public production API health](https://api.byahero.app/api/health)
- [Dedicated Vercel project](https://vercel.com/byaherosupport-2249/byahero-backend)
- [Supabase project](https://supabase.com/dashboard/project/dvkpbydrrpurlbjsjlux)

Project: `prj_1LnFKHZz3I9mGcr7fk7gVFTMavUo`, owned by `byaherosupport-2249` on Hobby. Latest approved production deployment at the access change: `dpl_JBcmajE1hhVWekj1YwkiJAdTyCTr`, **READY**, commit `b8c63bcda5bc5b7a6c9b00c25c0a41b413d49b07`, Production environment, Mumbai (`bom1`). GitHub run `43467663622` completed its test and approved production jobs successfully. It was deployed with `--prod --skip-domain`; no alias promotion is included in this access change. Production Vercel Authentication is disabled (`ssoProtection=null`); the separate test project retains `deploymentType=all`. There is no backend Git integration. No paid upgrades or add-ons were enabled.

The user subsequently added the Cloudflare CNAME for **`api.byahero.app`**. Vercel verified DNS, issued certificate `cert_JJA2eDSLUEnrGUPP3ihJyRXb`, and the API alias was assigned to that existing approved deployment. HTTPS `/api/health` returned 200 with `ready: true`; the private admin endpoint returned Laravel HTTP 401. Normal DNS access was verified without a forced IP. The root `byahero.app` website still returned 200 from Cloudflare/GitHub Pages. No live app endpoint or source data was changed. Production `APP_URL` is configured for the canonical API origin on the next approved deployment.

The [GitHub release pipeline](GITHUB-DEPLOYMENTS.md) uses **main** and GitHub Actions rather than Vercel Git integration. It automatically updates the protected test project and requires `timbibat`'s environment approval before deploying production. Production checks require direct public health access plus Laravel HTTP 401 on private routes, without bypass credentials, before and after moving the API alias. Only `api.byahero.app` can be promoted. The user merged PR #327, which triggered the old live alwaysdata backend/admin workflows, and then chose to keep that merged code. The backend/admin alwaysdata workflows are manual-only. App endpoint configuration and production data were not changed by the routing or public-access updates. The preparation snapshot and checks described below predate that user-triggered live code deployment.

The local backend's normal `.vercel/project.json` still points to the separate **test** project. Production deployment used an audited, generated source directory at ignored `.vercel/production-source/` with its own project link. Do not accidentally deploy the test admin bundle or test environment into this project.

## Data and credentials

The separate `byahero_production` schema and private `byahero-uploads` bucket preserve the existing `byahero_test` schema and test uploads. Production has a new application key, cookie name, and cache prefix. Its restricted database login, `byahero_production_api`, has application data/sequence permissions without schema creation, superuser, role creation, or table truncation privileges. Its inability to read the test schema was verified. The existing test connection has broader migration privileges; this is not symmetric database-role isolation.

All 36 production tables have RLS enabled. `anon` and `authenticated` have no schema usage. Application access uses policies scoped to the server role and Laravel's session/role checks. The privileged migration connection is not deployed as the application database login.

The read-only alwaysdata snapshot completed at **23:45:45 AWST on 13 November 2026** (`alwaysdata-production-prepare-20261113_154506`). Import verification checked 33 source tables and 29,085 included rows. After hosted checks and cleanup, an independent read-only verification at **00:08:15 AWST on 14 November** confirmed matching row counts and normalized content digests for all **30 application-data tables / 29,085 rows**. The other three source tables contain sessions, reset codes, and device tokens and are deliberately not copied. Separate session/cache/queue support tables bring the destination total to 36.

Four existing attachments were copied and byte-verified (3,701,660 bytes). One source image returns 404; no backup is available, and its stored reference remains intact. Normal candidate requests may create separate operational sessions/cache records. The temporary verification admin and its two login/logout analytics records were removed.

Credentials remain in ignored `.env.supabase.production` (migration administration) and `.env.production.runtime` (restricted application connection). Vercel has 43 Production-only variables, including seven Secrets. No source credentials or private migration snapshots are included in the container. Do not paste keys into chat, logs, issues, or frontend bundles.

## Authentication changes and verification

The candidate requires session authentication on private API routes, checks role access, rejects cross-origin state-changing requests from unapproved origins, and no longer accepts an email header or request field as identity. Session restoration cannot select another account. Login regenerates the session, and logout invalidates it. Google identity tokens require verified signatures, issuer, audience, expiry, subject, and verified email. Authentication requests are rate limited. SOS push dispatch stays on the server and no longer returns push credentials to clients. Production attachment access is restricted to admins or the owning passenger.

Dependencies were updated within the existing Laravel 12/PHP 8.2-compatible ranges; Laravel is 12.72.0 and the JWT library is pinned to 7.2.1. Composer audit reported **zero advisories** after the update.

- Default suite: **24 passed, 4 opt-in tests skipped; 79 assertions**.
- Separate transactional PostgreSQL suite: **4 passed / 41 assertions**, with database changes rolled back.
- Hosted protected-candidate password login, authenticated dashboard, identity-preserving session restoration, anonymous rejection, and logout passed. These checks used a temporary candidate-only admin, subsequently removed. The tested application sources match the clean final candidate; only the temporary provider probe was removed and email failure messages were made generic afterwards.
- The final clean candidate returned `{"ready":true}` with HTTP 200 through authorized access. An ordinary unauthenticated health request returned HTTP 302 to Vercel Authentication. After passing that protection, an anonymous dashboard request with an email header returned application HTTP 401.
- The existing live frontend project's configuration timestamp was verified unchanged (`1794493876647`). No Git push or alwaysdata deployment workflow was triggered.

The newer GitHub test deployments also include the authentication hardening. Historical manual test deployments may retain earlier code and remain protected.

## Hold and remaining acceptance

**Email is not ready:** Brevo rejects the Vercel runtime with HTTP 401 for unknown outbound IPs. This was observed from more than one Vercel outbound address. The user retained account-wide API-key IP blocking and subsequently authorized public API access separately. The key's validity cannot be established while Brevo rejects the source IP. No email was sent. A compatible email delivery arrangement must be tested before relying on OTP/password-reset flows.

Firebase service-account OAuth authentication succeeded (HTTP 200). Actual push delivery has not been tested, and no push was sent. Copied production device tokens were omitted. The separate Python ML service remains disabled; ETA uses the existing local fallback. The candidate excludes the admin test UI. Its cookie policy is `SameSite=Lax`; any future separate-origin browser frontend needs a reviewed same-origin proxy or a verified cookie/CORS configuration before switching.

The temporary provider probe is absent from the current source and deployment. An earlier diagnostic deployment remains in Vercel history; it was not promoted or deleted. Removing project-level Vercel Authentication also makes older production-project URLs public; their Laravel authentication checks still apply.

Before a future cutover: resolve email delivery, complete affected-ISP and real frontend/native-app acceptance, arrange the agreed short pause in live writes, take fresh backups, and reconcile the latest alwaysdata data into the candidate. **This snapshot is not continuous replication.** No pause or final sync/switch has occurred. Do not run historic migrations, seeders, or destructive refresh commands against either imported schema. Keep alwaysdata available; reverting endpoints after new Supabase writes would require data reconciliation.
