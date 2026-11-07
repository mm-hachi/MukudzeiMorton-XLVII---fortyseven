import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parse = async (name) => JSON.parse(await readFile(path.join(root, 'data', name), 'utf8'));
const work = await parse('work.json');
const resources = await parse('resources.json');
const terms = [...work.items, ...resources.items]
  .filter((item) => item.status !== 'Published')
  .flatMap((item) => [item.id, item.slug, item.title, item.image])
  .filter((value) => typeof value === 'string' && value.length > 2);
const collectDrafts = async (directory) => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectDrafts(full);
    else if (entry.name.endsWith('.json')) {
      const value = JSON.parse(await readFile(full, 'utf8'));
      const records = Array.isArray(value.items) ? value.items : [value];
      for (const record of records.filter((item) => item.status !== 'Published')) {
        for (const term of [record.id, record.slug, record.title, record.image]) {
          if (typeof term === 'string' && term.length > 2) terms.push(term);
        }
      }
    }
  }
};
await collectDrafts(path.join(root, 'drafts', 'data'));
const scan = async (directory, output = []) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const relative = path.relative(root, full);
    if (entry.isDirectory()) {
      if (!['scripts', 'src', 'drafts', 'node_modules'].includes(entry.name)) await scan(full, output);
    } else if (/\.(?:html|xml|json|txt|svg|js|css)$/.test(entry.name)) {
      output.push({ relative, text: await readFile(full, 'utf8') });
    }
  }
  return output;
};
const outputs = await scan(root);
const leaks = [];
for (const output of outputs) {
  for (const term of terms) {
    if (output.relative.toLowerCase().includes(term.toLowerCase()) ||
      output.text.toLowerCase().includes(term.toLowerCase())) leaks.push(`${output.relative} contains "${term}"`);
  }
}
if (leaks.length) {
  console.error(`FAIL: hidden content appeared in public output:\n${leaks.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Leak check passed across ${outputs.length} public output files.`);
}
