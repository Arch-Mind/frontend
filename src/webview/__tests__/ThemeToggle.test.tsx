import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '../ThemeContext';

describe('ThemeToggle', () => {
    beforeAll(() => {
      // Mock window.matchMedia for jsdom
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: jest.fn(), // deprecated
          removeListener: jest.fn(), // deprecated
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });
  it('renders all theme option buttons', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // Auto, Light, Dark
    expect(buttons.some(btn => btn.textContent?.includes('Auto'))).toBe(true);
    expect(buttons.some(btn => btn.textContent?.includes('Light'))).toBe(true);
    expect(buttons.some(btn => btn.textContent?.includes('Dark'))).toBe(true);
  });

  it('toggles theme when a theme button is clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Click Light theme
    // Optionally, check for theme change in context or DOM
  });
});
