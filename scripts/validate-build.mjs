import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const manifestPath = path.join(distDir, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  throw new Error('dist/manifest.json is missing');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requiredFiles = new Set([
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...Object.values(manifest.icons || {}),
  ...(manifest.content_scripts || []).flatMap((entry) => [
    ...(entry.js || []),
    ...(entry.css || []),
  ]),
]);

for (const relativePath of requiredFiles) {
  if (!relativePath) continue;
  if (!fs.existsSync(path.join(distDir, relativePath))) {
    throw new Error(`Manifest references missing build asset: ${relativePath}`);
  }
}

if ((manifest.permissions || []).includes('cookies')) {
  throw new Error('The production manifest must not request the cookies permission');
}

console.log(`Validated ${requiredFiles.size} manifest build assets and permissions.`);
