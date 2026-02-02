import React from 'react';
import ArchitectureGraph from './ArchitectureGraph';

const Header: React.FC = () => (
    <header className="app-header">
        <div className="header-content">
            <h1 className="header-title">
                <span className="header-icon">🏗️</span>
                ArchMind
            </h1>
            <span className="header-subtitle">Architecture Intelligence</span>
        </div>
    </header>
);

const App: React.FC = () => {
    return (
        <div className="app-container">
            <Header />
            <main className="app-main">
                <ArchitectureGraph />
            </main>
        </div>
    );
};

export default App;
