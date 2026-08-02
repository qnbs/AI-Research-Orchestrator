#!/usr/bin/env node
/**
 * Docs/config drift gate — keeps always-on agent instructions aligned with package.json.
 * Canonical runtime facts live in package.json; agent docs must not contradict them.
 */
import { readFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url).pathname;

async function read(relPath) {
  return readFile(`${ROOT}/${relPath}`, 'utf8');
}

function majorOf(version) {
  const match = /^(\d+)/.exec(version ?? '');
  return match ? match[1] : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} text @param {RegExp} pattern */
function assertMatch(text, pattern, message, errors) {
  if (!pattern.test(text)) errors.push(message);
}

/** @param {string} text @param {RegExp} pattern */
function assertNoMatch(text, pattern, message, errors) {
  if (pattern.test(text)) errors.push(message);
}

function extractConnectOrigins(html) {
  const match = /connect-src\s+([^;]+)/i.exec(html);
  if (!match) return [];
  return match[1]
    .split(/\s+/)
    .map((t) => t.replace(/'/g, ''))
    .filter((t) => t.startsWith('http'));
}

function extractPolicyOrigins(ts) {
  const block = /CSP_ALLOWED_ORIGINS\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(ts);
  if (!block) return [];
  const origins = [];
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(block[1])) !== null) {
    origins.push(m[1]);
  }
  return origins;
}

/** @param {string[]} errors */
async function checkCspEndpointDrift(errors) {
  const html = await read('index.html');
  const policy = await read('src/lib/endpointPolicy.ts');
  const htmlOrigins = new Set(extractConnectOrigins(html));
  const codeOrigins = new Set(extractPolicyOrigins(policy));

  for (const origin of codeOrigins) {
    if (!htmlOrigins.has(origin)) {
      errors.push(`index.html connect-src missing origin from endpointPolicy: ${origin}`);
    }
  }

  for (const origin of htmlOrigins) {
    if (!codeOrigins.has(origin)) {
      errors.push(`endpointPolicy CSP_ALLOWED_ORIGINS missing origin from index.html: ${origin}`);
    }
  }
}

async function main() {
  const pkg = JSON.parse(await read('package.json'));
  const agents = await read('AGENTS.md');
  const claude = await read('CLAUDE.md');
  const indexMdc = await read('.cursor/index.mdc');
  const security = await read('SECURITY.md');

  const viteSpec = pkg.devDependencies?.vite ?? pkg.dependencies?.vite;
  const viteMajor = majorOf(viteSpec);
  const pnpmVersion = String(pkg.packageManager ?? '').replace(/^pnpm@/, '');
  const appVersion = pkg.version;

  const errors = [];

  assertMatch(
    agents,
    new RegExp(`v${escapeRegExp(appVersion)}(?![0-9A-Za-z.+-])`),
    `AGENTS.md must mention app version v${appVersion}`,
    errors,
  );
  assertMatch(agents, new RegExp(`Vite ${viteMajor}\\b`), `AGENTS.md must reference Vite ${viteMajor} (package.json has vite@${viteSpec})`, errors);
  assertNoMatch(agents, /src\/services\/heuristics\//, 'AGENTS.md must not reference deleted src/services/heuristics/', errors);

  assertNoMatch(claude, /src\/services\/heuristics\//, 'CLAUDE.md must not reference deleted src/services/heuristics/', errors);
  assertMatch(claude, /src\/services\/nonAi\//, 'CLAUDE.md must reference consolidated src/services/nonAi/', errors);

  assertMatch(indexMdc, new RegExp(`Vite ${viteMajor}\\b`), `.cursor/index.mdc must reference Vite ${viteMajor}`, errors);
  assertNoMatch(indexMdc, /src\/services\/heuristics\//, '.cursor/index.mdc must not reference deleted heuristics path', errors);
  assertMatch(indexMdc, /src\/services\/nonAi\//, '.cursor/index.mdc must reference src/services/nonAi/', errors);

  assertMatch(security, /0\.4\.x/, 'SECURITY.md must list 0.4.x as supported', errors);

  if (pnpmVersion) {
    assertMatch(agents, new RegExp(`pnpm ${pnpmVersion.split('.')[0]}\\b`), `AGENTS.md should reference pnpm ${pnpmVersion.split('.')[0]}`, errors);
  }

  if (process.argv.includes('--csp-endpoint')) {
    await checkCspEndpointDrift(errors);
  }

  if (errors.length > 0) {
    const label = process.argv.includes('--csp-endpoint')
      ? 'check-csp-endpoint-drift'
      : 'check-docs-drift';
    console.error(`${label} FAILED:\n`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  if (process.argv.includes('--csp-endpoint')) {
    console.log('check-csp-endpoint-drift OK (connect-src aligned with endpointPolicy).');
    return;
  }

  console.log(
    `check-docs-drift OK (v${appVersion}, Vite ${viteMajor}, pnpm ${pnpmVersion || 'n/a'}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
