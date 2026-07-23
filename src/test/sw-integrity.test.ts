import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Plain-text assertions against the service worker source and the CSP meta
 * tag it must stay consistent with (ADR 0004/WS-B). No browser/SW runtime
 * involved - these are regression guards against reintroducing the exact
 * problems that motivated the self-hosting/update-flow/cache-versioning work,
 * not a functional test of the service worker itself.
 */
const swSource = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf-8');
const registerSwSource = readFileSync(join(process.cwd(), 'public/register-sw.js'), 'utf-8');
const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');

/**
 * Finds the brace-matched body starting at the first `{` at or after
 * `openBraceSearchFrom`, tracking nesting depth so an inner block's own `}`
 * can't be mistaken for the end. A lazy `([\s\S]*?)\}` regex looks equivalent
 * for today's simple bodies but silently truncates at the first nested `}`
 * if one is ever added - this doesn't.
 */
function extractBalancedBody(source: string, openBraceSearchFrom: number) {
  const openIndex = source.indexOf('{', openBraceSearchFrom);
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0)
        return { start: openIndex + 1, end: i, body: source.slice(openIndex + 1, i) };
    }
  }
  throw new Error('Unbalanced braces while extracting body');
}

describe('service worker integrity', () => {
  it('never loads Workbox (or anything else) from a remote host', () => {
    const importScriptsCalls = [...swSource.matchAll(/importScripts\(([^)]*)\)/g)];
    expect(importScriptsCalls.length).toBeGreaterThan(0);
    for (const call of importScriptsCalls) {
      expect(call[1]).not.toMatch(/https?:\/\//);
    }
  });

  it('never calls skipWaiting() unconditionally', () => {
    // Structural containment, not raw string-offset ordering: a prior version
    // of this assertion only checked that *some* addEventListener('message'
    // and *some* if ( occurred earlier in the file, in that order - which a
    // second, genuinely-unconditional self.skipWaiting() added anywhere later
    // in the file (e.g. back at top-level in an install handler) would still
    // satisfy, since the legitimate gated call is always present earlier.
    // extractBalancedBody actually finds each message-listener callback's own
    // brace-matched body, so a stray call outside every such body fails.
    const messageListenerSites = [...swSource.matchAll(/addEventListener\('message',/g)];
    expect(messageListenerSites.length).toBeGreaterThan(0);
    const messageListenerBodies = messageListenerSites.map((site) =>
      extractBalancedBody(swSource, site.index! + site[0].length),
    );

    const skipWaitingCalls = [...swSource.matchAll(/self\.skipWaiting\(\)/g)];
    expect(skipWaitingCalls.length).toBeGreaterThan(0);
    for (const call of skipWaitingCalls) {
      const enclosingBody = messageListenerBodies.find(
        (b) => call.index! >= b.start && call.index! < b.end,
      );
      expect(enclosingBody).toBeDefined();
      // ...and still gated by an `if` within that same body, not fired as
      // soon as any message arrives regardless of type.
      expect(enclosingBody!.body).toMatch(/if\s*\(/);
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

  it('prunes stale runtime cache versions on activate using an exact-match helper, including the pre-versioning bare cache names', () => {
    const activateIndex = swSource.indexOf("addEventListener('activate'");
    expect(activateIndex).toBeGreaterThan(-1);
    const activateBlock = swSource.slice(activateIndex);
    expect(activateBlock).toMatch(/caches\.delete\(/);
    expect(activateBlock).toMatch(/isOwnedCacheName/);

    const helperNameIndex = swSource.indexOf('function isOwnedCacheName(');
    expect(helperNameIndex).toBeGreaterThan(-1);
    const helperBody = extractBalancedBody(swSource, helperNameIndex).body;
    // A cache name from before CACHE_VERSION existed at all (e.g. the bare
    // `pages-cache`, still sitting in any already-installed user's storage)
    // must also match.
    expect(helperBody).toMatch(/key === base/);
    // Anchored to a version suffix of digits only, not a bare `startsWith` -
    // `pages-cache-victim` (an unrelated cache sharing the same text prefix)
    // must NOT be treated as one of this SW's own stale versions.
    expect(helperBody).toMatch(/-v\[0-9\]\+\$/);
    expect(helperBody).toMatch(/\^\$\{/);
  });

  it('only caches real HTTP success responses, except the Google Fonts webfonts route which also intentionally allows opaque (status 0) ones', () => {
    // @font-face fetches can legitimately come back opaque in some browsers
    // even on success, unlike fetch()-driven navigation/API calls where
    // opaque only ever masks a real failure - see the comment in sw.js next
    // to this route's CacheableResponsePlugin.
    const routeBlocks = swSource.split('registerRoute(').slice(1);
    expect(routeBlocks.length).toBeGreaterThan(0);
    let sawWebfontsException = false;
    let sawPlainRoutes = 0;
    for (const block of routeBlocks) {
      const statusesMatch = block.match(/statuses:\s*\[([^\]]*)\]/);
      if (!statusesMatch) continue; // route has no CacheableResponsePlugin at all
      const statuses = statusesMatch[1].split(',').map((s) => s.trim());
      // Matches the exact quoted literal from sw.js, not a bare substring
      // (CodeQL js/incomplete-url-substring-sanitization would otherwise
      // flag this the same way sw.js's own isHost() helper exists to avoid).
      const isWebfontsRoute = block
        .slice(0, statusesMatch.index)
        .includes("'https://fonts.gstatic.com'");
      if (isWebfontsRoute) {
        expect(statuses).toEqual(['0', '200']);
        sawWebfontsException = true;
      } else {
        expect(statuses).toEqual(['200']);
        sawPlainRoutes += 1;
      }
    }
    expect(sawWebfontsException).toBe(true);
    expect(sawPlainRoutes).toBeGreaterThan(0);
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

/**
 * Actually executes register-sw.js against mocked browser APIs, rather than
 * inspecting its source text - a text-based check that a variable name is
 * merely *referenced* inside the controllerchange handler (an earlier version
 * of this file did that) still passes for a handler with inverted or
 * otherwise broken logic. This exercises the real control flow: controller
 * changes also fire on a page's very first, uncontrolled -> controlled
 * transition (clientsClaim() taking over a page with no prior service
 * worker), not only on a genuine version swap - reloading unconditionally
 * there breaks every fresh page load (confirmed live: an earlier version did
 * exactly that and broke two real Playwright E2E tests).
 */
describe('register-sw.js runtime behavior', () => {
  function createFakeRegistration() {
    const listeners: Record<string, Array<() => void>> = {};
    return {
      waiting: null as { postMessage: (msg: unknown) => void } | null,
      installing: null,
      addEventListener(event: string, cb: () => void) {
        (listeners[event] ??= []).push(cb);
      },
      _fire(event: string) {
        for (const cb of listeners[event] ?? []) cb();
      },
    };
  }

  async function loadRegisterSw(options: { hadControllerAtLoad?: boolean } = {}) {
    const registration = createFakeRegistration();
    const swListeners: Record<string, Array<() => void>> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn(() => Promise.resolve(registration)),
        addEventListener(event: string, cb: () => void) {
          (swListeners[event] ??= []).push(cb);
        },
        // register-sw.js reads this synchronously inside its "load" handler,
        // before register() resolves, to snapshot whether this tab already
        // had a controller BEFORE any update - the condition that decides
        // whether a later controllerchange should reload this tab.
        controller: options.hadControllerAtLoad ? {} : null,
      },
      configurable: true,
    });
    const reloadSpy = vi.fn();
    // jsdom's location.reload isn't spy-able directly (non-configurable) -
    // replace the whole window.location property instead, same pattern as
    // ErrorBoundary.test.tsx's "Reload Page" test.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    // window persists across tests (and across two loadRegisterSw() calls
    // simulating two tabs within the SAME test - see the multi-tab test
    // below) - only reset per file, not per test/call. A "load" listener
    // registered here would still be attached afterward and re-fire against
    // a LATER call's fresh mocks on any subsequent window.dispatchEvent(new
    // Event('load')), unless removed once this call's test ends. Capture
    // every listener this run adds to window so it can be, and - for "load"
    // specifically - never really attach it at all (invoked directly below
    // instead), so a second loadRegisterSw() call in the same test can't
    // trigger the first call's stale "load" handler as a side effect of
    // dispatching its own. Real attachment is kept for everything else (e.g.
    // "sw-request-reload") - multiple tabs' listeners for that coexisting and
    // all reacting to one dispatch is the actually-desired multi-tab shape.
    const addedToWindow: Array<[string, EventListener]> = [];
    const realAddEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      addedToWindow.push([type, listener as EventListener]);
      if (type !== 'load') realAddEventListener(type, listener as EventListener, options);
    });

    // register-sw.js is a plain browser IIFE (no module system) referencing
    // navigator/window/location as bare globals - new Function(...) runs its
    // text against this test's real globals, giving each call its own fresh
    // closure over the script's `reloaded`/`hadControllerAtLoad` vars.
    new Function(registerSwSource)();
    const loadListener = addedToWindow.find(([type]) => type === 'load')?.[1];
    if (!loadListener) throw new Error('register-sw.js did not add a "load" listener');
    loadListener(new Event('load'));
    // Let register()'s .then()/.catch() microtasks settle before returning.
    await Promise.resolve();
    await Promise.resolve();

    return {
      registration,
      fireControllerChange: () => {
        for (const cb of swListeners.controllerchange ?? []) cb();
      },
      reloadSpy,
      cleanup: () => {
        for (const [type, listener] of addedToWindow) window.removeEventListener(type, listener);
      },
    };
  }

  let cleanupCurrent: (() => void) | null = null;

  afterEach(() => {
    cleanupCurrent?.();
    cleanupCurrent = null;
    // @ts-expect-error - test-only cleanup of a property jsdom doesn't define by default
    delete navigator.serviceWorker;
    vi.restoreAllMocks();
  });

  it('does not reload on the first controllerchange when this tab had no controller at load (first-ever activation, nothing to hand off from)', async () => {
    const { fireControllerChange, reloadSpy, cleanup } = await loadRegisterSw({
      hadControllerAtLoad: false,
    });
    cleanupCurrent = cleanup;
    fireControllerChange();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('does nothing on sw-request-reload if no worker is waiting (no throw, no reload)', async () => {
    const { fireControllerChange, reloadSpy, cleanup } = await loadRegisterSw();
    cleanupCurrent = cleanup;
    expect(() => window.dispatchEvent(new Event('sw-request-reload'))).not.toThrow();
    fireControllerChange();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('posts SKIP_WAITING on an explicit sw-request-reload when a worker is waiting', async () => {
    const { registration, cleanup } = await loadRegisterSw();
    cleanupCurrent = cleanup;
    const postMessage = vi.fn();
    registration.waiting = { postMessage };

    window.dispatchEvent(new Event('sw-request-reload'));
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('reloads a tab that already had a controller at load on its own controllerchange, then not again on a second one (de-duped)', async () => {
    const { fireControllerChange, reloadSpy, cleanup } = await loadRegisterSw({
      hadControllerAtLoad: true,
    });
    cleanupCurrent = cleanup;

    fireControllerChange();
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    // A further controllerchange (e.g. another tab's update propagating)
    // must not trigger a second reload of this same page.
    fireControllerChange();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('reloads a tab whose controllerchange fires only because ANOTHER tab requested the update - clientsClaim() fires controllerchange in every open, already-controlled tab, not only the one that clicked Reload', async () => {
    // Tab A: the tab that actually posts SKIP_WAITING.
    const tabA = await loadRegisterSw({ hadControllerAtLoad: true });
    // Tab B: a second, independent open tab that was ALSO already controlled
    // at its own load - same precondition as tab A - but never itself
    // dispatches sw-request-reload. In a real browser both tabs' controllers
    // change together once the new worker activates.
    const tabB = await loadRegisterSw({ hadControllerAtLoad: true });
    cleanupCurrent = () => {
      tabA.cleanup();
      tabB.cleanup();
    };

    tabA.registration.waiting = { postMessage: vi.fn() };
    // Only tab A's own registration has a waiting worker, so only tab A's
    // handler actually posts SKIP_WAITING here - tab B's is a no-op (its own
    // registration.waiting is still null) - but reload-worthiness must not
    // depend on that at all.
    window.dispatchEvent(new Event('sw-request-reload'));

    tabB.fireControllerChange();
    expect(tabB.reloadSpy).toHaveBeenCalledTimes(1);
  });
});
