import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from 'framer-motion';
import { useMotionSafeLoop } from './useMotionSafeLoop';

vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(),
}));

const mockedUseReducedMotion = vi.mocked(useReducedMotion);

describe('useMotionSafeLoop', () => {
  it('passes the loop through unchanged when reduced motion is not requested', () => {
    mockedUseReducedMotion.mockReturnValue(false);

    const { result } = renderHook(() =>
      useMotionSafeLoop({ scale: [1, 1.35, 1] }, { duration: 1, repeat: Infinity }),
    );

    expect(result.current.animate).toEqual({ scale: [1, 1.35, 1] });
    expect(result.current.transition).toEqual({ duration: 1, repeat: Infinity });
  });

  it('collapses keyframe arrays to their final value and zeroes duration when reduced motion is requested', () => {
    mockedUseReducedMotion.mockReturnValue(true);

    const { result } = renderHook(() =>
      useMotionSafeLoop(
        { scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] },
        { duration: 1.4, repeat: Infinity },
      ),
    );

    expect(result.current.animate).toEqual({ scale: 1, opacity: 0.5 });
    expect(result.current.transition).toEqual({ duration: 0 });
  });

  it('leaves non-array animate values untouched when reduced motion is requested', () => {
    mockedUseReducedMotion.mockReturnValue(true);

    const { result } = renderHook(() =>
      useMotionSafeLoop({ scale: 1.08 }, { duration: 1.5, repeat: Infinity }),
    );

    expect(result.current.animate).toEqual({ scale: 1.08 });
    expect(result.current.transition).toEqual({ duration: 0 });
  });

  it('treats an unresolved (null) preference conservatively, same as reduced motion', () => {
    // useReducedMotion() returns null while the media query is still resolving
    // on first render. Treating that as "not reduced" would briefly start the
    // loop before a later render corrects it - it must collapse immediately.
    mockedUseReducedMotion.mockReturnValue(null);

    const { result } = renderHook(() =>
      useMotionSafeLoop({ scale: [1, 1.35, 1] }, { duration: 1, repeat: Infinity }),
    );

    expect(result.current.animate).toEqual({ scale: 1 });
    expect(result.current.transition).toEqual({ duration: 0 });
  });
});
