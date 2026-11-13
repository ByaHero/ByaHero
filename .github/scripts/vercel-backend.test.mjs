import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertProject, deploymentUrl, organization, projects, runtimeFile } from './vercel-backend.mjs';

test('deployment source excludes private state, credentials, migrations tools and test UI', () => {
  for (const file of ['.env', '.env.production.runtime', 'storage/migration/export/users.jsonl', '.vercel/project.json', 'vendor/autoload.php', 'scripts/migrate-production.php', 'deploy/provider-check.php', 'deploy/PRODUCTION-STATUS.md', 'tests/Feature/ExampleTest.php', 'bootstrap/cache/config.php', 'public/public/login.php', 'public/admin-test/index.html', 'public/storage/photo.jpg', '../config/app.php', 'app/.env.secret']) {
    assert.equal(runtimeFile(file), false, file);
  }
  for (const file of ['app/Http/Controllers/AuthController.php', 'config/database.php', 'routes/api.php', 'public/index.php', 'public/.htaccess', 'deploy/start.sh', 'Dockerfile.vercel', 'composer.lock']) assert.equal(runtimeFile(file), true, file);
});

function fixture(role) {
  const target = role === 'test' ? 'preview' : 'production';
  const values = { DB_CONNECTION: 'pgsql', DB_SCHEMA: `byahero_${role}`, DEPLOYMENT_ROLE: role, APP_DEBUG: 'false', ADMIN_TEST_ENABLED: role === 'test' ? 'true' : 'false', EXTERNAL_NOTIFICATIONS_ENABLED: 'false' };
  return [{ id: projects[role], accountId: organization, ssoProtection: { deploymentType: 'all' }, link: null }, Object.entries(values).map(([key, value]) => ({ key, value, target: [target] }))];
}

test('project guards reject wrong owner, disabled protection and wrong database configuration', () => {
  for (const role of ['test', 'production']) {
    const [project, variables] = fixture(role);
    assert.doesNotThrow(() => assertProject(project, role, variables));
    assert.throws(() => assertProject({ ...project, id: projects[role === 'test' ? 'production' : 'test'] }, role, variables));
    assert.throws(() => assertProject({ ...project, accountId: 'another-team' }, role, variables));
    assert.throws(() => assertProject({ ...project, ssoProtection: null }, role, variables));
    assert.throws(() => assertProject({ ...project, link: { type: 'github' } }, role, variables));
    assert.throws(() => assertProject(project, role, variables.map(variable => variable.key === 'DB_SCHEMA' ? { ...variable, value: 'public' } : variable)));
  }
});

test('URLs are confined to dedicated-account Vercel origins', () => {
  assert.equal(deploymentUrl('https://byahero-backend-abc-byaherosupport-2249.vercel.app'), 'https://byahero-backend-abc-byaherosupport-2249.vercel.app');
  for (const url of ['https://example.com', 'http://byahero-backend-abc-byaherosupport-2249.vercel.app', 'https://byahero-backend-abc-byaherosupport-2249.vercel.app/path', 'https://byahero-backend-abc-byaherosupport-2249.vercel.app.evil.test']) assert.throws(() => deploymentUrl(url));
});
