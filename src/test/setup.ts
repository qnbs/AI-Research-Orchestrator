import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// FIX: Use the recommended import for vitest to extend expect with jest-dom matchers.
import '@testing-library/jest-dom/vitest';

// Runs a cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});