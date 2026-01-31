import React, { useState, useCallback } from 'react';
import ArchitectureGraph from './ArchitectureGraph';
import SearchFilter, { FilterState } from './SearchFilter';

const defaultFilter: FilterState = {
    searchQuery: '',
    nodeTypes: {
        file: true,
        directory: true,
        function: true,
        class: true,
        module: true
    },
    pathPattern: ''
};

const App: React.FC = () => {
    const [filter, setFilter] = useState<FilterState>(defaultFilter);
    const [matchCount, setMatchCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const handleFilterChange = useCallback((newFilter: FilterState) => {
        setFilter(newFilter);
    }, []);

    const handleFocusSelection = useCallback(() => {
        // Dispatch custom event to graph
        window.dispatchEvent(new CustomEvent('focusSelection'));
    }, []);

    const handleMatchCountChange = useCallback((matched: number, total: number) => {
        setMatchCount(matched);
        setTotalCount(total);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="header-panel">
                <div className="header-title">
                    <h3>🏗️ Architecture Reconstruction</h3>
                    <span className="header-subtitle">Real-Time Codebase Intelligence</span>
                </div>
                <SearchFilter 
                    onFilterChange={handleFilterChange}
                    onFocusSelection={handleFocusSelection}
                    matchCount={matchCount}
                    totalCount={totalCount}
                />
            </div>
            <div style={{ flex: 1 }}>
                <ArchitectureGraph 
                    filter={filter} 
                    onMatchCountChange={handleMatchCountChange}
                />
            </div>
        </div>
    );
};

export default App;
