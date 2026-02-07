"use strict";
/**
 * Theme Context (Issue #22)
 * Manages theme state, persistence, and system preference detection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = void 0;
exports.useTheme = useTheme;
exports.useThemeKeyboard = useThemeKeyboard;
const react_1 = __importStar(require("react"));
const ThemeContext = (0, react_1.createContext)(undefined);
const THEME_STORAGE_KEY = 'archmind-theme';
/**
 * Detect system color scheme preference
 */
function getSystemTheme() {
    if (typeof window === 'undefined')
        return 'light';
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'dark' : 'light';
}
/**
 * Load saved theme from localStorage
 */
function loadSavedTheme() {
    if (typeof window === 'undefined')
        return 'auto';
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        return saved;
    }
    return 'auto';
}
/**
 * Resolve theme to actual light/dark value
 */
function resolveTheme(theme, systemTheme) {
    if (theme === 'auto') {
        return systemTheme;
    }
    return theme;
}
const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = (0, react_1.useState)('auto');
    const [systemTheme, setSystemTheme] = (0, react_1.useState)('light');
    const [resolvedTheme, setResolvedTheme] = (0, react_1.useState)('light');
    // Initialize theme on mount
    (0, react_1.useEffect)(() => {
        const saved = loadSavedTheme();
        const system = getSystemTheme();
        setThemeState(saved);
        setSystemTheme(system);
        setResolvedTheme(resolveTheme(saved, system));
    }, []);
    // Listen for system theme changes
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            setSystemTheme(newSystemTheme);
            // Only update resolved theme if in auto mode
            if (theme === 'auto') {
                setResolvedTheme(newSystemTheme);
            }
        };
        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Legacy browsers
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [theme]);
    // Apply theme to document
    (0, react_1.useEffect)(() => {
        if (typeof document === 'undefined')
            return;
        const root = document.documentElement;
        // Remove old theme class
        root.classList.remove('theme-light', 'theme-dark');
        // Add new theme class
        root.classList.add(`theme-${resolvedTheme}`);
        // Set data attribute for CSS
        root.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);
    const setTheme = (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        const newResolvedTheme = resolveTheme(newTheme, systemTheme);
        setResolvedTheme(newResolvedTheme);
    };
    const toggleTheme = () => {
        // Cycle: auto -> light -> dark -> auto
        if (theme === 'auto') {
            setTheme('light');
        }
        else if (theme === 'light') {
            setTheme('dark');
        }
        else {
            setTheme('auto');
        }
    };
    return (react_1.default.createElement(ThemeContext.Provider, { value: { theme, resolvedTheme, setTheme, toggleTheme } }, children));
};
exports.ThemeProvider = ThemeProvider;
/**
 * Hook to use theme context
 */
function useTheme() {
    const context = (0, react_1.useContext)(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
/**
 * Hook for keyboard shortcut (Ctrl+Shift+T)
 */
function useThemeKeyboard() {
    const { toggleTheme } = useTheme();
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Toggle theme: Ctrl+Shift+T
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 't') {
                e.preventDefault();
                toggleTheme();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleTheme]);
}
//# sourceMappingURL=ThemeContext.js.map