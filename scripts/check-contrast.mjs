#!/usr/bin/env node
/**
 * Fails CI if any of this repo's three themes' CSS custom properties (in
 * src/index.css) fall below WCAG 2.2 AA contrast: 4.5:1 for text (SC 1.4.3),
 * 3:1 for UI-component/graphical-object boundaries and large text (SC
 * 1.4.11), computed against every background a token's real consumers
 * actually render on (translucent colors are alpha-composited first) - both
 * the page background and the (opaque-flattened) surface color, since e.g.
 * the semantic *-muted badge backgrounds appear both on plain page
 * background (OfflineBanner/DemoDataBanner/UpdateAvailableBanner) and on
 * surface cards. Also asserts FOUC parity: index.html's inline <style>
 * "bootstrap" duplicates a subset of these same tokens, in both the
 * per-theme color blocks AND the shared classless `:root {}` block (fonts,
 * radii, etc.) - so the page paints correctly before the real stylesheet
 * loads - and must never silently drift from src/index.css.
 *
 * Deliberately not a full CSS parser (same proportionality as the other
 * check-*.mjs scripts): tailored regexes against this file's known,
 * hand-authored theme-block shapes, not an arbitrary-CSS tool.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cssPath = resolve(process.cwd(), 'src/index.css');
const htmlPath = resolve(process.cwd(), 'index.html');
// Strip /* ... */ comments before any parsing below - several of this
// file's own comments mention CSS custom property names followed by a
// colon (e.g. "--color-input-bg: verified ..."), which a naive
// declaration regex would otherwise misparse as a real (fake) declaration,
// swallowing the actual next real declaration as its "value" up to that
// declaration's own terminating semicolon.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');
const cssSource = stripComments(readFileSync(cssPath, 'utf-8'));
const htmlSource = stripComments(readFileSync(htmlPath, 'utf-8'));

const problems = [];

