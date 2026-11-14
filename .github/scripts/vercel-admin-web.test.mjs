import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminDomain, adminProject, adminSourceFile, assertAdminAlias, assertAdminProject, verifyAdminSite } from './vercel-admin-web.mjs';
import { organization, projects } from './vercel-backend.mjs';

test('admin upload excludes environment files, PHP, operator data, and generated output', () => {
  for (const file of ['.env', '.env.production', '.vercel/project.json', 'public/api-proxy.php', 'public/test.PHP',
    'public/.htaccess', 'src/.env.secret', 'node_modules/package/index.js', 'dist/index.html', '../package.json',
    'src/../../.env', 'src\\secret.ts', 'scripts/finalize-backend-test.mjs', 'README.md',
    'assets/images/uploads/lost_and_found/private.png', 'public/assets/images/uploads/private.png',
    'public/storage/private.png', 'assets/images/js/auth/login.js']) {
    assert.equal(adminSourceFile(file), false, file);
  }
  for (const file of ['package.json', 'package-lock.json', 'index.html', 'vercel.json', 'vite.config.ts',
    'tailwind.config.js', 'postcss.config.js', 'tsconfig.app.json', 'src/services/api.ts',
    'public/assets/images/byaheroLogoBlue.svg', 'assets/data/laurel-talisay-tanauan.json',
    'assets/images/icons/busStopMarkerFinal1.svg', 'assets/images/byaheroLogoBlue.svg',
    'scripts/finalize-vercel.mjs']) assert.equal(adminSourceFile(file), true, file);
});

test('admin release pins its project and account and preserves protected previews', () => {
  const project = { id: adminProject, accountId: organization, framework: 'vite', nodeVersion: '22.x', rootDirectory: null,
    link: null, ssoProtection: { deploymentType: 'prod_deployment_urls_and_all_previews' } };
  assert.doesNotThrow(() => assertAdminProject(project));
  for (const change of [{ id: projects.production }, { accountId: 'another-account' }, { framework: 'container' },
    { rootDirectory: 'laravel-backend' }, { ssoProtection: null }, { ssoProtection: { deploymentType: 'all' } },
    { link: { type: 'github' } }, { passwordProtection: {} }, { nodeVersion: '26.x' }]) {
    assert.throws(() => assertAdminProject({ ...project, ...change }));
  }
});

test('admin alias cannot update the API, passenger, landing page, or another project', () => {
  const alias = { alias: adminDomain, projectId: adminProject, deploymentId: 'dpl_checked' };
  assert.doesNotThrow(() => assertAdminAlias(alias, 'dpl_checked'));
  for (const domain of ['api.byahero.app', 'passenger.byahero.app', 'byahero.app']) {
    assert.throws(() => assertAdminAlias({ ...alias, alias: domain }, 'dpl_checked'));
  }
  assert.throws(() => assertAdminAlias({ ...alias, projectId: projects.production }, 'dpl_checked'));
  assert.throws(() => assertAdminAlias(alias, 'dpl_old'));
});

test('admin checks distinguish the app from SSO/SPA fallbacks and require private API authentication', async () => {
  const html = '<title>ByaHero - Admin Dashboard</title>';
  const request = async url => {
    if (url.endsWith('/api/health')) return Response.json({ ready: true });
    if (url.endsWith('/api/admin/dashboard-stats')) return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    return new Response(html);
  };
  await verifyAdminSite('https://admin.byahero.app', { request });
  await assert.rejects(verifyAdminSite('https://admin.byahero.app', { request: async () => new Response('Sign in to Vercel', { status: 302 }) }));
  await assert.rejects(verifyAdminSite('https://admin.byahero.app', { request: async url => url.endsWith('/api/health') ? new Response(html) : request(url) }));
  await assert.rejects(verifyAdminSite('https://admin.byahero.app', { request: async url => url.endsWith('/api/admin/dashboard-stats') ? Response.json({ success: true }) : request(url) }));
  await assert.rejects(verifyAdminSite('https://admin.byahero.app', { request: async url => url.endsWith('/api-proxy.php') ? new Response('<?php secret') : request(url) }));
});
