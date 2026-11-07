import { gzipSync } from 'zlib';
import { execFileSync } from 'child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  ['assets/site.js', 80 * 1024],
  ['assets/site.css', 40 * 1024]
];
const gzipSize = (contents) => {
  try {
    return gzipSync(contents).byteLength;
  } catch (error) {
    if (process.platform !== 'win32') throw error;
    const encoded = contents.toString('base64');
    const command = `$b=[Convert]::FromBase64String('${encoded}');$m=New-Object IO.MemoryStream;$g=New-Object IO.Compression.GZipStream($m,[IO.Compression.CompressionMode]::Compress);$g.Write($b,0,$b.Length);$g.Dispose();$m.Length`;
    return Number(execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8' }).trim());
  }
};
let failed = false;
for (const [file, limit] of files) {
  const contents = await readFile(path.join(root, file));
  const size = gzipSize(contents);
  console.log(`${file}: ${contents.byteLength} bytes, ${size} bytes gzipped (budget ${limit} bytes)`);
  if (size > limit) {
    console.error(`FAIL: ${file} exceeds its initial-load gzip budget.`);
    failed = true;
  }
}
const required = [
  'index.html', 'services/index.html', 'work/index.html',
  'work/dekara-designs-configurator/index.html', 'lab/index.html',
  'work/dekara-custom-studio/index.html', 'work/revit-furniture-family-set/index.html',
  'work/joinery-shop-drawing-set/index.html', 'work/ar-ready-model-pack/index.html',
  'resources/index.html', 'process/index.html', 'about/index.html',
  'contact/index.html', 'privacy/index.html', 'sitemap.xml',
  'robots.txt', 'assets/public-index.json'
];
for (const file of required) {
  try {
    await stat(path.join(root, file));
  } catch {
    console.error(`FAIL: required build output is missing: ${file}`);
    failed = true;
  }
}
const countHtml = async (directory) => {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && !['data', 'scripts', 'src'].includes(entry.name)) count += await countHtml(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) count += 1;
  }
  return count;
};
const pageCount = await countHtml(root);
console.log(`Static HTML pages: ${pageCount}`);
if (pageCount < 10) {
  console.error('FAIL: expected the public page set to be generated.');
  failed = true;
}
const projectRoot = path.resolve(root, '..');
const htmlFiles = [];
const collectHtml = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && !['data', 'scripts', 'src'].includes(entry.name)) await collectHtml(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
};
await collectHtml(root);
for (const file of htmlFiles) {
  const contents = await readFile(file, 'utf8');
  const attributes = [...contents.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) =>
    match[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'"));
  const relative = path.relative(root, file).replace(/\\/g, '/');
  for (const attribute of attributes) {
    if (/^(?:https?:|mailto:|tel:|#|data:|javascript:)/i.test(attribute)) continue;
    const targetUrl = new URL(attribute, `https://portfolio.test/portfolio/${relative}`);
    let target = path.resolve(projectRoot, decodeURIComponent(targetUrl.pathname.replace(/^\/+/, '')));
    if (!target.startsWith(projectRoot + path.sep)) {
      console.error(`FAIL: link escapes the project root: ${relative} -> ${attribute}`);
      failed = true;
      continue;
    }
    try {
      const info = await stat(target);
      if (info.isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
    } catch {
      if (!path.extname(target)) {
        try {
          await stat(path.join(target, 'index.html'));
          continue;
        } catch { }
      }
      console.error(`FAIL: missing local link or asset: ${relative} -> ${attribute}`);
      failed = true;
    }
  }
}
console.log(`Checked local links and assets in ${htmlFiles.length} pages.`);
if (failed) process.exitCode = 1;
