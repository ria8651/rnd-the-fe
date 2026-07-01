/**
 * Snapshots the icon assets from the spec (../spec/ui-standards/icons) into the app
 * (src/icons/svg). The spec is the source of truth for the glyph set; run `pnpm icons`
 * to re-sync after the spec's icon set changes. Icons use `currentColor`, so they theme
 * automatically from the surrounding text colour (spec ui-standards/icons.md).
 */
import { readdirSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../spec/ui-standards/icons');
const dest = resolve(here, '../src/icons/svg');

mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith('.svg'));
for (const f of files) copyFileSync(join(src, f), join(dest, f));
copyFileSync(join(src, '_manifest.json'), resolve(here, '../src/icons/_manifest.json'));
console.log(`Copied ${files.length} icons → ${dest}`);
