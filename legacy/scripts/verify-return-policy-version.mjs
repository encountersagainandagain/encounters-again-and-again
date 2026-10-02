throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const policySource = await readFile(path.join(repoRoot, 'src/lib/ecommercePolicy.ts'), 'utf8');

function readConst(name) {
  const match = policySource.match(new RegExp(`export const ${name} =\\s*'([^']+)'`));
  if (!match) throw new Error(`Missing ${name} in src/lib/ecommercePolicy.ts`);
  return match[1];
}

const version = readConst('SHOP_RETURN_POLICY_VERSION');
const expectedHash = readConst('SHOP_RETURN_POLICY_CONTENT_SHA256');
const docsPath = path.join(repoRoot, 'docs/ecommerce-printful/policies', `${version}.md`);
const publicPath = path.join(repoRoot, 'public/shop-policies', `${version}.md`);

const [docsContent, publicContent] = await Promise.all([
  readFile(docsPath, 'utf8'),
  readFile(publicPath, 'utf8'),
]);

if (docsContent !== publicContent) {
  throw new Error(`Return policy archive mismatch for ${version}: docs and public copies differ.`);
}

const actualHash = createHash('sha256').update(docsContent).digest('hex');

if (actualHash !== expectedHash) {
  throw new Error(
    `Return policy ${version} hash mismatch. Expected ${expectedHash}, got ${actualHash}. If the policy text changed, create a new SHOP_RETURN_POLICY_VERSION.`
  );
}

console.log(`Return policy ${version} verified (${actualHash}).`);
