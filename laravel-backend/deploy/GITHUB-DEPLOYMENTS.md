# GitHub backend deployments

The dedicated branch is **`codex/vercel-backend`** in `ByaHero/ByaHero`. Backend, admin test UI, or deployment pipeline changes pushed to this branch run [Backend - protected Vercel releases](https://github.com/ByaHero/ByaHero/actions/workflows/deploy-vercel-backend.yml).

The branch starts from the existing `main` commit and includes the prepared Laravel/Supabase code and isolated admin test build. It has not been merged into `main`. The existing alwaysdata, admin web, landing page, and APK workflows are unchanged. **Pushing to `main` still triggers the existing alwaysdata backend workflow.**

## Normal update

1. Work on `codex/vercel-backend`, review the code, commit, and push that branch. Its push permission is restricted to `timbibat`; force pushes and branch deletion are blocked, including for administrators. Collaborators can propose changes through pull requests for review.
2. GitHub runs deployment-guard tests, the default PHP suite, a Composer production-dependency audit, startup-script syntax checks, and the isolated admin test build. It then deploys to the dedicated **test project / Preview environment**, checks protected readiness and anonymous application rejection, and publishes the new deployment URL in the job summary.
3. Open that URL while signed in to the owning Vercel account. The admin test app is at `/admin-test/login`. Test the change with the copied test data.
4. The production job waits for **`timbibat`**. In that workflow run, choose **Review deployments**, select `vercel-backend-production`, and approve only after checking the exact commit and test URL. Reject it if the change should stay in testing.
5. Approval stages the **same Git commit** in the separate production project and checks readiness/protection. It remains protected and receives no production alias (`--prod --skip-domain`). It does not switch a live application or complete the eventual data cutover.

A new matching push cancels an older run and pending approval. The deployment script also checks the branch head before releasing, rejecting a stale commit. Cancelling a workflow after Vercel has already accepted a build does not delete that immutable deployment; it remains protected. Test and production have different runtime configuration and are separately built from the same commit.

The workflow is present on the dedicated branch rather than `main`, so its first successful push run may be the easiest way to open it in Actions. It deliberately has no default-branch manual-dispatch dependency.

## GitHub and Vercel configuration

Two new GitHub environments are restricted to the dedicated branch:

| GitHub environment | Vercel project | Vercel environment | Approval |
| --- | --- | --- | --- |
| `vercel-backend-test` | `byahero-backend-test` (`prj_8KT0zbl5hVNdGERbzw9L58PrsQqA`) | Preview | Automatic after checks |
| `vercel-backend-production` | `byahero-backend` (`prj_1LnFKHZz3I9mGcr7fk7gVFTMavUo`) | Production, no alias assignment | `timbibat` required |

Both environments contain non-secret `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` variables. The user saves `VERCEL_TOKEN` directly as a secret in each environment; it is never copied from a developer's CLI login. Use a classic access token scoped to the ByaHero team/account `byaherosupport-2249`. During verification, the initially supplied token failed the CLI's account lookup with `User not found`; project-restricted tokens have a [reported CLI compatibility issue](https://github.com/vercel/vercel/issues/17506). The pipeline independently pins the intended project and owner. Replace or renew tokens in these environments when necessary. Production secrets are unavailable to its job until approval. Administrator bypass of production approval is disabled; self-approval is allowed so the sole designated operator can approve their own release.

Both Vercel projects protect **all** deployments with Vercel Authentication. Neither is connected to Git for automatic production releases. The script checks pinned project/account IDs, protection, PostgreSQL schema, deployment role, debug mode, test UI mode, and disabled test notifications before releasing. Application credentials stay in Vercel; GitHub does not pull `.env` files or database passwords.

Container builds run remotely on Vercel using the pinned CLI 65.15.0. The pipeline stages only allowlisted tracked runtime source; private snapshots, developer environments, caches, logs, migration tools, and the admin test UI are excluded from production. Only the test build includes its generated admin bundle. Action versions are pinned to commit SHAs.

Local verification passed the 24 default backend tests (79 assertions; four opt-in database tests skipped), three deployment-guard tests, workflow lint, and the isolated admin build. The existing admin dependency tree reports ten npm advisories (two moderate, seven high, one critical); its package versions were preserved during this deployment setup. The backend Composer production-dependency audit is a release gate; these frontend dependency warnings need separate remediation.

## Database changes and current production hold

Deploying code preserves database contents. No workflow step imports, synchronizes, seeds, or migrates either database. Table/column changes require a separately reviewed, compatible migration and backup plan. Do not run the historic migration set, `migrate:fresh`, or seeders against the copied databases.

The production candidate remains on hold for Brevo email delivery and eventual final data reconciliation. Approval in GitHub does **not** disable Brevo IP blocking, remove Vercel protection, change DNS, promote an alias, update app endpoints, or refresh the production snapshot. See [production status](PRODUCTION-STATUS.md). Alwaysdata remains authoritative until a separately authorized cutover.

The repository also has a pre-existing, entirely commented `.github/workflows/main.yml`, which GitHub reports as an invalid workflow on pushes. It is separate from this release pipeline and was left unchanged with the existing workflows.
