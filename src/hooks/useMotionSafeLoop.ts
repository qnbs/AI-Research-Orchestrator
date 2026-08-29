import { useRef } from 'react';
import { useReducedMotion, type Transition } from 'framer-motion';

export interface MotionSafeLoopResult<T> {
  animate: T;
  transition: Transition;
}

function valuesEquivalent(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  }
  return false;
}

function animateEquivalent<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => valuesEquivalent(a[key], b[key]));
}

function transitionEquivalent(a: Transition, b: Transition): boolean {
  return (
    Object.is(a.duration, b.duration) &&
    Object.is(a.delay, b.delay) &&
    Object.is(a.repeat, b.repeat) &&
    Object.is(a.repeatDelay, b.repeatDelay) &&
    Object.is(a.ease, b.ease)
  );
}

/**
 * Wraps a looping (`repeat: Infinity`) Framer Motion animate/transition pair so it
 * honors `prefers-reduced-motion`: when reduced motion is requested, the loop is
 * suppressed and the element settles at its final keyframe value with a
 * zero-duration transition, instead of animating indefinitely.
 *
 * Equivalent keyframe/transition values reuse the previous result identity so
 * Framer Motion does not restart the loop when the caller passes a fresh
 * inline object on every render (e.g. debugger pulse during trace updates).
 */
export function useMotionSafeLoop<T extends Record<string, unknown>>(
  animate: T,
  transition: Transition,
): MotionSafeLoopResult<T> {
  const prefersReducedMotion = useReducedMotion();
  const cacheRef = useRef<{
    prefers: boolean | null;
    animate: T;
    transition: Transition;
    result: MotionSafeLoopResult<T>;
  } | null>(null);

  const cache = cacheRef.current;
  if (
    cache &&
    cache.prefers === prefersReducedMotion &&
    animateEquivalent(cache.animate, animate) &&
    transitionEquivalent(cache.transition, transition)
  ) {
    return cache.result;
  }

  // useReducedMotion() returns null while the media query is still resolving
  // on first render - only skip the reduction once we're certain the user
  // does NOT want it, so an unresolved preference is treated conservatively
  // (reduced) rather than briefly starting the loop and correcting later.
  let result: MotionSafeLoopResult<T>;
  if (prefersReducedMotion === false) {
    result = { animate, transition };
  } else {
    const staticAnimate = Object.fromEntries(
      Object.entries(animate).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[value.length - 1] : value,
      ]),
    ) as T;

    // Preserve any other transition properties (e.g. a custom `ease`) the caller
    // set, but explicitly zero everything that could reintroduce motion here:
    // `repeat`/`repeatDelay` would otherwise still carry over as `Infinity`,
    // turning this into an infinitely-looping zero-duration transition instead
    // of a static settle, and a nonzero `delay` would reintroduce the same
    // "briefly shows the wrong state" flash the null-handling above avoids.
    result = {
      animate: staticAnimate,
      transition: { ...transition, duration: 0, delay: 0, repeat: 0, repeatDelay: 0 },
    };
  }

  cacheRef.current = { prefers: prefersReducedMotion, animate, transition, result };
  return result;
}
