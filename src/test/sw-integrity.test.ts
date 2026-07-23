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

  it('CSP worker-src is free of external hosts', () => {
    const cspMatch = indexHtml.match(/worker-src\s+([^;]+);/);
    expect(cspMatch).not.toBeNull();
    const sources = cspMatch![1].trim().split(/\s+/);
    for (const source of sources) {
      expect(source).not.toMatch(/^https?:\/\//);
    }
  });
});