// ---------------------------------------------------------------------------
// Color math: relative luminance / contrast ratio, with alpha compositing.
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function parseColor(str) {
  str = str.trim();
  if (str.startsWith('#')) return { rgb: hexToRgb(str), a: 1 };
  // color-mix(in srgb, <color> X%, transparent) - the only color-mix() shape
  // this repo's checked tokens use - is equivalent to <color> at X% alpha.
  const mixMatch = str.match(/^color-mix\(in srgb,\s*(#[0-9a-f]+)\s+(\d+(?:\.\d+)?)%,\s*transparent\)$/i);
  if (mixMatch) {
    const { rgb } = parseColor(mixMatch[1]);
    return { rgb, a: parseFloat(mixMatch[2]) / 100 };
  }
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`Unparsable color: "${str}"`);
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  return { rgb: [parts[0], parts[1], parts[2]], a: parts.length > 3 ? parts[3] : 1 };
}

/** Composites `fgStr` (possibly translucent) over the opaque `bgStr`, returning an opaque rgb() string. */
function flattenOver(fgStr, bgStr) {
  const fg = parseColor(fgStr);
  if (fg.a >= 1) return fgStr;
  const bg = parseColor(bgStr);
  const rgb = fg.rgb.map((c, i) => c * fg.a + bg.rgb[i] * (1 - fg.a));
  return `rgb(${rgb.map((v) => Math.round(v)).join(',')})`;
}

function relLuminance([r, g, b]) {
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [r, g, b].map(toLinear);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(fgStr, bgStr) {
  const bg = parseColor(bgStr);
  const fgFlat = parseColor(flattenOver(fgStr, bgStr));
  const l1 = relLuminance(fgFlat.rgb);
  const l2 = relLuminance(bg.rgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function requireRatio(theme, label, fgStr, bgStr, minRatio) {
  const r = contrastRatio(fgStr, bgStr);
  if (r < minRatio) {
    problems.push(
      `[${theme}] ${label}: ${r.toFixed(2)}:1, needs >= ${minRatio}:1 (${fgStr} on ${bgStr})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Parse src/index.css's three theme blocks (+ the shared :root defaults).
// ---------------------------------------------------------------------------

function parseVarBlock(blockText) {
  const vars = new Map();
  for (const m of blockText.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    vars.set(m[1], m[2].trim());
  }
  return vars;
}

function extractBlock(source, selectorPattern) {
  const re = new RegExp(selectorPattern + '\\s*\\{([^}]*)\\}', 's');
  const m = source.match(re);
  if (!m) throw new Error(`check-contrast: couldn't find selector block: ${selectorPattern}`);
  return parseVarBlock(m[1]);
}

const sharedVars = extractBlock(cssSource, ':root(?![.\\w])');
const cssThemeSelectors = {
  'ink-dark': ':root\\.dark',
  'paper-light': ':root\\.light',
  'matrix-green': ':root\\.matrix',
};

/** Resolves a var() reference against a theme's merged (shared + theme) var map, one level deep - enough for this file's tokens, none of which chain more than one var() indirection in a color value. */
function resolveVar(value, vars) {
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => vars.get(name) ?? '');
}

const cssThemes = {};
for (const [themeName, selector] of Object.entries(cssThemeSelectors)) {
  const themeVars = extractBlock(cssSource, selector);
  const merged = new Map([...sharedVars, ...themeVars]);
  cssThemes[themeName] = merged;
}

// ---------------------------------------------------------------------------
// Contrast checks.
// ---------------------------------------------------------------------------

for (const [themeName, vars] of Object.entries(cssThemes)) {
  const background = vars.get('--color-background');
  const surface = flattenOver(vars.get('--color-surface'), background);
  const textPrimary = vars.get('--color-text-primary');
  const textSecondary = vars.get('--color-text-secondary');
  const border = vars.get('--color-border');
  const brandAccent = vars.get('--color-brand-accent');
  const inputBg = flattenOver(vars.get('--color-input-bg'), surface);
  const textPlaceholder = resolveVar(vars.get('--color-text-placeholder'), vars);

  requireRatio(themeName, 'text-primary vs background', textPrimary, background, 4.5);
  requireRatio(themeName, 'text-primary vs surface', textPrimary, surface, 4.5);
  requireRatio(themeName, 'text-secondary vs background', textSecondary, background, 4.5);
  requireRatio(themeName, 'text-secondary vs surface', textSecondary, surface, 4.5);
  // WCAG SC 1.4.3 applies the full 4.5:1 text-contrast minimum to
  // placeholder text too - there's no blanket exception for it.
  requireRatio(themeName, 'text-placeholder vs input-bg', textPlaceholder, inputBg, 4.5);
  requireRatio(themeName, 'border vs background (non-text UI component)', border, background, 3.0);
  requireRatio(themeName, 'border vs surface (non-text UI component)', border, surface, 3.0);
  // The two-layer focus ring's outer ring is fully opaque brand-accent
  // (see src/index.css's --focus-ring comment for why) - a solid color
  // needs no alpha-compositing step, so this is the same check as any
  // other opaque UI-component color against its surroundings.
  requireRatio(themeName, 'focus ring (opaque brand-accent) vs background', brandAccent, background, 3.0);
  requireRatio(themeName, 'focus ring (opaque brand-accent) vs surface', brandAccent, surface, 3.0);

  for (const semantic of ['danger', 'success', 'warning', 'info']) {
    const fg = vars.get(`--color-${semantic}`);
    const mutedRaw = vars.get(`--color-${semantic}-muted`);
    const resolvedMuted = resolveVar(mutedRaw, vars);
    // Real consumers of these tokens don't all sit on the same parent:
    // .banner-warning/.banner-info (OfflineBanner/DemoDataBanner/
    // UpdateAvailableBanner) render directly on the page background, while
    // badge/chip usages sit on a surface card - check both.
    const mutedBgOnSurface = flattenOver(resolvedMuted, surface);
    const mutedBgOnBackground = flattenOver(resolvedMuted, background);
    requireRatio(
      themeName,
      `${semantic} text vs its own muted background (on a surface card)`,
      fg,
      mutedBgOnSurface,
      4.5,
    );
    requireRatio(
      themeName,
      `${semantic} text vs its own muted background (directly on page background, e.g. banner-warning/banner-info)`,
      fg,
      mutedBgOnBackground,
      4.5,
    );
  }
}

// ---------------------------------------------------------------------------
// FOUC-parity: index.html's bootstrap <style> must match src/index.css for
// every property both declare - it's an intentional subset, never a fork.
// ---------------------------------------------------------------------------

const htmlThemeSelectors = {
  'ink-dark': ':root,\\s*:root\\.dark',
  'paper-light': ':root\\.light',
  'matrix-green': ':root\\.matrix',
};

for (const [themeName, selector] of Object.entries(htmlThemeSelectors)) {
  let htmlVars;
  try {
    htmlVars = extractBlock(htmlSource, selector);
  } catch {
    problems.push(`[${themeName}] FOUC parity: index.html has no matching bootstrap block for "${selector}"`);
    continue;
  }
  const cssVars = cssThemes[themeName];
  for (const [name, htmlValue] of htmlVars) {
    const cssValue = cssVars.get(name);
    if (cssValue === undefined) continue; // shared/base-only tokens are fine to skip
    if (cssValue !== htmlValue) {
      problems.push(
        `[${themeName}] FOUC parity: ${name} is "${htmlValue}" in index.html's bootstrap but "${cssValue}" in src/index.css`,
      );
    }
  }
}

// The shared, classless `:root {}` block (fonts, --radius-*, etc. - anything
// NOT theme-specific) is also duplicated in index.html's bootstrap, but the
// per-theme loop above never walks it. Check it too, the same way.
let htmlSharedVars;
try {
  htmlSharedVars = extractBlock(htmlSource, ':root(?![.\\w])');
} catch {
  htmlSharedVars = new Map();
}
for (const [name, htmlValue] of htmlSharedVars) {
  const cssValue = sharedVars.get(name);
  if (cssValue === undefined) continue; // css-only tokens are fine to skip
  if (cssValue !== htmlValue) {
    problems.push(
      `[shared :root] FOUC parity: ${name} is "${htmlValue}" in index.html's bootstrap but "${cssValue}" in src/index.css`,
    );
  }
}

if (problems.length > 0) {
  console.error('check-contrast: WCAG 2.2 AA contrast/FOUC-parity failures:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
} else {
  console.log('check-contrast: all themes clear WCAG 2.2 AA contrast; index.html FOUC bootstrap in sync — OK');
}
