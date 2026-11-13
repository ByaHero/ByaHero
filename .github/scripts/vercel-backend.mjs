import { spawnSync } from 'node:child_process';
import { appendFile, copyFile, lstat, mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const branch = 'codex/vercel-backend';
export const organization = 'team_v3g9PH1rTsopQvRzEZ1sb6h3';
export const projects = {
  test: 'prj_8KT0zbl5hVNdGERbzw9L58PrsQqA',
  production: 'prj_1LnFKHZz3I9mGcr7fk7gVFTMavUo',
};
const scope = 'byaherosupport-2249';
const root = fileURLToPath(new URL('../../', import.meta.url));

export function runtimeFile(relative) {
  if (relative.includes('\\') || relative.split('/').some(part => part === '..' || part.startsWith('.env'))) return false;
  if (/^(app|bootstrap|config|database|resources|routes)\//.test(relative)) {
    return !relative.startsWith('bootstrap/cache/');
  }
  if (relative.startsWith('public/')) {
    return !/^public\/(public|storage|admin-test)(\/|$)/.test(relative);
  }
  return ['artisan', 'composer.json', 'composer.lock', 'Dockerfile.vercel', 'vercel.json',
    '.dockerignore', 'deploy/start.sh', 'deploy/apache.conf', 'deploy/php.ini'].includes(relative);
}

export function assertProject(project, role, environmentVariables) {
  if (!projects[role] || project.id !== projects[role] || project.accountId !== organization) throw new Error('Wrong Vercel project or owner.');
  if (project.ssoProtection?.deploymentType !== 'all') throw new Error('All deployment URLs must remain protected.');
  if (project.link) throw new Error('Unexpected Git integration; review automatic deployment behavior first.');
  const target = role === 'test' ? 'preview' : 'production';
  const configuration = Object.fromEntries(environmentVariables.filter(variable => variable.target?.includes(target)).map(variable => [variable.key, variable.value]));
  const expected = {
    DB_CONNECTION: 'pgsql', DB_SCHEMA: `byahero_${role}`, DEPLOYMENT_ROLE: role,
    APP_DEBUG: 'false', ADMIN_TEST_ENABLED: role === 'test' ? 'true' : 'false',
  };
  if (role === 'test') expected.EXTERNAL_NOTIFICATIONS_ENABLED = 'false';
  for (const [key, value] of Object.entries(expected)) {
    if (configuration[key] !== value) throw new Error(`Unexpected ${target} configuration for ${key}.`);
  }
}

function command(program, args, cwd = root) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, timeout: 15 * 60 * 1000 });
  // Do not echo arbitrary provider responses or environment-variable payloads.
  if (result.status !== 0) throw new Error(`${program} ${args[0]} failed (exit ${result.status ?? 'timeout'}); inspect the protected Vercel build dashboard.`);
  return result.stdout.trim();
}

function api(endpoint) {
  return JSON.parse(command('vercel', ['api', endpoint, '--scope', scope]));
}

export function deploymentUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== value || !url.hostname.endsWith(`-${scope}.vercel.app`)) throw new Error('Unexpected deployment URL.');
  return url.origin;
}

async function copyTree(source, destination) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Symlinks are not permitted in the test bundle.');
    const nextSource = path.join(source, entry.name);
    const nextDestination = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await mkdir(nextDestination, { recursive: true });
      await copyTree(nextSource, nextDestination);
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.env')) throw new Error('Environment files cannot be deployed.');
      await copyFile(nextSource, nextDestination);
    }
  }
}

