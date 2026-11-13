# Admin preview verification — 13 November 2026

Read-only acceptance checks used the user's signed-in native Google Chrome session.

Preview: https://byahero-backend-test-hnmtlu7x9-timbibats-projects.vercel.app/admin-test/

Deployment: `dpl_7Zss3YscdSnuCJanU8aPW2FbULsw`.

## Dedicated-account replacement

The original full-sidebar check below was on the personal-account preview. The active test preview is now hosted under ByaHero's dedicated Hobby account:

- URL: https://byahero-backend-test-hj76bh7bn-byaherosupport-2249.vercel.app/admin-test/
- Deployment: `dpl_8nZm8gfhqgommZAnZSQGxV3uRwGX`
- Project: `prj_8KT0zbl5hVNdGERbzw9L58PrsQqA`, scope `byaherosupport-2249`
- The user signed in through their Chrome Vercel session and copied ByaHero admin account. Dashboard and bus directory rendered; a nested bus-directory refresh retained authentication. Browser Back returned to the dashboard and Forward reopened the bus directory. Chrome was left on the new dashboard.
- Authorized HTTP checks passed for Laravel boot, database health, session ping, admin login, nested analytics route, and frontend JavaScript. A request without Vercel authentication returned HTTP 302. The hosted frontend retained the test banner and contained no alwaysdata API origin.
- Runtime review returned 100 records with no additional page and no error/fatal, Laravel error, PHP fatal/warning, or HTTP 5xx matches for this successful deployment.
- A Laravel cache-directory startup error in the preceding Preview was corrected in `deploy/start.sh` before these checks. ETA “Last Trained” still displays “Invalid Date.”

The original personal-account preview remains as a fallback. Both previews use the same Supabase test schema and bucket. Live alwaysdata data, app endpoints, DNS, and the published Vercel frontend configuration remain unchanged.

## Results

The dashboard and all 13 sidebar destinations opened on the separate test origin with the test-environment banner:

| Page | Path | Observed result |
| --- | --- | --- |
| Dashboard | `/admin-test/` | Copied fleet, personnel, incident, fare, and telemetry totals loaded |
| Total Buses | `/admin-test/buses` | Bus directory loaded |
| Active Buses | `/admin-test/active-buses` | Active bus telemetry page loaded |
| Schedules | `/admin-test/schedules` | Both route schedules loaded |
| Waiting Pax | `/admin-test/waiting-passengers` | Waiting passenger directory loaded |
| Drivers & Conductors | `/admin-test/conductors` | Personnel directory loaded |
| Bus Stops | `/admin-test/stops` | Stop network and map rendered |
| Lost & Found | `/admin-test/lost-and-found` | Inventory loaded |
| Reports | `/admin-test/reports` | Incident and delay log loaded |
| Feedbacks | `/admin-test/feedbacks` | Empty feedback state matched the copy |
| Bus Fares | `/admin-test/fares` | Fare matrix and generator page loaded |
| Analytics | `/admin-test/analytics` | Metrics, passenger flow, route volume, and stop demand rendered |
| Receipt Format | `/admin-test/receipts` | Settings and receipt preview rendered |
| Profile Settings | `/admin-test/profile` | Profile and password sections rendered |

Dashboard values included 50 buses, 26 staff, 14 terminal stops, 5 lost-and-found entries, 5 reports, 62 fares, and 19,495 telemetry records. No page-level failure indicators remained after loading. Refreshing the nested profile route retained the authenticated app view.

No Vercel error/fatal runtime logs were returned for this deployment in the 30-minute window ending 2026-11-13 14:01 UTC. This does not establish that every browser request succeeded; it complements the visible page checks.

## Findings and limits

- Dashboard ETA “Last Trained” displays “Invalid Date.” This is a remaining display issue; the test Python ML service is disabled and ETA uses its local fallback.
- One original lost-and-found attachment was already unavailable at the source, with no backup. Its reference remains preserved, as documented in STATUS.md.
- Browser Back/Forward was not conclusively verified. The user interacted with Chrome during the final history checks; no pass is claimed for those checks.
- No create, edit, delete, save, retrain, receipt-printing, or external notification actions were performed. This verifies page loading/navigation, not every management action or real-time device flow.
- Access used an existing expiring private preview link. An attempted account-specific preview grant was not confirmed; do not assume permanent access for another Vercel account. Deployment protection remains enabled.

Alwaysdata, live app endpoints, DNS, published frontend configuration, and live data were not changed. No code or deployment changes were made during these browser acceptance checks.
