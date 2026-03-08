"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const ThemeContext_1 = require("../ThemeContext");
const ThemeToggle_1 = require("../ThemeToggle");
// Wrapper component to enable keyboard shortcuts
const ThemeIntegrationWrapper = () => {
    (0, ThemeContext_1.useThemeKeyboard)();
    return (react_1.default.createElement("div", null,
        react_1.default.createElement(ThemeToggle_1.ThemeToggle, null),
        react_1.default.createElement(ThemeToggle_1.CompactThemeToggle, null)));
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
        (0, react_2.render)(react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
            react_1.default.createElement(ThemeIntegrationWrapper, null)));
        // Uses default auto mode -> checks prefers-color-scheme.
        // In JSDOM, matches is false by default, so it defaults to light.
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        // Auto button should be active
        const autoButton = react_2.screen.getByRole('button', { name: /auto/i });
        expect(autoButton).toHaveClass('active');
    });
    it('changes theme when clicking the different theme toggle buttons', () => {
        (0, react_2.render)(react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
            react_1.default.createElement(ThemeIntegrationWrapper, null)));
        const darkButton = react_2.screen.getByRole('button', { name: /dark/i });
        // Click Dark Theme
        react_2.fireEvent.click(darkButton);
        // Document should update
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('archmind-theme')).toBe('dark');
        const lightButton = react_2.screen.getByRole('button', { name: /light/i });
        // Click Light Theme
        react_2.fireEvent.click(lightButton);
        // Document should update
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem('archmind-theme')).toBe('light');
    });
    it('toggles theme cyclically using CompactThemeToggle', () => {
        (0, react_2.render)(react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
            react_1.default.createElement(ThemeIntegrationWrapper, null)));
        const compactToggle = react_2.screen.getByTitle('Toggle Theme (Ctrl+Shift+T)');
        // Starts at 'auto' (resolves to 'light'). Cycle -> 'light'
        react_2.fireEvent.click(compactToggle);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem('archmind-theme')).toBe('light');
        // Cycle -> 'dark'
        react_2.fireEvent.click(compactToggle);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('archmind-theme')).toBe('dark');
        // Cycle -> 'auto'
        react_2.fireEvent.click(compactToggle);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light'); // Auto defaults to light in JSDOM
        expect(localStorage.getItem('archmind-theme')).toBe('auto');
    });
    it('reacts to keyboard shortcut Ctrl+Shift+T to cycle theme', () => {
        (0, react_2.render)(react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
            react_1.default.createElement(ThemeIntegrationWrapper, null)));
        // Initial state is auto (resolves to light)
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        // Press Ctrl+Shift+T
        react_2.fireEvent.keyDown(window, { key: 't', code: 'KeyT', ctrlKey: true, shiftKey: true });
        // Should cycle from auto -> light
        expect(localStorage.getItem('archmind-theme')).toBe('light');
        // Press Ctrl+Shift+T again
        react_2.fireEvent.keyDown(window, { key: 't', code: 'KeyT', ctrlKey: true, shiftKey: true });
        // Should cycle from light -> dark
        expect(localStorage.getItem('archmind-theme')).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
});
//# sourceMappingURL=ThemeIntegration.int.test.js.map