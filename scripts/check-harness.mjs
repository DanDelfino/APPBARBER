import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const harnessPath = resolve(process.cwd(), 'docs', 'HARNESS-BARBER.md');
const content = readFileSync(harnessPath, 'utf8');

const requiredHarnesses = [
  'H017',
  'H018',
  'H019',
  'H020',
  'H021',
  'H022',
  'H023',
  'H024',
  'H025',
  'H026',
  'H027',
  'H028',
];

const missing = requiredHarnesses.filter((item) => !content.includes(item));

if (missing.length > 0) {
  console.error(`Harness incompleto. Itens faltando: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Harness OK: ${requiredHarnesses.length} cenarios encontrados em docs/HARNESS-BARBER.md`);
