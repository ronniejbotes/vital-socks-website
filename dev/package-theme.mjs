/**
 * Builds dist/vital-socks-theme.zip: only the theme folders Shopify accepts,
 * ready for Online Store > Themes > Add theme > Upload zip file.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folders = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];
const out = path.join(root, 'dist', 'vital-socks-theme.zip');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });
execFileSync('zip', ['-r', '-q', '-X', out, ...folders, '-x', '*.DS_Store'], { cwd: root, stdio: 'inherit' });
const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`Built ${path.relative(root, out)} (${kb} KB)`);
