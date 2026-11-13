# Protected production candidate — 14 November 2026

**Prepared, but not serving the live apps.** The user chose to retain Brevo's unknown-IP blocking and keep the backend protected. Alwaysdata remains the live source of truth. No app endpoints, DNS, published frontend settings, or alwaysdata files/data were changed.

- [Protected candidate health](https://byahero-backend-8dijii74a-byaherosupport-2249.vercel.app/api/health)
- [Dedicated Vercel project](https://vercel.com/byaherosupport-2249/byahero-backend)
- [Supabase project](https://supabase.com/dashboard/project/dvkpbydrrpurlbjsjlux)

Project: `prj_1LnFKHZz3I9mGcr7fk7gVFTMavUo`, owned by `byaherosupport-2249` on Hobby. Current clean deployment: `dpl_AvZfKwkKmNVfSYZFXQqCgUazoMn2`, **READY**, Production environment, Mumbai (`bom1`). It was deployed with `--prod --skip-domain`; its alias list is empty. Vercel Authentication protects **all** deployments (`ssoProtection.deploymentType=all`). There is no Git integration. No paid upgrades or add-ons were enabled.

The new [GitHub release pipeline](GITHUB-DEPLOYMENTS.md) uses a dedicated branch and GitHub Actions rather than Vercel Git integration. It automatically updates the protected test project and requires `timbibat`'s environment approval before staging a new protected production candidate. Existing live workflows remain unchanged.

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

The existing protected test deployments still contain their earlier authentication implementation. These production hardening changes have not been redeployed to them.

## Hold and remaining acceptance

**Email is not ready:** Brevo rejects the Vercel runtime with HTTP 401 for unknown outbound IPs. This was observed from more than one Vercel outbound address. The user explicitly chose to retain account-wide API-key IP blocking and keep this backend protected. The key's validity cannot be established while Brevo rejects the source IP. No email was sent. A compatible email delivery arrangement must be tested before making OTP/password-reset flows available to users.

Firebase service-account OAuth authentication succeeded (HTTP 200). Actual push delivery has not been tested, and no push was sent. Copied production device tokens were omitted. The separate Python ML service remains disabled; ETA uses the existing local fallback. The candidate excludes the admin test UI. Its cookie policy is `SameSite=Lax`; any future separate-origin browser frontend needs a reviewed same-origin proxy or a verified cookie/CORS configuration before switching.

The temporary provider probe is absent from the current source and deployment. An earlier diagnostic deployment remains protected in Vercel history; it was not publicly promoted or deleted.

Before a future cutover: resolve email delivery, complete affected-ISP and real frontend/native-app acceptance, arrange the agreed short pause in live writes, take fresh backups, and reconcile the latest alwaysdata data into the candidate. **This snapshot is not continuous replication.** No pause or final sync/switch has occurred. Do not run historic migrations, seeders, or destructive refresh commands against either imported schema. Keep alwaysdata available; reverting endpoints after new Supabase writes would require data reconciliation.
