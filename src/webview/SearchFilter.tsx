import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface FilterState {
    searchQuery: string;
    nodeTypes: {
        file: boolean;
        directory: boolean;
        function: boolean;
        class: boolean;
        module: boolean;
    };
    pathPattern: string;
}

interface SearchFilterProps {
    onFilterChange: (filter: FilterState) => void;
    onFocusSelection: () => void;
    matchCount: number;
    totalCount: number;
}

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

const SearchFilter: React.FC<SearchFilterProps> = ({
    onFilterChange,
    onFocusSelection,
    matchCount,
    totalCount
}) => {
    const [filter, setFilter] = useState<FilterState>(defaultFilter);
    const [isExpanded, setIsExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut: Ctrl+F to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setIsExpanded(true);
            }
            if (e.key === 'Escape') {
                searchInputRef.current?.blur();
                if (filter.searchQuery === '' && filter.pathPattern === '') {
                    setIsExpanded(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filter]);

    const updateFilter = useCallback((updates: Partial<FilterState>) => {
        const newFilter = { ...filter, ...updates };
        setFilter(newFilter);
        onFilterChange(newFilter);
    }, [filter, onFilterChange]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateFilter({ searchQuery: e.target.value });
    };

    const handlePathPatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateFilter({ pathPattern: e.target.value });
    };

    const toggleNodeType = (type: keyof FilterState['nodeTypes']) => {
        updateFilter({
            nodeTypes: {
                ...filter.nodeTypes,
                [type]: !filter.nodeTypes[type]
            }
        });
    };

    const clearFilters = () => {
        setFilter(defaultFilter);
        onFilterChange(defaultFilter);
    };

    const hasActiveFilters = filter.searchQuery !== '' || 
        filter.pathPattern !== '' || 
        !Object.values(filter.nodeTypes).every(v => v);

    return (
        <div className="search-filter-panel">
            <div className="search-filter-main">
                <div className="search-input-container">
                    <span className="search-icon">🔍</span>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search nodes... (Ctrl+F)"
                        value={filter.searchQuery}
                        onChange={handleSearchChange}
                        className="search-input"
                    />
                    {filter.searchQuery && (
                        <span className="search-count">
                            {matchCount} / {totalCount}
                        </span>
                    )}
                </div>
                
                <button 
                    className="filter-toggle-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title="Toggle filters"
                >
                    <span>⚙️</span>
                    {hasActiveFilters && <span className="filter-badge">•</span>}
                </button>

                {hasActiveFilters && (
                    <>
                        <button 
                            className="focus-btn"
                            onClick={onFocusSelection}
                            title="Focus on filtered results"
                        >
                            🎯 Focus
                        </button>
                        <button 
                            className="clear-btn"
                            onClick={clearFilters}
                            title="Clear all filters"
                        >
                            ✕
                        </button>
                    </>
                )}
            </div>

            {isExpanded && (
                <div className="search-filter-expanded">
                    <div className="filter-section">
                        <label className="filter-label">Filter by Type:</label>
                        <div className="type-filters">
                            {Object.entries(filter.nodeTypes).map(([type, enabled]) => (
                                <button
                                    key={type}
                                    className={`type-filter-btn ${enabled ? 'active' : 'inactive'}`}
                                    onClick={() => toggleNodeType(type as keyof FilterState['nodeTypes'])}
                                >
                                    <span className={`type-icon type-${type}`}>
                                        {type === 'file' && '📄'}
                                        {type === 'directory' && '📁'}
                                        {type === 'function' && 'ƒ'}
                                        {type === 'class' && '◆'}
                                        {type === 'module' && '📦'}
                                    </span>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <label className="filter-label">Filter by Path:</label>
                        <input
                            type="text"
                            placeholder="e.g., src/components/* or *.tsx"
                            value={filter.pathPattern}
                            onChange={handlePathPatternChange}
                            className="path-input"
                        />
                    </div>

                    <div className="filter-shortcuts">
                        <span className="shortcut-hint">
                            <kbd>Ctrl</kbd>+<kbd>F</kbd> Search
                        </span>
                        <span className="shortcut-hint">
                            <kbd>Esc</kbd> Close
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchFilter;
