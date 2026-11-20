import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const required = [
  '.gitignore', '.env.example', 'package.json', 'package-lock.json',
  'next.config.mjs', 'README.md', 'app/layout.js', 'app/page.js',
  'components/AuthHeader.js', 'components/Icon.js', 'components/ImportSheet.js',
  'lib/db.js', 'lib/security.js', 'lib/organizer-auth.js', 'lib/member-auth.js',
  'sql/schema.sql', 'sql/migrate_organizer_mobile_login.sql',
  'sql/fix_service_role_permissions.sql', 'sql/setup_initial_organizer.sql',
  'test/security.test.mjs', 'public/fonts/OFL.txt',
];

// Check exact spelling as well as existence, even when running on Windows.
function existsExact(file) {
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()
      || !fs.readdirSync(current).includes(part)) return false;
    current = path.join(current, part);
  }
  return fs.existsSync(current);
}

for (const file of required) {
  if (!existsExact(path.join(root, file))) errors.push(`Missing file or incorrect filename case: ${file}`);
}

if (fs.existsSync(path.join(root, 'package.json')) && fs.existsSync(path.join(root, 'package-lock.json'))) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'engines']) {
    const entries = value => JSON.stringify(Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b)));
    if (entries(manifest[field]) !== entries(lock.packages?.['']?.[field])) {
      errors.push(`package-lock.json does not match package.json: ${field}`);
    }
  }
}

let filesChecked = 0;
function walk(dir) {
  if (!fs.existsSync(dir)) { errors.push(`Missing source directory: ${path.relative(root, dir)}`); return; }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!/\.(?:[cm]?js|css)$/.test(file)) continue;
    filesChecked++;
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)) {
      if (!match[1].startsWith('.')) continue;
      const target = path.resolve(path.dirname(file), match[1]);
      if (!['', '.js', '.mjs', '.css', '/index.js'].some(suffix => existsExact(target + suffix))) {
        errors.push(`Unresolved import in ${path.relative(root, file)}: ${match[1]}`);
      }
    }
    if (file.endsWith('.css')) {
      for (const match of source.matchAll(/url\(\s*['"]?(\/[^\s)'"?#]+)/g)) {
        if (!existsExact(path.join(root, 'public', match[1]))) {
          errors.push(`Missing public asset in ${path.relative(root, file)}: ${match[1]}`);
        }
      }
    }
  }
}
for (const dir of ['app', 'components', 'lib']) walk(path.join(root, dir));

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Production file check passed (${filesChecked} source files).`);
  console.log('Required files, relative imports, filename case, CSS assets and lockfile match.');
}
