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
    const messageListenerBodies = messageListenerSites
      .map((site) => {
        const idx = site.index;
        return idx !== undefined ? extractBalancedBody(swSource, idx + site[0].length) : undefined;
      })
      .filter((body): body is NonNullable<typeof body> => body !== undefined);

    const skipWaitingCalls = [...swSource.matchAll(/self\.skipWaiting\(\)/g)];
    expect(skipWaitingCalls.length).toBeGreaterThan(0);
    for (const call of skipWaitingCalls) {
      const idx = call.index;
      if (idx === undefined) {
        continue;
      }
      const enclosingBody = messageListenerBodies.find((b) => idx >= b.start && idx < b.end);
      expect(enclosingBody).toBeDefined();
      if (enclosingBody) {
        // ...and still gated by an `if` within that same body, not fired as
        // soon as any message arrives regardless of type.
        expect(enclosingBody.body).toMatch(/if\s*\(/);
      }
    }
  });

  it('never caches NCBI URLs with credential-like query parameters', () => {
    expect(swSource).toMatch(/urlHasCredentialQuery/);
    expect(swSource).toMatch(/new NetworkOnly\(\)/);
    expect(swSource).toMatch(/isNcbiHost\(url\.hostname\) && urlHasCredentialQuery\(url\)/);
    expect(swSource).toMatch(/isNcbiHost\(url\.hostname\) && !urlHasCredentialQuery\(url\)/);
  });

  it('purges legacy credential-bearing PubMed cache entries on activate', () => {
    const activateIndex = swSource.indexOf("addEventListener('activate'");
    const activateBlock = swSource.slice(activateIndex);
    expect(activateBlock).toMatch(/pubmedCache\.delete\(request\)/);
    expect(activateBlock).toMatch(/urlHasCredentialQuery\(reqUrl\)/);
  });

  it('versions every runtime cache name', () => {
    const cacheNamesBlock = swSource.match(/const CACHE_NAMES = \{([\s\S]*?)\};/);
    expect(cacheNamesBlock).not.toBeNull();
    const entries = [...(cacheNamesBlock?.[1].matchAll(/:\s*`([^`]+)`/g) ?? [])].map((m) => m[1]);
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

  it('derives service worker scope from base href, not a hardcoded repository path', () => {
    expect(registerSwSource).not.toMatch(/AI-Research-Orchestrator/);
    expect(registerSwSource).toMatch(/querySelector\('base\[href\]'/);
  });

  it('registration script dispatches an update-available event, not an unconditional reload', () => {
    expect(registerSwSource).toMatch(/sw-update-available/);
    expect(registerSwSource).toMatch(/postMessage|SKIP_WAITING|controllerchange/);
  });

  it('surfaces a redacted registration-failure event instead of a fully silent catch', () => {
    expect(registerSwSource).toMatch(/sw-registration-failed/);
    // Only the coarse error name may be forwarded - never the raw error object,
    // a .message, or a stack trace (which could leak URLs).
    expect(registerSwSource).not.toMatch(/detail:\s*{\s*reason:\s*err\s*}/);
    expect(registerSwSource).not.toMatch(/err\.message|err\.stack/);

    // Positive assertion (not just the negative denylist above): the actual
    // expression assigned to `reason` must be built from err.name with an
    // 'unknown' fallback - a future refactor forwarding e.g. String(err) or
    // err.toString() would satisfy every check above while leaking more than
    // the coarse name, so pin down the specific expression too.
    const reasonAssignment = registerSwSource.match(/var reason = ([^;]+);/)?.[1];
    expect(reasonAssignment).toMatch(/err\s*&&\s*err\.name/);
    expect(reasonAssignment).toMatch(/String\(\s*err\.name\s*\)/);
    expect(reasonAssignment).toMatch(/['"]unknown['"]/);

    // The value stored for late-mounting listeners to catch up on (see the
    // runtime behavior describe block below) must be the same redacted
    // `reason`, not a second, independently-computed expression that could
    // drift from the event's own payload.
    expect(registerSwSource).toMatch(/window\.__swRegistrationFailedReason = reason;/);
  });

  it('CSP worker-src is free of external hosts', () => {
    const cspMatch = indexHtml.match(/worker-src\s+([^;]+);/);
    expect(cspMatch).not.toBeNull();
    const sources = cspMatch ? cspMatch[1].trim().split(/\s+/) : [];
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
  /**
   * Shared non-`load` window listeners across loadRegisterSw() calls in one test
   * (multi-tab). We cannot safely call through to jsdom's native addEventListener
   * after replacing `window.location` (breaks EventTarget brand checks) or when
   * Vitest 4 reuses the same spy on a second spyOn (recursion). Dispatch is
   * fanned out manually below instead.
   */
  const sharedWindowListeners: Array<[string, EventListener]> = [];

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

  async function loadRegisterSw(
    options: { hadControllerAtLoad?: boolean; registerRejection?: unknown } = {},
  ) {
    const registration = createFakeRegistration();
    const swListeners: Record<string, Array<() => void>> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn(() =>
          options.registerRejection
            ? Promise.reject(options.registerRejection)
            : Promise.resolve(registration),
        ),
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
    // dispatching its own. Non-load listeners (e.g. "sw-request-reload") go
    // into sharedWindowListeners so one dispatch reaches every simulated tab.
    const addedToWindow: Array<[string, EventListener]> = [];
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      const entry: [string, EventListener] = [type, listener as EventListener];
      addedToWindow.push(entry);
      if (type !== 'load') sharedWindowListeners.push(entry);
    });
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
      const e = event as Event;
      for (const [type, listener] of sharedWindowListeners) {
        if (type === e.type) listener.call(window, e);
      }
      return true;
    });

    // register-sw.js is a plain browser IIFE (no module system) referencing
    // navigator/window/location as bare globals - new Function(...) runs its
    // text against this test's real globals, giving each call its own fresh
    // closure over the script's `reloaded`/`hadControllerAtLoad` vars.
    new Function(registerSwSource)();
    const loadListener = addedToWindow.find(([type]) => type === 'load')?.[1];
    if (!loadListener) throw new Error('register-sw.js did not add a "load" listener');
    loadListener(new Event('load'));
    // Let register()'s .then()/.catch() microtasks settle before returning -
    // a rejection resolves via the same number of hops as a resolution (one
    // register() settle, then the .then()/.catch() handler runs).
    await Promise.resolve();
    await Promise.resolve();

    return {
      registration,
      fireControllerChange: () => {
        for (const cb of swListeners.controllerchange ?? []) cb();
      },
      reloadSpy,
      dispatchEventSpy,
      cleanup: () => {
        for (const entry of addedToWindow) {
          const idx = sharedWindowListeners.indexOf(entry);
          if (idx >= 0) sharedWindowListeners.splice(idx, 1);
        }
      },
    };
  }

  let cleanupCurrent: (() => void) | null = null;

  afterEach(() => {
    cleanupCurrent?.();
    cleanupCurrent = null;
    sharedWindowListeners.length = 0;
    // @ts-expect-error - test-only cleanup of a property jsdom doesn't define by default
    delete navigator.serviceWorker;
    delete (window as Window & { __swRegistrationFailedReason?: string })
      .__swRegistrationFailedReason;
    vi.restoreAllMocks();
  });

  it('dispatches a redacted sw-registration-failed event and stores the same reason on window when register() rejects', async () => {
    const { dispatchEventSpy, cleanup } = await loadRegisterSw({
      registerRejection: new DOMException('blocked', 'SecurityError'),
    });
    cleanupCurrent = cleanup;

    const failureCall = dispatchEventSpy.mock.calls.find(
      ([event]) => (event as CustomEvent).type === 'sw-registration-failed',
    );
    expect(failureCall).toBeDefined();
    expect((failureCall?.[0] as CustomEvent<{ reason: string }>).detail).toEqual({
      reason: 'SecurityError',
    });
    expect(
      (window as Window & { __swRegistrationFailedReason?: string }).__swRegistrationFailedReason,
    ).toBe('SecurityError');
  });

  it('falls back to "unknown" when register() rejects with something that has no .name', async () => {
    const { dispatchEventSpy, cleanup } = await loadRegisterSw({
      registerRejection: 'not an Error instance',
    });
    cleanupCurrent = cleanup;

    const failureCall = dispatchEventSpy.mock.calls.find(
      ([event]) => (event as CustomEvent).type === 'sw-registration-failed',
    );
    expect((failureCall?.[0] as CustomEvent<{ reason: string }>).detail).toEqual({
      reason: 'unknown',
    });
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

  it('registers with scope from document base href on subpath hosts', async () => {
    const base = document.createElement('base');
    base.setAttribute('href', '/AI-Research-Orchestrator/');
    document.head.appendChild(base);
    const { cleanup } = await loadRegisterSw();
    cleanupCurrent = cleanup;
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      '/AI-Research-Orchestrator/sw.js',
      expect.objectContaining({ scope: '/AI-Research-Orchestrator/' }),
    );
    base.remove();
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
