import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertProject, assertProductionAlias, assertProductionAliases, deploymentUrl, organization, productionDomain, projects, runtimeFile, verifyHttpAccess } from './vercel-backend.mjs';

test('deployment source excludes private state, credentials, migrations tools and test UI', () => {
  for (const file of ['.env', '.env.production.runtime', 'storage/migration/export/users.jsonl', '.vercel/project.json', 'vendor/autoload.php', 'scripts/migrate-production.php', 'deploy/provider-check.php', 'deploy/PRODUCTION-STATUS.md', 'tests/Feature/ExampleTest.php', 'bootstrap/cache/config.php', 'public/public/login.php', 'public/admin-test/index.html', 'public/storage/photo.jpg', '../config/app.php', 'app/.env.secret']) {
    assert.equal(runtimeFile(file), false, file);
  }
  for (const file of ['app/Http/Controllers/AuthController.php', 'config/database.php', 'routes/api.php', 'public/index.php', 'public/.htaccess', 'deploy/start.sh', 'Dockerfile.vercel', 'composer.lock']) assert.equal(runtimeFile(file), true, file);
});

function fixture(role) {
  const target = role === 'test' ? 'preview' : 'production';
  const values = { DB_CONNECTION: 'pgsql', DB_SCHEMA: `byahero_${role}`, DEPLOYMENT_ROLE: role, APP_DEBUG: 'false', ADMIN_TEST_ENABLED: role === 'test' ? 'true' : 'false', EXTERNAL_NOTIFICATIONS_ENABLED: 'false' };
  if (role === 'production') values.APP_URL = `https://${productionDomain}`;
  return [{ id: projects[role], accountId: organization, ssoProtection: role === 'test' ? { deploymentType: 'all' } : null, link: null }, Object.entries(values).map(([key, value]) => ({ key, value, target: [target] }))];
}

test('project guards enforce the owner, role-specific access policy and database configuration', () => {
  for (const role of ['test', 'production']) {
    const [project, variables] = fixture(role);
    assert.doesNotThrow(() => assertProject(project, role, variables));
    assert.throws(() => assertProject({ ...project, id: projects[role === 'test' ? 'production' : 'test'] }, role, variables));
    assert.throws(() => assertProject({ ...project, accountId: 'another-team' }, role, variables));
    assert.throws(() => assertProject({ ...project, ssoProtection: role === 'test' ? null : { deploymentType: 'all' } }, role, variables));
    assert.throws(() => assertProject({ ...project, link: { type: 'github' } }, role, variables));
    assert.throws(() => assertProject(project, role, variables.map(variable => variable.key === 'DB_SCHEMA' ? { ...variable, value: 'public' } : variable)));
  }
});

test('API alias updates cannot target another hostname, project or deployment', () => {
  const deploymentId = 'dpl_verified';
  const alias = { alias: productionDomain, projectId: projects.production, deploymentId };
  assert.doesNotThrow(() => assertProductionAlias(alias, deploymentId));
  assert.throws(() => assertProductionAlias({ ...alias, alias: 'byahero.app' }, deploymentId));
  assert.throws(() => assertProductionAlias({ ...alias, projectId: projects.test }, deploymentId));
  assert.throws(() => assertProductionAlias({ ...alias, deploymentId: 'dpl_old' }, deploymentId));
  assert.doesNotThrow(() => assertProductionAliases([]));
  assert.doesNotThrow(() => assertProductionAliases([productionDomain]));
  assert.doesNotThrow(() => assertProductionAliases([{ alias: productionDomain }]));
  assert.throws(() => assertProductionAliases(['byahero.app']));
});

test('public production checks use no bypass and still require application authentication', async () => {
  const url = 'https://byahero-backend-abc-byaherosupport-2249.vercel.app';
  const privateBody = { success: false, message: 'Authentication required' };
  await verifyHttpAccess('production', url, {
    request: async endpoint => endpoint.endsWith('/health') ? Response.json({ ready: true }) : Response.json(privateBody, { status: 401 }),
    protectedGet() { assert.fail('Public production checks must not use a protection bypass'); },
  });
  await assert.rejects(verifyHttpAccess('production', url, { request: async () => new Response(null, { status: 302 }) }));
  await assert.rejects(verifyHttpAccess('production', url, { request: async () => Response.json({ ready: true }) }));
});

test('test checks reject public access and verify Laravel auth behind Vercel protection', async () => {
  const url = 'https://byahero-backend-test-abc-byaherosupport-2249.vercel.app';
  await verifyHttpAccess('test', url, {
    request: async () => new Response(null, { status: 302 }),
    protectedGet: async endpoint => endpoint.endsWith('/health')
      ? { status: 200, body: { ready: true } }
      : { status: 401, body: { success: false, message: 'Authentication required' } },
  });
  await assert.rejects(verifyHttpAccess('test', url, { request: async () => Response.json({ ready: true }) }));
});

test('URLs are confined to dedicated-account Vercel origins', () => {
  assert.equal(deploymentUrl('https://byahero-backend-abc-byaherosupport-2249.vercel.app'), 'https://byahero-backend-abc-byaherosupport-2249.vercel.app');
  for (const url of ['https://example.com', 'http://byahero-backend-abc-byaherosupport-2249.vercel.app', 'https://byahero-backend-abc-byaherosupport-2249.vercel.app/path', 'https://byahero-backend-abc-byaherosupport-2249.vercel.app.evil.test']) assert.throws(() => deploymentUrl(url));
});
