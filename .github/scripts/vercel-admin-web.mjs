import { appendFile, copyFile, lstat, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, assertLatestCommit, command, deploymentUrl, organization } from './vercel-backend.mjs';

export const adminProject = 'prj_GFkKrp2D72tr3LZLOcUhmSyVwq9P';
export const adminDomain = 'admin.byahero.app';
const scope = 'byaherosupport-2249';
const root = fileURLToPath(new URL('../../', import.meta.url));

export function adminSourceFile(relative) {
  if (relative.includes('\\') || relative.split('/').some(part => part === '..' || part.startsWith('.')) || /\.php$/i.test(relative)) return false;
  if (/^(src|public)\//.test(relative)) return true;
  return ['package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'vercel.json',
    'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'scripts/finalize-vercel.mjs',
    'postcss.config.js', 'tailwind.config.js'].includes(relative);
}

export function assertAdminProject(project) {
  if (project.id !== adminProject || project.accountId !== organization || project.framework !== 'vite'
    || project.rootDirectory != null || project.link || project.nodeVersion !== '22.x'
    || project.ssoProtection?.deploymentType !== 'prod_deployment_urls_and_all_previews'
    || project.passwordProtection != null || project.trustedIps != null) {
    throw new Error('Admin project owner, source, runtime, or access policy mismatch.');
  }
}

export function assertAdminAlias(alias, deploymentId) {
  if (alias.alias !== adminDomain || alias.projectId !== adminProject || alias.deploymentId !== deploymentId) {
    throw new Error('Admin domain does not point to the verified admin deployment.');
  }
}

export async function verifyAdminSite(url, { request = fetch } = {}) {
  const get = suffix => request(`${url}${suffix}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  for (const route of ['/login', '/dashboard']) {
    const response = await get(route);
    if (response.status !== 200 || !(await response.text()).includes('<title>ByaHero - Admin Dashboard</title>')) {
      throw new Error('Admin HTML or SPA refresh route failed.');
    }
  }
  const health = await get('/api/health');
  if (health.status !== 200 || (await health.json()).ready !== true) throw new Error('Admin API proxy health failed.');
  const privateResponse = await get('/api/admin/dashboard-stats');
  if (privateResponse.status !== 401 || (await privateResponse.json()).message !== 'Authentication required') {
    throw new Error('Admin API proxy did not enforce Laravel authentication.');
  }
  const php = await get('/api-proxy.php');
  if (/<\?php/i.test(await php.text())) throw new Error('Apache PHP source leaked from the static admin deployment.');
}

async function main() {
  if (process.env.GITHUB_REPOSITORY !== 'ByaHero/ByaHero' || process.env.GITHUB_REF !== 'refs/heads/main'
    || !process.env.VERCEL_TOKEN || !process.env.GITHUB_TOKEN) throw new Error('Only an approved main workflow may release admin web.');
  const sha = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Missing exact admin release commit.');
  await assertLatestCommit(sha);
  assertAdminProject(api(`/v9/projects/${adminProject}`));
  const binding = api(`/v9/projects/${adminProject}/domains/${adminDomain}`);
  if (binding.name !== adminDomain || binding.verified !== true || binding.redirect != null || binding.gitBranch != null) throw new Error('Admin production domain binding is not verified.');

  const stage = await mkdtemp(path.join(process.env.RUNNER_TEMP || tmpdir(), 'byahero-admin-web-'));
  const files = command('git', ['ls-files', '-z', '--', 'byahero-admin-web']).split('\0').filter(Boolean);
  let copied = 0;
  for (const file of files) {
    const relative = file.slice('byahero-admin-web/'.length);
    if (!adminSourceFile(relative)) continue;
    const source = path.join(root, file);
    if (!(await lstat(source)).isFile()) throw new Error('Admin deploy source must be regular tracked files.');
    const destination = path.join(stage, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    copied++;
  }
  if (copied < 20) throw new Error('Incomplete admin source.');
  await mkdir(path.join(stage, '.vercel'));
  await writeFile(path.join(stage, '.vercel/project.json'), JSON.stringify({ projectId: adminProject, orgId: organization }));
  await writeFile(path.join(stage, '.vercelignore'), '.env\n.env.*\n.git\n.vercel\nnode_modules\ndist\n');
  const url = deploymentUrl(command('vercel', ['deploy', '--prod', '--skip-domain', '--yes', '--scope', scope,
    '--meta', `githubCommitSha=${sha}`], stage).split(/\r?\n/).at(-1));
  const deployment = api(`/v13/deployments/${new URL(url).hostname}`);
  if (deployment.projectId !== adminProject || deployment.readyState !== 'READY' || deployment.target !== 'production') {
    throw new Error('Admin deployment is not READY in the correct project/environment.');
  }
  if ((deployment.alias ?? []).length) throw new Error('Admin staged deployment unexpectedly assigned aliases.');
  assertAdminProject(api(`/v9/projects/${adminProject}`));
  await verifyAdminSite(url, { async request(endpoint) {
    const output = command('vercel', ['curl', endpoint, '--scope', scope, '--', '--silent', '--show-error', '--write-out', '\n%{http_code}'], stage);
    const start = output.lastIndexOf('\n');
    return new Response(output.slice(0, start), { status: Number(output.slice(start + 1)) });
  } });
  await assertLatestCommit(sha);
  command('vercel', ['alias', 'set', url, adminDomain, '--scope', scope], stage);
  assertAdminAlias(api(`/v4/aliases/${adminDomain}`), deployment.id);
  await verifyAdminSite(`https://${adminDomain}`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `### Admin web\n\nCommit: \`${sha}\`\n\n[Production admin](https://${adminDomain})\n\nREADY; SPA refresh, API health, and private-route authentication checks passed. Alwaysdata unchanged.\n`);
  console.log(`Admin web verified: https://${adminDomain}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
