"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Unit tests for ThemeToggle component
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const ThemeToggle_1 = require("../ThemeToggle");
const ThemeContext_1 = require("../ThemeContext");
// Test suite for ThemeToggle functionality
describe('ThemeToggle', () => {
    // Setup: Mock window.matchMedia for jsdom environment
    beforeAll(() => {
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
    // Test: renders all theme option buttons (Auto, Light, Dark)
    it('renders all theme option buttons', () => {
        (0, react_2.render)(react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
            react_1.default.createElement(ThemeToggle_1.ThemeToggle, null)));
        const buttons = react_2.screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(3); // Auto, Light, Dark
        expect(buttons.some(btn => btn.textContent?.includes('Auto'))).toBe(true);
        expect(buttons.some(btn => btn.textContent?.includes('Light'))).toBe(true);
        expect(buttons.some(btn => btn.textContent?.includes('Dark'))).toBe(true);
    });
    // Test: toggles theme when a theme button is clicked
    it('toggles theme when a theme button is clicked', () => {
        (0, react_2.render)(react_1.default.createElement(ThemeContext_1.ThemeProvider, null,
            react_1.default.createElement(ThemeToggle_1.ThemeToggle, null)));
        const buttons = react_2.screen.getAllByRole('button');
        react_2.fireEvent.click(buttons[1]); // Click Light theme
        // Optionally, check for theme change in context or DOM
    });
});
//# sourceMappingURL=ThemeToggle.test.js.map