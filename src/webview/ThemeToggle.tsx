/**
 * Theme Toggle Component (Issue #22)
 * UI control for switching between light/dark/auto themes
 */

import React from 'react';
import { useTheme, Theme } from './ThemeContext';

export interface ThemeToggleProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
    position = 'top-right',
    showLabel = true,
}) => {
    const { theme, resolvedTheme, setTheme } = useTheme();

    const getIcon = (themeOption: Theme): string => {
        switch (themeOption) {
            case 'light':
                return '☀️';
            case 'dark':
                return '🌙';
            case 'auto':
                return '🔄';
        }
    };

    const getLabel = (themeOption: Theme): string => {
        switch (themeOption) {
            case 'light':
                return 'Light';
            case 'dark':
                return 'Dark';
            case 'auto':
                return 'Auto';
        }
    };

    const getTooltip = (): string => {
        if (theme === 'auto') {
            return `Auto (Currently: ${resolvedTheme}) • Ctrl+Shift+T`;
        }
        return `${getLabel(theme)} Mode • Ctrl+Shift+T`;
    };

    const options: Theme[] = ['auto', 'light', 'dark'];

    return (
        <div className={`theme-toggle theme-toggle-${position}`} title={getTooltip()}>
            <div className="theme-toggle-label">
                {showLabel && <span className="toggle-label-text">Theme:</span>}
            </div>
            
            <div className="theme-options">
                {options.map(option => (
                    <button
                        key={option}
                        className={`theme-option ${theme === option ? 'active' : ''}`}
                        onClick={() => setTheme(option)}
                        title={getLabel(option)}
                    >
                        <span className="option-icon">{getIcon(option)}</span>
                        {showLabel && <span className="option-label">{getLabel(option)}</span>}
                    </button>
                ))}
            </div>

            {theme === 'auto' && (
                <div className="theme-auto-indicator">
                    <span className="auto-hint">
                        Following system ({resolvedTheme})
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * Compact theme toggle button (just icon)
 */
export const CompactThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    const getIcon = (): string => {
        switch (theme) {
            case 'light':
                return '☀️';
            case 'dark':
                return '🌙';
            case 'auto':
                return '🔄';
        }
    };

    return (
        <button
            className="compact-theme-toggle"
            onClick={toggleTheme}
            title="Toggle Theme (Ctrl+Shift+T)"
        >
            <span className="compact-icon">{getIcon()}</span>
        </button>
    );
};
