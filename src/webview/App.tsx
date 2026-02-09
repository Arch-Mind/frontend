import React, { useEffect, useState } from 'react';
import ArchitectureGraph from './ArchitectureGraph';
import { ModuleBoundaryDiagram } from './ModuleBoundaryDiagram';
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

    const [activeView, setActiveView] = useState<'graph' | 'boundaries'>('graph');

    return (
        <ThemeProvider>
            <ThemeKeyboardHandler />
            <div className="app-container">
                <Header />
                <div className="view-toggle">
                    <button
                        className={activeView === 'graph' ? 'view-tab active' : 'view-tab'}
                        onClick={() => setActiveView('graph')}
                    >
                        Graph
                    </button>
                    <button
                        className={activeView === 'boundaries' ? 'view-tab active' : 'view-tab'}
                        onClick={() => setActiveView('boundaries')}
                    >
                        Boundaries
                    </button>
                </div>
                <main className="app-main">
                    {activeView === 'graph' ? <ArchitectureGraph /> : <ModuleBoundaryDiagram />}
                </main>
            </div>
        </ThemeProvider>
    );
};

export default App;
