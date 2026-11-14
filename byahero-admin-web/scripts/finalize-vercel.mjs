import { lstat, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const output = fileURLToPath(new URL('../dist/', import.meta.url));
const html = await readFile(path.join(output, 'index.html'), 'utf8');
const entry = html.match(/<script[^>]+src="(\/assets\/[^"/]+\.js)"/)?.[1];
if (!entry) throw new Error('Vercel admin build must use root-relative assets.');
const javascript = await readFile(path.join(output, entry.slice(1)), 'utf8');
if (javascript.includes('TEST ENVIRONMENT') || javascript.includes('https://byahero.alwaysdata.net/api')) {
  throw new Error('Refusing a test/legacy API admin build for production.');
}
for (const name of ['api-proxy.php', '.htaccess']) {
  const file = path.join(output, name);
  const stat = await lstat(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (stat && !stat.isFile()) throw new Error('Unexpected server-file type in admin output.');
  await rm(file, { force: true });
}
console.log('Verified Vercel admin build; Apache/PHP files excluded.');
