# Admin test build

Open the separate protected test app:

[ByaHero admin test login](https://byahero-backend-test-hj76bh7bn-byaherosupport-2249.vercel.app/admin-test/login)

Sign in to ByaHero's dedicated Vercel account, `byaherosupport-2249`, first, then use an admin account copied from alwaysdata. All API calls and attachment requests use this test backend's origin and its private Supabase `byahero_test` schema. The amber **TEST ENVIRONMENT** banner identifies this build. Published apps continue to use alwaysdata.

## Build again

From `byahero-admin-web`:

```powershell
npm ci
npm run build:test-backend
```

The command loads `.env.backend-test`, uses `/admin-test/` as the public base, and writes generated files to ignored `../laravel-backend/public/admin-test/`. Its final check rejects a bundle containing the live alwaysdata API origin and configures Apache refresh routing for the subdirectory. No database credentials, Supabase server keys, or Vercel protection-bypass secrets go into the frontend.

Redeploy only the separate `byahero-backend-test` project (`prj_8KT0zbl5hVNdGERbzw9L58PrsQqA`), using the Vercel **Preview** environment and explicit `byaherosupport-2249` scope. Keep `ADMIN_TEST_ENABLED=true` scoped to Preview. Include the generated `public/admin-test` files in the backend source upload. Check the resulting deployment URL; a fresh immutable URL will differ from the one above.

From `laravel-backend`, after confirming `vercel project inspect --scope byaherosupport-2249 --non-interactive` names this exact project:

```powershell
vercel deploy --environment preview --scope byaherosupport-2249 --project prj_8KT0zbl5hVNdGERbzw9L58PrsQqA
```

The local backend link now selects the dedicated-account test project. The old personal-account preview is retained as a fallback; both previews share the same Supabase test copy. No Supabase migration is needed for this Vercel account change.

`npm run build` still uses the normal production configuration: root routing, the existing alwaysdata API default, and no test banner. No production environment variables, live Vercel projects, custom domains, DNS, or published app endpoints were changed.

## Acceptance checks

1. Open the test link on the previously affected ISPs.
2. Sign in with a copied admin account; verify the dashboard data loads.
3. Visit Buses, Analytics, Fares, and Lost & Found. Refresh a nested page and confirm it still opens.
4. Make changes only to disposable records in the Supabase copy. Confirm the live app remains unchanged.
5. Sign out and sign in again. Email/push delivery remains disabled in the test deployment.

The UI and API share an origin, so they use the same protected preview session and Laravel cookie. Cross-origin fetches, third-party cookies, extra CORS grants, and frontend bypass credentials are not needed.

Verified: both build modes compile; changed frontend files pass lint; hosted `/admin-test/`, `/admin-test/login`, `/admin-test/analytics`, frontend JavaScript, and `/api/health` return HTTP 200 through authenticated Vercel access. The hosted test JavaScript contains its test banner and no alwaysdata API origin. A transactional PostgreSQL integration check passed admin login, an authenticated dashboard request, and logout without retaining the temporary account.

The dedicated-account replacement also passed the signed-in dashboard, bus directory, nested refresh, and browser Back/Forward checks in the user's Chrome session. ETA “Last Trained” still displays “Invalid Date”; this known display issue is separate from the account move. The earlier full sidebar verification is recorded in `laravel-backend/deploy/ADMIN-VERIFICATION.md`.