async function main(role) {
  if (!projects[role]) throw new Error('Expected test or production.');
  if (process.env.GITHUB_REPOSITORY !== 'ByaHero/ByaHero' || process.env.GITHUB_REF !== `refs/heads/${branch}`) throw new Error('Only the dedicated deployment branch may release.');
  if (process.env.VERCEL_PROJECT_ID !== projects[role] || process.env.VERCEL_ORG_ID !== organization) throw new Error('GitHub environment IDs do not match the pinned target.');
  if (!process.env.VERCEL_TOKEN || !process.env.GITHUB_TOKEN) throw new Error('Save VERCEL_TOKEN directly in the matching GitHub environment first.');
  const sha = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Missing exact release commit.');
  const headResponse = await fetch(`https://api.github.com/repos/ByaHero/ByaHero/git/ref/heads/${branch}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!headResponse.ok || (await headResponse.json()).object?.sha !== sha) throw new Error('This run is stale; deploy and approve the latest branch commit.');
  if (role === 'production') deploymentUrl(process.env.TEST_DEPLOYMENT_URL ?? '');

  const project = api(`/v9/projects/${projects[role]}`);
  // Read only the named, non-secret guard settings. Never log environment responses.
  const listedVariables = api(`/v10/projects/${projects[role]}/env`).envs ?? [];
  const guardKeys = ['DB_CONNECTION', 'DB_SCHEMA', 'DEPLOYMENT_ROLE', 'APP_DEBUG', 'ADMIN_TEST_ENABLED', 'EXTERNAL_NOTIFICATIONS_ENABLED'];
  const target = role === 'test' ? 'preview' : 'production';
  const variables = listedVariables.filter(variable => guardKeys.includes(variable.key) && variable.target?.includes(target)).map(variable => {
    if (variable.visibility === 'secret' || variable.type === 'sensitive') throw new Error('Guard configuration must use Config values.');
    const config = api(`/v1/projects/${projects[role]}/env/${variable.id}`);
    return { ...variable, value: config.value };
  });
  assertProject(project, role, variables);

  // Build an allowlisted source tree, never a copy of a developer's .env or snapshots.
  const stage = await mkdtemp(path.join(process.env.RUNNER_TEMP || tmpdir(), `byahero-${role}-`));
  const files = command('git', ['ls-files', '-z', '--', 'laravel-backend']).split('\0').filter(Boolean);
  let copied = 0;
  for (const file of files) {
    const relative = file.slice('laravel-backend/'.length);
    if (!runtimeFile(relative)) continue;
    const source = path.join(root, file);
    if (!(await lstat(source)).isFile()) throw new Error('Only regular tracked source files may be deployed.');
    const destination = path.join(stage, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    copied++;
  }
  if (copied < 50) throw new Error('Incomplete backend deployment source.');
  if (role === 'test') {
    const destination = path.join(stage, 'public/admin-test');
    await mkdir(destination, { recursive: true });
    await copyTree(path.join(root, 'laravel-backend/public/admin-test'), destination);
  }
  await mkdir(path.join(stage, '.vercel'));
  await writeFile(path.join(stage, '.vercel/project.json'), JSON.stringify({ projectId: projects[role], orgId: organization }));
  await writeFile(path.join(stage, '.vercelignore'), '.env\n.env.*\n.git\n.vercel\nvendor\nnode_modules\nstorage\ntests\n');

  // Container builds run remotely. No environment pull or local secret-bearing build.
  const args = ['deploy', '--yes', '--scope', scope, '--meta', `githubCommitSha=${sha}`];
  if (role === 'test') args.push('--environment', 'preview');
  else args.push('--prod', '--skip-domain');
  const url = deploymentUrl(command('vercel', args, stage).split(/\r?\n/).at(-1));
  const deployment = api(`/v13/deployments/${new URL(url).hostname}`);
  if (deployment.projectId !== projects[role] || deployment.readyState !== 'READY') throw new Error('Deployment did not become READY on the intended project.');
  if ((role === 'test' && deployment.target === 'production') || (role === 'production' && deployment.target !== 'production')) throw new Error('Deployment environment mismatch.');
  if (role === 'production' && deployment.alias?.length) throw new Error('Unexpected production aliases; review before proceeding.');
  assertProject(api(`/v9/projects/${projects[role]}`), role, variables);

  const publicResponse = await fetch(`${url}/api/health`, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  if (![302, 401, 403].includes(publicResponse.status)) throw new Error('Deployment did not reject unauthenticated public access.');
  const health = JSON.parse(command('vercel', ['curl', `${url}/api/health`, '--scope', scope, '--', '--silent', '--show-error', '--fail-with-body'], stage));
  if (health.ready !== true) throw new Error('Protected backend readiness failed.');
  const privateResponse = command('vercel', ['curl', `${url}/api/admin/dashboard-stats`, '--scope', scope, '--', '--silent', '--show-error', '--write-out', '\n%{http_code}'], stage);
  const statusStart = privateResponse.lastIndexOf('\n');
  const privateRoute = JSON.parse(privateResponse.slice(0, statusStart));
  if (privateResponse.slice(statusStart + 1) !== '401' || privateRoute.success !== false || privateRoute.message !== 'Authentication required') throw new Error('Anonymous application authorization check failed.');
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `url=${url}\n`);
  const summary = `### Protected ${role} backend\n\nCommit: \`${sha}\`\n\n[Open deployment](${url})\n\nREADY; health passed; Vercel protection and application authentication checked.\n\n${role === 'test' ? 'Check this test deployment before approving the production job.' : 'Production candidate only: no alias promotion, endpoint change, migration, or data sync was performed.'}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(`Protected ${role} deployment verified: ${url}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
