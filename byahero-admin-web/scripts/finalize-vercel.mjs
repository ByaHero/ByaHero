import { lstat, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const output = fileURLToPath(new URL('../dist/', import.meta.url));
const html = await readFile(path.join(output, 'index.html'), 'utf8');
const entry = html.match(/<script[^>]+src="(\/assets\/[^"/]+\.js)"/)?.[1];
if (!entry) throw new Error('Vercel admin build must use root-relative assets.');
const favicon = html.match(/<link[^>]+rel="icon"[^>]+href="(\/assets\/[^"/]+\.svg)"/)?.[1];
if (!favicon || !(await lstat(path.join(output, favicon.slice(1)))).isFile()) {
  throw new Error('Admin favicon is missing from the uploaded source/build.');
}
const javascript = await readFile(path.join(output, entry.slice(1)), 'utf8');
if (javascript.includes('TEST ENVIRONMENT') || javascript.includes('https://byahero.alwaysdata.net/api')) {
  throw new Error('Refusing a test/legacy API admin build for production.');
}
for (const name of ['assets/images/uploads', 'storage']) {
  const stat = await lstat(path.join(output, name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (stat) throw new Error('Private uploads must be served by the API, not static admin output.');
}
for (const name of ['api-proxy.php', '.htaccess']) {
  const file = path.join(output, name);
  const stat = await lstat(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (stat && !stat.isFile()) throw new Error('Unexpected server-file type in admin output.');
  await rm(file, { force: true });
}
console.log('Verified Vercel admin build; Apache/PHP files excluded.');
