import { useReducedMotion, type Transition } from 'framer-motion';

export interface MotionSafeLoopResult<T> {
  animate: T;
  transition: Transition;
}

/**
 * Wraps a looping (`repeat: Infinity`) Framer Motion animate/transition pair so it
 * honors `prefers-reduced-motion`: when reduced motion is requested, the loop is
 * suppressed and the element settles at its final keyframe value with a
 * zero-duration transition, instead of animating indefinitely.
 */
export function useMotionSafeLoop<T extends Record<string, unknown>>(
  animate: T,
  transition: Transition,
): MotionSafeLoopResult<T> {
  const prefersReducedMotion = useReducedMotion();

  // useReducedMotion() returns null while the media query is still resolving
  // on first render - only skip the reduction once we're certain the user
  // does NOT want it, so an unresolved preference is treated conservatively
  // (reduced) rather than briefly starting the loop and correcting later.
  if (prefersReducedMotion === false) {
    return { animate, transition };
  }

  const staticAnimate = Object.fromEntries(
    Object.entries(animate).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[value.length - 1] : value,
    ]),
  ) as T;

  return { animate: staticAnimate, transition: { duration: 0 } };
}
