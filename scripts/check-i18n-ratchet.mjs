#!/usr/bin/env node
/**
 * i18n regression ratchet.
 *
 * Prevents hardcoded English strings from creeping back into files that have already
 * been fully migrated to t()/translateSync(). It does NOT lint the whole app — only the
 * files listed in MIGRATED_FILES are scanned, so this only guards against regressions,
 * not the (much larger) backlog of not-yet-migrated files. Every i18n migration wave
 * should append its newly-migrated files here as part of that wave's own PR.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Files fully migrated to t()/translateSync() — regressions here fail CI. */
const MIGRATED_FILES = [
  'src/components/CheckpointResumeBanner.tsx',
  'src/components/DemoDataBanner.tsx',
  'src/components/OfflineBanner.tsx',
  'src/components/InferenceModeBadge.tsx',
  'src/components/settings/ApiKeySettings.tsx',
  'src/components/journals/useJournalsViewLogic.ts',
  'src/components/OrchestratorView.tsx',
  'src/components/UpdateAvailableBanner.tsx',
];

const IGNORE_COMMENT = 'i18n-ratchet-ignore-next-line';

// Bare JSX text nodes: `>` then a run of capitalized-word prose then `<`.
const JSX_TEXT_RE = />\s*[A-Z][a-zA-Z']*(?:\s+[a-zA-Z''.,!?-]+){1,}\s*</g;
// Hardcoded chrome attributes assigned a bare string literal (not `{...}`, not calling t()).
const HARDCODED_ATTR_RE = /\b(aria-label|title|placeholder)="[^{][^"]*"/g;

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

function previousLine(content, lineNo) {
  const lines = content.split('\n');
  return lines[lineNo - 2] ?? '';
}

function scanFile(relPath, content) {
  const violations = [];
  for (const re of [JSX_TEXT_RE, HARDCODED_ATTR_RE]) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(content))) {
      const lineNo = lineNumberAt(content, match.index);
      if (previousLine(content, lineNo).includes(IGNORE_COMMENT)) continue;
      violations.push({ relPath, lineNo, snippet: match[0].trim().slice(0, 80) });
    }
  }
  return violations;
}

async function main() {
  const root = process.cwd();
  const allViolations = [];

  for (const relPath of MIGRATED_FILES) {
    const full = path.join(root, relPath);
    let content;
    try {
      content = await readFile(full, 'utf8');
    } catch {
      console.error(`i18n ratchet: listed file not found: ${relPath}`);
      process.exit(1);
    }
    allViolations.push(...scanFile(relPath, content));
  }

  if (allViolations.length) {
    console.error(`i18n ratchet FAILED — hardcoded string(s) found in migrated files:`);
    for (const v of allViolations) {
      console.error(`  - ${v.relPath}:${v.lineNo}: ${v.snippet}`);
    }
    console.error(
      `\nIf this is a genuine false positive, add "// ${IGNORE_COMMENT}" on the line above it.`,
    );
    process.exit(1);
  }

  console.log(`i18n ratchet OK (${MIGRATED_FILES.length} files clean).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
