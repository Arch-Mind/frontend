import React, { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useThemeKeyboard } from '../ThemeContext';
import { ThemeToggle, CompactThemeToggle } from '../ThemeToggle';

// Wrapper component to enable keyboard shortcuts
const ThemeIntegrationWrapper: React.FC = () => {
    useThemeKeyboard();
    return (
        <div>
            <ThemeToggle />
            <CompactThemeToggle />
        </div>
    );
};

describe('Theme Context and Toggle Integration', () => {
    beforeEach(() => {
        // Clear global document class and attributes for clean state
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
        localStorage.clear();

        // Object.defineProperty is needed to mock matchMedia in JSDOM
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

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('initializes with default light theme when no system preference or saved preference', () => {
        render(
            <ThemeProvider>
                <ThemeIntegrationWrapper />
            </ThemeProvider>
        );

        // Uses default auto mode -> checks prefers-color-scheme.
        // In JSDOM, matches is false by default, so it defaults to light.
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        
        // Auto button should be active
        const autoButton = screen.getByRole('button', { name: /auto/i });
        expect(autoButton).toHaveClass('active');
    });

    it('changes theme when clicking the different theme toggle buttons', () => {
        render(
            <ThemeProvider>
                <ThemeIntegrationWrapper />
            </ThemeProvider>
        );

        const darkButton = screen.getByRole('button', { name: /dark/i });
        
        // Click Dark Theme
        fireEvent.click(darkButton);

        // Document should update
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('archmind-theme')).toBe('dark');

        const lightButton = screen.getByRole('button', { name: /light/i });
        
        // Click Light Theme
        fireEvent.click(lightButton);

        // Document should update
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem('archmind-theme')).toBe('light');
    });

    it('toggles theme cyclically using CompactThemeToggle', () => {
        render(
            <ThemeProvider>
                <ThemeIntegrationWrapper />
            </ThemeProvider>
        );

        const compactToggle = screen.getByTitle('Toggle Theme (Ctrl+Shift+T)');

        // Starts at 'auto' (resolves to 'light'). Cycle -> 'light'
        fireEvent.click(compactToggle);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem('archmind-theme')).toBe('light');

        // Cycle -> 'dark'
        fireEvent.click(compactToggle);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('archmind-theme')).toBe('dark');

        // Cycle -> 'auto'
        fireEvent.click(compactToggle);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light'); // Auto defaults to light in JSDOM
        expect(localStorage.getItem('archmind-theme')).toBe('auto');
    });

    it('reacts to keyboard shortcut Ctrl+Shift+T to cycle theme', () => {
        render(
            <ThemeProvider>
                <ThemeIntegrationWrapper />
            </ThemeProvider>
        );

        // Initial state is auto (resolves to light)
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        
        // Press Ctrl+Shift+T
        fireEvent.keyDown(window, { key: 't', code: 'KeyT', ctrlKey: true, shiftKey: true });
        
        // Should cycle from auto -> light
        expect(localStorage.getItem('archmind-theme')).toBe('light');
        
        // Press Ctrl+Shift+T again
        fireEvent.keyDown(window, { key: 't', code: 'KeyT', ctrlKey: true, shiftKey: true });
        
        // Should cycle from light -> dark
        expect(localStorage.getItem('archmind-theme')).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
});
