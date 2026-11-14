# Admin web on Vercel

Production hostname: `https://admin.byahero.app`. Project: `byahero-admin-web` (`prj_GFkKrp2D72tr3LZLOcUhmSyVwq9P`), in ByaHero's `byaherosupport-2249` account. It is separate from the Laravel API and passenger website.

`vercel.json` builds with `npm run build:vercel`, serves the `dist` SPA, and rewrites `/api`, uploaded image paths and route files to `https://api.byahero.app`. Keep `VITE_API_BASE_URL` unset so browser requests remain same-origin. No backend database, Firebase, Brevo, or Supabase server credentials belong in this frontend project. The deployed source is an allowlist of tracked app/build files; environment files, local state and PHP are excluded.

The Vercel finalizer removes `api-proxy.php` and `.htaccess` from static output. The default `npm run build` still includes those files for the backup alwaysdata deployment. The separate `build:test-backend` command still produces the protected `/admin-test/` bundle and its test banner.

Backend/admin changes on main use `.github/workflows/deploy-vercel-backend.yml`. The test job validates both admin builds. After the existing `vercel-backend-production` environment approval, the production job deploys the API and then the admin frontend from the same commit. The same team-scoped `VERCEL_TOKEN` is used; no new credential or paid plan is needed. The admin script pins its project/account, stages production without aliases, checks it using authorized Vercel access, and changes only `admin.byahero.app` after verification. It checks public HTML, SPA refresh, API health and Laravel HTTP 401 after assigning the domain. No automatic Git production integration is enabled for this project.

Preview/generated deployment URLs use Standard Vercel Authentication. The production custom hostname is public so existing admins can use ByaHero's password login; private API routes still require a real admin session. Add the exact admin hostname to the backend's Production `CORS_ALLOWED_ORIGINS` before deployment. The alwaysdata PHP proxy remains compatible with the API's own origin.

Cloudflare record: DNS-only CNAME `admin` → `f8d4ddc31251f8db.vercel-dns-017.com`. Keep the apex landing page, passenger and API records unchanged. Verify Vercel's current domain instructions before replacing a record in a future migration.

After deployment, sign in again on the new hostname. Check dashboard, navigation, analytics, reports and existing attachments without changing live records. Existing users/data stay in Supabase; this frontend move performs no database import, schema migration, seeding, or Android release. Keep `https://byahero-admin.alwaysdata.net` available as the previous frontend, and leave its FTP workflow manual-only. A failed admin step does not undo an already completed API release; review both job summaries when diagnosing a partial release.
