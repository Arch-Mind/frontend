"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const ThemeToggle_1 = require("../ThemeToggle");
describe('ThemeToggle', () => {
    it('renders theme toggle button', () => {
        (0, react_2.render)(react_1.default.createElement(ThemeToggle_1.ThemeToggle, null));
        expect(react_2.screen.getByRole('button')).toBeInTheDocument();
    });
    it('toggles theme on click', () => {
        (0, react_2.render)(react_1.default.createElement(ThemeToggle_1.ThemeToggle, null));
        const button = react_2.screen.getByRole('button');
        react_2.fireEvent.click(button);
        // Optionally, check for theme change in context or DOM
    });
});
//# sourceMappingURL=ThemeToggle.test.js.map