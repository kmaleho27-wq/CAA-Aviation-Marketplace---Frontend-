// Convert every .md in docs/ to a paired .docx via pandoc.
// Run: npm run docx
//
// Output goes to docs/word/ — keep filenames mirroring the source so
// it's obvious which markdown each .docx came from. The folder is
// .gitignored so we don't bloat the repo with binary diffs every
// time a doc changes.

import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = resolve(__dirname, '../docs');
const OUT_DIR = resolve(DOCS_DIR, 'word');

// Pandoc path — winget on Windows installs to %LOCALAPPDATA%\Pandoc.
// Falls back to PATH if found there. Override with PANDOC_BIN env var.
const PANDOC = process.env.PANDOC_BIN
  || process.env.LOCALAPPDATA && resolve(process.env.LOCALAPPDATA, 'Pandoc', 'pandoc.exe')
  || 'pandoc';

// Recursively walk docs/, skipping the word/ output folder + binary files.
function* walk(dir, exclude = []) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (exclude.includes(full)) continue;
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full, exclude);
    else yield full;
  }
}

mkdirSync(OUT_DIR, { recursive: true });

let converted = 0, skipped = 0, failed = 0;
for (const src of walk(DOCS_DIR, [OUT_DIR])) {
  if (!src.endsWith('.md')) { skipped++; continue; }

  // Mirror the relative path under docs/word, but flatten subdirs into
  // filename prefixes so it's a single browsable folder.
  const rel = relative(DOCS_DIR, src);
  const flatName = rel.replace(/[\\/]/g, '__').replace(/\.md$/, '.docx');
  const out = resolve(OUT_DIR, flatName);

  try {
    execFileSync(PANDOC, [
      src,
      '-o', out,
      '--from', 'gfm',           // GitHub-flavoured Markdown — handles tables
      '--to', 'docx',
      '--reference-doc', resolve(__dirname, 'pandoc-reference.docx'),
    ].filter(Boolean), { stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(`✓ ${rel}  →  word/${flatName}`);
    converted++;
  } catch (e) {
    // Retry without reference doc if it doesn't exist (first run)
    if (e.message.includes('reference-doc') || !existsSync(resolve(__dirname, 'pandoc-reference.docx'))) {
      try {
        execFileSync(PANDOC, [src, '-o', out, '--from', 'gfm', '--to', 'docx'], { stdio: ['ignore', 'pipe', 'pipe'] });
        console.log(`✓ ${rel}  →  word/${flatName}`);
        converted++;
        continue;
      } catch (e2) {
        console.log(`✗ ${rel}  —  ${e2.message.split('\n')[0]}`);
        failed++;
        continue;
      }
    }
    console.log(`✗ ${rel}  —  ${e.message.split('\n')[0]}`);
    failed++;
  }
}

console.log(`\n${converted} converted · ${failed} failed · ${skipped} non-md skipped`);
console.log(`Output: ${OUT_DIR}`);
