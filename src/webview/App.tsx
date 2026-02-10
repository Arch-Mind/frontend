import React, { useEffect, useState } from 'react';
import ArchitectureGraph from './ArchitectureGraph';
import { ModuleBoundaryDiagram } from './ModuleBoundaryDiagram';
import { BoundaryDiagram } from './BoundaryDiagram';
import { DependencyDiagram } from './DependencyDiagram';
import { CommunicationDiagram } from './CommunicationDiagram';
import { ThemeProvider, useThemeKeyboard } from './ThemeContext';
import { CompactThemeToggle } from './ThemeToggle';
import { initializeExportListener } from '../utils/exporters/vscodeExportHelper';
import { HeatmapMode } from './heatmapUtils';

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

    const [activeView, setActiveView] = useState<
        'graph' | 'boundaries' | 'boundary-diagram' | 'dependency-diagram' | 'communication'
    >('graph');
    const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('off');

    const heatmapOptions: { value: HeatmapMode; label: string }[] = [
        { value: 'off', label: 'Off' },
        { value: 'commit_count', label: 'Commit Count' },
        { value: 'last_modified', label: 'Last Modified' },
        { value: 'author_count', label: 'Author Count' },
    ];

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message?.command === 'switchView' && message.view) {
                setActiveView(message.view);
            }
            if (message?.command === 'toggleHeatmap') {
                setHeatmapMode((prev) => {
                    const order: HeatmapMode[] = ['off', 'commit_count', 'last_modified', 'author_count'];
                    const index = order.indexOf(prev);
                    return order[(index + 1) % order.length];
                });
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

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
                    <button
                        className={activeView === 'boundary-diagram' ? 'view-tab active' : 'view-tab'}
                        onClick={() => setActiveView('boundary-diagram')}
                    >
                        Boundary Diagram
                    </button>
                    <button
                        className={activeView === 'dependency-diagram' ? 'view-tab active' : 'view-tab'}
                        onClick={() => setActiveView('dependency-diagram')}
                    >
                        Dependency Diagram
                    </button>
                    <button
                        className={activeView === 'communication' ? 'view-tab active' : 'view-tab'}
                        onClick={() => setActiveView('communication')}
                    >
                        Communication
                    </button>
                </div>
                <div className="heatmap-toolbar">
                    <span className="heatmap-label">Heatmap</span>
                    <div className="heatmap-toggle">
                        {heatmapOptions.map(option => (
                            <button
                                key={option.value}
                                className={
                                    heatmapMode === option.value
                                        ? 'heatmap-pill active'
                                        : 'heatmap-pill'
                                }
                                onClick={() => setHeatmapMode(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                <main className="app-main">
                    {activeView === 'graph' && <ArchitectureGraph heatmapMode={heatmapMode} />}
                    {activeView === 'boundaries' && <ModuleBoundaryDiagram heatmapMode={heatmapMode} />}
                    {activeView === 'boundary-diagram' && <BoundaryDiagram heatmapMode={heatmapMode} />}
                    {activeView === 'dependency-diagram' && <DependencyDiagram heatmapMode={heatmapMode} />}
                    {activeView === 'communication' && <CommunicationDiagram heatmapMode={heatmapMode} />}
                </main>
            </div>
        </ThemeProvider>
    );
};

export default App;
