import { describe, expect, it } from 'vitest';
import {
  buildAssetUrl,
  buildSiteUrl,
  normalizeBasePath,
  resolveSiteOrigin,
} from './deploymentConfig';

describe('normalizeBasePath', () => {
  it('normalizes root and subpaths', () => {
    expect(normalizeBasePath('/')).toBe('/');
    expect(normalizeBasePath('')).toBe('/');
    expect(normalizeBasePath(undefined, '/fallback/')).toBe('/fallback/');
    expect(normalizeBasePath('repo')).toBe('/repo/');
    expect(normalizeBasePath('/repo')).toBe('/repo/');
    expect(normalizeBasePath('/repo/')).toBe('/repo/');
    expect(normalizeBasePath('AI-Research-Orchestrator')).toBe('/AI-Research-Orchestrator/');
  });
});

describe('buildSiteUrl', () => {
  it('builds GitHub Pages and root-host URLs', () => {
    expect(buildSiteUrl('https://qnbs.github.io', '/AI-Research-Orchestrator/')).toBe(
      'https://qnbs.github.io/AI-Research-Orchestrator/',
    );
    expect(buildSiteUrl('https://example.com', '/')).toBe('https://example.com/');
  });
});

describe('buildAssetUrl', () => {
  it('builds icon URLs under the deployment base', () => {
    expect(
      buildAssetUrl(
        'https://qnbs.github.io',
        '/AI-Research-Orchestrator/',
        'icons/icon-512.png',
      ),
    ).toBe('https://qnbs.github.io/AI-Research-Orchestrator/icons/icon-512.png');
    expect(buildAssetUrl('https://example.com', '/', 'icons/icon-512.png')).toBe(
      'https://example.com/icons/icon-512.png',
    );
  });
});

describe('resolveSiteOrigin', () => {
  it('defaults to the public GitHub Pages origin', () => {
    expect(resolveSiteOrigin()).toMatch(/^https:\/\//);
  });
});
