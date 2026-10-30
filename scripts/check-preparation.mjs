import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { routes } from '../src/config/routes.ts';
import { modules, assertModuleEnabled } from '../src/config/modules.ts';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root));
assert.equal(routes.artwork('books', 'wild-wonders'), '/art/books/wild-wonders');
assert.equal(routes.crewMember('wild-wonders'), '/crew/wild-wonders');
assert.equal(routes.message('one-message'), '/meaningful-messages#one-message');
for (const slug of ['', '.', '..', 'a/b', 'a?b', 'a#b', 'a\\b']) assert.throws(() => routes.post(slug));
for (const [key, enabled] of Object.entries(modules)) {
  if (enabled) assert.doesNotThrow(() => assertModuleEnabled(key));
  else assert.throws(() => assertModuleEnabled(key));
}
const manifest = JSON.parse(await read('docs/encounters/design-manifest.json'));
assert.equal(Object.keys(manifest.files).length, 61);
for (const [path, hash] of Object.entries(manifest.files)) {
  assert.equal(createHash('sha256').update(await read(`docs/encounters/handoff-current/${path}`)).digest('hex'), hash, path);
}
const checklist = (await read('docs/encounters/encounters-checklist-seguimiento.md')).toString();
assert.deepEqual([...checklist.matchAll(/^- \[[ x]\] \*\*(\d+)\./gm)].map((m) => Number(m[1])), Array.from({length:22},(_,i)=>i+1));
console.log('PASS: route constructors, module policy, 61 design hashes and 22 checklist points.');
console.log('Run check-isolation.mjs with TEST_BASE_URL for local HTTP verification. External services/SQL are outside this check.');
