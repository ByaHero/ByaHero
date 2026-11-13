#!/bin/sh
set -eu

# Fail closed: each deployment must use its designated private PostgreSQL schema.
test "${DB_CONNECTION:-}" = pgsql || { echo 'DB_CONNECTION must be pgsql' >&2; exit 1; }
case "${DEPLOYMENT_ROLE:-test}" in
    test)
        test "${DB_SCHEMA:-}" = byahero_test || { echo 'Test schema mismatch' >&2; exit 1; }
        test "${EXTERNAL_NOTIFICATIONS_ENABLED:-false}" = false || { echo 'Keep test notifications disabled' >&2; exit 1; }
        export EXTERNAL_NOTIFICATIONS_ENABLED=false
        ;;
    production)
        test "${DB_SCHEMA:-}" = byahero_production || { echo 'Production schema mismatch' >&2; exit 1; }
        test "${APP_ENV:-}" = production || { echo 'Production environment mismatch' >&2; exit 1; }
        test "${ADMIN_TEST_ENABLED:-false}" = false || { echo 'Disable test admin in production' >&2; exit 1; }
        ;;
    *) echo 'Unknown deployment role' >&2; exit 1 ;;
esac
test -n "${APP_KEY:-}" || { echo 'APP_KEY is required' >&2; exit 1; }
test "${APP_DEBUG:-false}" = false || { echo 'Disable APP_DEBUG' >&2; exit 1; }
export APP_DEBUG=false
if [ -z "${APP_URL:-}" ] && [ -n "${VERCEL_URL:-}" ]; then
    export APP_URL="https://${VERCEL_URL}"
fi

port="${PORT:-8080}"
sed -i "s/^Listen 80$/Listen ${port}/" /etc/apache2/ports.conf
sed -i "s/\*:80>/*:${port}>/" /etc/apache2/sites-available/000-default.conf

# Generate and read caches as the same user that handles Apache requests.
# Runtime cache files must remain writable after startup creates them.
chown -R www-data:www-data storage bootstrap/cache
chmod -R u+rwX,g+rX storage bootstrap/cache

# No schema changes, seeding, or production credentials at startup/build time.
su -s /bin/sh -c 'php artisan package:discover --ansi && php artisan config:cache && php artisan route:cache' www-data
exec apache2-foreground
