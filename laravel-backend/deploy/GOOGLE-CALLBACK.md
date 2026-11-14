# Google mobile callback migration

New production callback: `https://api.byahero.app/auth/google/callback`.

The existing Web OAuth client is `299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com` in Google Cloud project `byahero-82e06`. Add the exact new URL to its authorized redirect URIs. Keep the old alwaysdata entry and all other existing entries. No new OAuth secret or paid service is needed. Google may take time to apply a saved configuration.

The Laravel callback renders a page with a same-origin script. Google ID tokens remain in the browser fragment until passed to the fixed `byaheromobile://` root deep link. The script clears the callback URL from browser history, rejects remote/script/modified-app destinations, and never forwards query-string tokens, access tokens or arbitrary fragments. It makes no external requests and emits no token logs. The route does not start a database session and sets no-store, no-referrer and framing restrictions. The existing API verifies the signed Google ID token and creates the authenticated app session.

This callback accepts installed production builds only. Expo Go `exp://` destinations are deliberately rejected; local development needs a separately registered development callback rather than using the production token bridge as an arbitrary redirect.

Rollout order:

1. Save the new URI on the existing Google OAuth client.
2. Push the reviewed source to main; verify the protected Vercel test deployment.
3. Approve that exact commit in the GitHub `vercel-backend-production` environment.
4. Verify public callback HTML/script and security headers at the canonical domain, API health 200, and private routes 401.
5. Verify Google accepts the new redirect URI before publishing passenger 2.0.15 (Android code 24).
6. Verify the APK checksum, previous signing certificate and bundled new callback URL; publish with the APK attached.
7. Install the update and complete Google sign-in on a device. Existing older APKs keep using the old registered callback until updated.

Alwaysdata files, Google client secrets, database data and app API endpoints do not need changes for this callback migration. Email signup/password-reset features remain temporarily unavailable. No database import, migrations or seeders are part of this release.
