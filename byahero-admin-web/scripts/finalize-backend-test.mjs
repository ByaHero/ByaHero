import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const output = path.resolve(repository, 'laravel-backend/public/admin-test');
const html = await readFile(path.join(output, 'index.html'), 'utf8');
if (!html.includes('/admin-test/assets/')) throw new Error('Test build must use /admin-test/ asset paths.');
const entryUrl = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
if (!entryUrl?.startsWith('/admin-test/assets/')) throw new Error('Missing test JavaScript entry.');
const entry = path.basename(entryUrl);
const javascript = await readFile(path.join(output, 'assets', entry), 'utf8');
if (javascript.includes('https://byahero.alwaysdata.net') || !javascript.includes('TEST ENVIRONMENT')) {
  throw new Error('Refusing a test build that uses the live API or lacks its test banner.');
}

// The normal admin .htaccess assumes a root deployment. This build lives in a subdirectory.
await writeFile(path.join(output, '.htaccess'), `DirectoryIndex index.html
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /admin-test/
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /admin-test/index.html [L]
</IfModule>
`);
console.log('Verified test API isolation and configured /admin-test/ refresh routing.');
