/**
 * ThemeToggle Component
 * ---------------------
 * UI control for switching between light, dark, and auto themes.
 * Used to let users toggle the application theme preference.
 *
 * Features:
 * - Shows theme options (auto, light, dark) with icons
 * - Displays current theme and system-following status
 * - Supports compact and full modes
 *
 * @component
 * @param {ThemeToggleProps} props - Position and label display options
 * @returns {JSX.Element}
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
    // Get theme state and setter from context
    const { theme, resolvedTheme, setTheme } = useTheme();

    /**
     * Returns the icon for a given theme option
     * @param themeOption - Theme value
     */
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

    /**
     * Returns the label for a given theme option
     * @param themeOption - Theme value
     */
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

    /**
     * Returns the tooltip for the current theme
     */
    const getTooltip = (): string => {
        if (theme === 'auto') {
            return `Auto (Currently: ${resolvedTheme}) • Ctrl+Shift+T`;
        }
        return `${getLabel(theme)} Mode • Ctrl+Shift+T`;
    };

    // Theme options to display
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
 * CompactThemeToggle Component
 * ---------------------------
 * Renders a compact button for toggling theme (icon only).
 *
 * @component
 * @returns {JSX.Element}
 */
export const CompactThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    /**
     * Returns the icon for the current theme
     */
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
