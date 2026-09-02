import { describe, expect, it } from 'vitest';
import { STICKY_BELOW_CHROME_CLASS } from './layoutChrome';

describe('STICKY_BELOW_CHROME_CLASS', () => {
  it('sticks only from md up and tracks measured chrome height', () => {
    expect(STICKY_BELOW_CHROME_CLASS).toContain('md:sticky');
    expect(STICKY_BELOW_CHROME_CLASS).not.toMatch(/(?:^|\s)sticky(?:\s|$)/);
    expect(STICKY_BELOW_CHROME_CLASS).toContain('var(--chrome-height,0px)');
  });
});
