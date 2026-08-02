import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLogo } from './AppLogo';
import { AppBrandMark } from './AppBrandMark';

describe('AppLogo', () => {
  it('renders an accessible SVG microscope mark', () => {
    render(<AppLogo aria-label="AI Research Orchestrator" />);
    expect(screen.getByRole('img', { name: 'AI Research Orchestrator' })).toBeInTheDocument();
  });
});

describe('AppBrandMark', () => {
  it('renders logo with optional emoji badge', () => {
    const { container, rerender } = render(<AppBrandMark showEmoji aria-label="Brand" />);
    expect(screen.getByRole('img', { name: 'Brand' })).toBeInTheDocument();
    expect(container.textContent).toContain('🔬');

    rerender(<AppBrandMark aria-label="Brand" />);
    expect(container.textContent).not.toContain('🔬');
  });
});
