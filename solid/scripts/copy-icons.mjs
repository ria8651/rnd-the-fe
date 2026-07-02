// Snapshot the spec's custom SVG icon set into src/icons/svg.
// The icons are the authoritative assets (spec/ui-standards/icons); re-run
// this if the upstream set changes. `node scripts/copy-icons.mjs`.
import { cp, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'spec', 'ui-standards', 'icons');
const dst = join(here, '..', 'src', 'icons', 'svg');

const files = (await readdir(src)).filter((f) => f.endsWith('.svg'));
for (const f of files) await cp(join(src, f), join(dst, f));
await cp(join(src, '_manifest.json'), join(here, '..', 'src', 'icons', 'manifest.json'));
console.log(`Copied ${files.length} icons.`);
