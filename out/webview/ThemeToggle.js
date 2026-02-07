"use strict";
/**
 * Theme Toggle Component (Issue #22)
 * UI control for switching between light/dark/auto themes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompactThemeToggle = exports.ThemeToggle = void 0;
const react_1 = __importDefault(require("react"));
const ThemeContext_1 = require("./ThemeContext");
const ThemeToggle = ({ position = 'top-right', showLabel = true, }) => {
    const { theme, resolvedTheme, setTheme } = (0, ThemeContext_1.useTheme)();
    const getIcon = (themeOption) => {
        switch (themeOption) {
            case 'light':
                return '☀️';
            case 'dark':
                return '🌙';
            case 'auto':
                return '🔄';
        }
    };
    const getLabel = (themeOption) => {
        switch (themeOption) {
            case 'light':
                return 'Light';
            case 'dark':
                return 'Dark';
            case 'auto':
                return 'Auto';
        }
    };
    const getTooltip = () => {
        if (theme === 'auto') {
            return `Auto (Currently: ${resolvedTheme}) • Ctrl+Shift+T`;
        }
        return `${getLabel(theme)} Mode • Ctrl+Shift+T`;
    };
    const options = ['auto', 'light', 'dark'];
    return (react_1.default.createElement("div", { className: `theme-toggle theme-toggle-${position}`, title: getTooltip() },
        react_1.default.createElement("div", { className: "theme-toggle-label" }, showLabel && react_1.default.createElement("span", { className: "toggle-label-text" }, "Theme:")),
        react_1.default.createElement("div", { className: "theme-options" }, options.map(option => (react_1.default.createElement("button", { key: option, className: `theme-option ${theme === option ? 'active' : ''}`, onClick: () => setTheme(option), title: getLabel(option) },
            react_1.default.createElement("span", { className: "option-icon" }, getIcon(option)),
            showLabel && react_1.default.createElement("span", { className: "option-label" }, getLabel(option)))))),
        theme === 'auto' && (react_1.default.createElement("div", { className: "theme-auto-indicator" },
            react_1.default.createElement("span", { className: "auto-hint" },
                "Following system (",
                resolvedTheme,
                ")")))));
};
exports.ThemeToggle = ThemeToggle;
/**
 * Compact theme toggle button (just icon)
 */
const CompactThemeToggle = () => {
    const { theme, toggleTheme } = (0, ThemeContext_1.useTheme)();
    const getIcon = () => {
        switch (theme) {
            case 'light':
                return '☀️';
            case 'dark':
                return '🌙';
            case 'auto':
                return '🔄';
        }
    };
    return (react_1.default.createElement("button", { className: "compact-theme-toggle", onClick: toggleTheme, title: "Toggle Theme (Ctrl+Shift+T)" },
        react_1.default.createElement("span", { className: "compact-icon" }, getIcon())));
};
exports.CompactThemeToggle = CompactThemeToggle;
//# sourceMappingURL=ThemeToggle.js.map