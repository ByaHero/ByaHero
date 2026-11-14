# GitHub backend deployments

The release branch is **`main`** in `ByaHero/ByaHero`. Backend, admin test UI, or Vercel pipeline changes pushed or merged into `main` run [Backend - Vercel releases with production approval](https://github.com/ByaHero/ByaHero/actions/workflows/deploy-vercel-backend.yml). The workflow can also be started manually from `main`.

The user merged the prepared Laravel/Supabase code into `main` in PR #327 and chose to retain that merge. The prior workflows deployed that merged backend/admin code to live alwaysdata. This routing update does not roll back or repair that live code. The alwaysdata backend and admin workflows are now **manual-only**; pushing to `main` no longer uploads either application to alwaysdata. The separate Python AI, landing page, and APK workflows retain their existing behavior.

## Normal update

1. Review and merge backend changes into `main`. Main branch protection requires one approving PR review for normal contributors and blocks force pushes/deletion. Administrators retain their normal main-branch bypass for direct maintenance; that does not bypass the production environment approval below.
2. GitHub runs deployment-guard tests, the default PHP suite, a Composer production-dependency audit, startup-script syntax checks, and the isolated admin test build. It then deploys to the dedicated **test project / Preview environment**, checks protected readiness and anonymous application rejection, and publishes the new deployment URL in the job summary.
3. Open that URL while signed in to the owning Vercel account. The admin test app is at `/admin-test/login`. Test the change with the copied test data.
4. The production job waits for **`timbibat`**. In that workflow run, choose **Review deployments**, select `vercel-backend-production`, and approve only after checking the exact commit and test URL. Reject it if the change should stay in testing.
5. Approval deploys the **same Git commit** in the separate production project. The production API is publicly reachable at the user's request; private routes still require Laravel session authentication. The pipeline first builds with `--prod --skip-domain` and verifies readiness/authentication on the immutable deployment URL. It then checks that the approved commit is still current on main, assigns **only `api.byahero.app`** to that healthy deployment, confirms the alias points to the exact production project/deployment, and repeats the public health/private HTTP 401 checks on the custom domain. It switches no live application endpoint and performs no data cutover.

A new matching push cancels an older run and pending approval. The deployment script also checks the branch head before releasing, rejecting a stale commit. Cancelling a workflow after Vercel has already accepted a build does not delete that immutable deployment. Test URLs remain protected; production project URLs are public. Test and production have different runtime configuration and are separately built from the same commit.

The older `codex/vercel-backend` workflow run was canceled when routing moved to `main`. That branch is no longer authorized to use either Vercel deployment environment. Always review the latest **main** run before approving production.

## GitHub and Vercel configuration

Both GitHub environments are restricted to `main`:

| GitHub environment | Vercel project | Vercel environment | Approval |
| --- | --- | --- | --- |
| `vercel-backend-test` | `byahero-backend-test` (`prj_8KT0zbl5hVNdGERbzw9L58PrsQqA`) | Preview | Automatic after checks |
| `vercel-backend-production` | `byahero-backend` (`prj_1LnFKHZz3I9mGcr7fk7gVFTMavUo`) | Production; API alias updated after health checks | `timbibat` required |

Both environments contain non-secret `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` variables. The user saves `VERCEL_TOKEN` directly as a secret in each environment; it is never copied from a developer's CLI login. Use a classic access token scoped to the ByaHero team/account `byaherosupport-2249`. During verification, the initially supplied token failed the CLI's account lookup with `User not found`; project-restricted tokens have a [reported CLI compatibility issue](https://github.com/vercel/vercel/issues/17506). The pipeline independently pins the intended project and owner. Replace or renew tokens in these environments when necessary. Production secrets are unavailable to its job until approval. Administrator bypass of production approval is disabled; self-approval is allowed so the sole designated operator can approve their own release.

The test project protects **all** deployments with Vercel Authentication. The user explicitly disabled Vercel Authentication for the **production backend project** (`ssoProtection=null`) so apps can reach its API. Laravel's private-route session/role authorization stays enabled. Neither backend project is connected to Git for automatic production releases. The script checks pinned project/account IDs, each role's access policy, PostgreSQL schema, deployment role, debug mode, test UI mode, and disabled test notifications before releasing. Application credentials stay in Vercel; GitHub does not pull `.env` files or database passwords. GitHub production environment approval remains required.

Container builds run remotely on Vercel using the pinned CLI 65.15.0. The pipeline stages only allowlisted tracked runtime source; private snapshots, developer environments, caches, logs, migration tools, and the admin test UI are excluded from production. Only the test build includes its generated admin bundle. Action versions are pinned to commit SHAs.

For an intentional alwaysdata deployment, choose its backend or admin workflow in Actions, select **Run workflow** on `main`, and enter `DEPLOY_ALWAYSDATA` in the required confirmation field. This is a live deployment and is separate from the Vercel release process. Existing FTP credentials were retained; the routing update did not connect to FTP or modify alwaysdata files/data.

The backend baseline passed 24 default tests (79 assertions; four opt-in database tests skipped) and the isolated admin build. The domain update passed six deployment-guard tests and workflow lint. Direct, unauthenticated production health returned HTTP 200 with `ready: true`; the admin endpoint returned Laravel HTTP 401, including when supplied an email header. The test URL continued returning HTTP 302 to Vercel Authentication. The existing admin dependency tree reports ten npm advisories (two moderate, seven high, one critical); its package versions were preserved during this deployment setup. The backend Composer production-dependency audit is a release gate; these frontend dependency warnings need separate remediation.

## Stable API domain

Use **`https://api.byahero.app/api`** as the API base URL when preparing future clients. Existing published clients still use their configured endpoints; connecting this domain does not update them.

Cloudflare remains the authoritative DNS provider. The user added a DNS-only CNAME named `api` pointing to `34d3b7ad3d275bfc.vercel-dns-017.com`. Vercel verified that configuration and issued an HTTPS certificate. The hostname is attached only to the production backend project and initially points to the already approved deployment `dpl_JBcmajE1hhVWekj1YwkiJAdTyCTr`. The apex `byahero.app` continues serving the existing landing page; its nameservers, website records and email records were not replaced.

The production Config variable `APP_URL=https://api.byahero.app` is set for the next approved deployment. Test configuration is separate. Domain attachment, alias ownership, public access, and the production URL guard are checked before updating the API hostname. The pipeline cannot promote the root domain or a different project's deployment. Do not change the CNAME to a rotating immutable deployment URL; Vercel's API alias handles approved releases.

## Database changes and pending app cutover

Deploying code preserves database contents. No workflow step imports, synchronizes, seeds, or migrates either database. Table/column changes require a separately reviewed, compatible migration and backup plan. Do not run the historic migration set, `migrate:fresh`, or seeders against the copied databases.

Public API access and the stable API domain are enabled, but existing app endpoints have not switched. Brevo email delivery and eventual final data reconciliation remain unresolved. Approval in GitHub updates only the API alias after checks; it does **not** disable Brevo IP blocking, edit Cloudflare DNS, update app endpoints, or refresh the production snapshot. See [production status](PRODUCTION-STATUS.md). Alwaysdata remains the live data source until a separately authorized cutover. After the user's merge, alwaysdata `/up` returned 200 but the new `/api/health` returned 503; retaining the merged code does not resolve this readiness issue or verify live login/app compatibility.

The pre-existing, entirely commented `.github/workflows/main.yml` was removed because GitHub treated it as an invalid workflow on every push. It contained no active jobs.
