import React from 'react';
import ArchitectureGraph from './ArchitectureGraph';

const App: React.FC = () => {
    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid var(--vscode-widget-border)' }}>
                <h3>Architecture Reconstruction</h3>
                <p>Visualizing codebase structure...</p>
            </div>
            <div style={{ flex: 1 }}>
                <ArchitectureGraph />
            </div>
        </div>
    );
};

export default App;
