import React, { useEffect } from 'react';
import ArchitectureGraph from './ArchitectureGraph';
import { ThemeProvider, useThemeKeyboard } from './ThemeContext';
import { CompactThemeToggle } from './ThemeToggle';
import { initializeExportListener } from '../utils/exporters/vscodeExportHelper';

const ThemeKeyboardHandler: React.FC = () => {
    useThemeKeyboard();
    return null;
};

const Header: React.FC = () => (
    <header className="app-header">
        <div className="header-content">
            <h1 className="header-title">
                <span className="header-icon">🏗️</span>
                ArchMind
            </h1>
            <span className="header-subtitle">Architecture Intelligence</span>
        </div>
        <div className="header-actions">
            <CompactThemeToggle />
        </div>
    </header>
);

const App: React.FC = () => {
    // Initialize export listener for VS Code webview context
    useEffect(() => {
        initializeExportListener();
    }, []);

    return (
        <ThemeProvider>
            <ThemeKeyboardHandler />
            <div className="app-container">
                <Header />
                <main className="app-main">
                    <ArchitectureGraph />
                </main>
            </div>
        </ThemeProvider>
    );
};

export default App;
