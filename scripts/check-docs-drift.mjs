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

/** @param {string} text @param {RegExp} pattern */
function assertMatch(text, pattern, message, errors) {
  if (!pattern.test(text)) errors.push(message);
}

/** @param {string} text @param {RegExp} pattern */
function assertNoMatch(text, pattern, message, errors) {
  if (pattern.test(text)) errors.push(message);
}

async function main() {
  const pkg = JSON.parse(await read('package.json'));
  const agents = await read('AGENTS.md');
  const claude = await read('CLAUDE.md');
  const indexMdc = await read('.cursor/index.mdc');
  const security = await read('SECURITY.md');

  const viteMajor = majorOf(pkg.devDependencies?.vite ?? pkg.dependencies?.vite);
  const pnpmVersion = String(pkg.packageManager ?? '').replace(/^pnpm@/, '');
  const appVersion = pkg.version;

  const errors = [];

  assertMatch(agents, new RegExp(`v${appVersion.replace(/\./g, '\\.')}`), `AGENTS.md must mention app version v${appVersion}`, errors);
  assertMatch(agents, new RegExp(`Vite ${viteMajor}\\b`), `AGENTS.md must reference Vite ${viteMajor} (package.json has vite@${pkg.devDependencies?.vite})`, errors);
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

  if (errors.length > 0) {
    console.error('check-docs-drift FAILED:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(
    `check-docs-drift OK (v${appVersion}, Vite ${viteMajor}, pnpm ${pnpmVersion || 'n/a'}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
