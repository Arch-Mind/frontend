/**
 * Theme Context (Issue #22)
 * Manages theme state, persistence, and system preference detection
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'archmind-theme';

/**
 * Detect system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';
    
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'dark' : 'light';
}

/**
 * Load saved theme from localStorage
 */
function loadSavedTheme(): Theme {
    if (typeof window === 'undefined') return 'auto';
    
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        return saved;
    }
    
    return 'auto';
}

/**
 * Resolve theme to actual light/dark value
 */
function resolveTheme(theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme {
    if (theme === 'auto') {
        return systemTheme;
    }
    return theme;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>('auto');
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

    // Initialize theme on mount
    useEffect(() => {
        const saved = loadSavedTheme();
        const system = getSystemTheme();
        
        setThemeState(saved);
        setSystemTheme(system);
        setResolvedTheme(resolveTheme(saved, system));
    }, []);

    // Listen for system theme changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e: MediaQueryListEvent) => {
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
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;
        
        // Remove old theme class
        root.classList.remove('theme-light', 'theme-dark');
        
        // Add new theme class
        root.classList.add(`theme-${resolvedTheme}`);
        
        // Set data attribute for CSS
        root.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        
        const newResolvedTheme = resolveTheme(newTheme, systemTheme);
        setResolvedTheme(newResolvedTheme);
    };

    const toggleTheme = () => {
        // Cycle: auto -> light -> dark -> auto
        if (theme === 'auto') {
            setTheme('light');
        } else if (theme === 'light') {
            setTheme('dark');
        } else {
            setTheme('auto');
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * Hook to use theme context
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    
    return context;
}

/**
 * Hook for keyboard shortcut (Ctrl+Shift+T)
 */
export function useThemeKeyboard() {
    const { toggleTheme } = useTheme();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
