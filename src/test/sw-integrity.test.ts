import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Plain-text assertions against the service worker source and the CSP meta
 * tag it must stay consistent with (ADR 0011/WS-B). No browser/SW runtime
 * involved - these are regression guards against reintroducing the exact
 * problems that motivated the self-hosting/update-flow/cache-versioning work,
 * not a functional test of the service worker itself.
 */
const swSource = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf-8');
const registerSwSource = readFileSync(join(process.cwd(), 'public/register-sw.js'), 'utf-8');
const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');

describe('service worker integrity', () => {
  it('never loads Workbox (or anything else) from a remote host', () => {
    const importScriptsCalls = [...swSource.matchAll(/importScripts\(([^)]*)\)/g)];
    expect(importScriptsCalls.length).toBeGreaterThan(0);
    for (const call of importScriptsCalls) {
      expect(call[1]).not.toMatch(/https?:\/\//);
    }
  });

  it('never calls skipWaiting() unconditionally', () => {
    const skipWaitingCalls = [...swSource.matchAll(/self\.skipWaiting\(\)/g)];
    expect(skipWaitingCalls.length).toBeGreaterThan(0);
    // Every occurrence must sit inside a message-listener callback, gated by
    // an `if` immediately before it - not fired unconditionally at the top
    // level of the install/activate lifecycle.
    for (const call of skipWaitingCalls) {
      const before = swSource.slice(0, call.index);
      const lastMessageListener = before.lastIndexOf("addEventListener('message'");
      const lastIf = before.lastIndexOf('if (');
      expect(lastMessageListener).toBeGreaterThan(-1);
      expect(lastIf).toBeGreaterThan(lastMessageListener);
    }
  });

  it('versions every runtime cache name', () => {
    const cacheNamesBlock = swSource.match(/const CACHE_NAMES = \{([\s\S]*?)\};/);
    expect(cacheNamesBlock).not.toBeNull();
    const entries = [...cacheNamesBlock![1].matchAll(/:\s*`([^`]+)`/g)].map((m) => m[1]);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry).toMatch(/\$\{CACHE_VERSION\}$/);
    }
  });

  it('prunes stale runtime cache versions on activate', () => {
    expect(swSource).toMatch(/addEventListener\('activate'/);
    expect(swSource).toMatch(/caches\.delete\(/);
  });

  it('only caches real HTTP success responses, not opaque (status 0) ones', () => {
    const statusesBlocks = [...swSource.matchAll(/statuses:\s*\[([^\]]*)\]/g)];
    expect(statusesBlocks.length).toBeGreaterThan(0);
    for (const block of statusesBlocks) {
      const statuses = block[1].split(',').map((s) => s.trim());
      expect(statuses).toEqual(['200']);
    }
  });

  it('has a message listener that only reacts to SKIP_WAITING', () => {
    expect(swSource).toMatch(/addEventListener\('message'/);
    expect(swSource).toMatch(/SKIP_WAITING/);
  });

  it('registration script never logs registration success/failure to the console', () => {
    expect(registerSwSource).not.toMatch(/console\.(log|warn|error)\(/);
  });

  it('registration script dispatches an update-available event, not an unconditional reload', () => {
    expect(registerSwSource).toMatch(/sw-update-available/);
    expect(registerSwSource).toMatch(/postMessage|SKIP_WAITING|controllerchange/);
  });

  it('never reloads on every controllerchange - only one caused by an explicit user request', () => {
    // controllerchange also fires on a page's very first, uncontrolled ->
    // controlled transition (clientsClaim() taking over a page with no prior
    // service worker), not only on a genuine version swap. Reloading
    // unconditionally there causes an unwanted reload on every fresh page
    // load - confirmed live: an earlier version of this file did exactly
    // that and broke two real Playwright E2E tests whose page.evaluate()/
    // assertions raced the resulting reload. A de-dupe flag (e.g. `reloaded`)
    // alone does NOT fix this - it still fires once, unconditionally, on the
    // very first activation. There must be a SEPARATE flag that starts false
    // and is only set true by a handler for an explicit user-intent event
    // (e.g. "sw-request-reload" dispatched from the UI's reload button), and
    // the controllerchange handler's condition must reference that same flag.
    const requestListenerMatch = registerSwSource.match(
      /addEventListener\('sw-request-reload',\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\}\s*\);/,
    );
    expect(requestListenerMatch).not.toBeNull();
    const requestBody = requestListenerMatch![1];
    const flagAssignment = requestBody.match(/(\w+)\s*=\s*true/);
    expect(flagAssignment).not.toBeNull();
    const intentFlag = flagAssignment![1];

    const declaresIntentFlagFalseUpFront = new RegExp(`var\\s+${intentFlag}\\s*=\\s*false`).test(
      registerSwSource,
    );
    expect(declaresIntentFlagFalseUpFront).toBe(true);

    const controllerChangeMatch = registerSwSource.match(
      /addEventListener\('controllerchange',\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\}\s*\);/,
    );
    expect(controllerChangeMatch).not.toBeNull();
    expect(controllerChangeMatch![1]).toContain(intentFlag);
  });

  it('CSP worker-src is free of external hosts', () => {
    const cspMatch = indexHtml.match(/worker-src\s+([^;]+);/);
    expect(cspMatch).not.toBeNull();
    const sources = cspMatch![1].trim().split(/\s+/);
    for (const source of sources) {
      expect(source).not.toMatch(/^https?:\/\//);
    }
  });
});
