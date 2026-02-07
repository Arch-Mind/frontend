/**
 * Enhanced SearchBar Component (Issue #23)
 * Search with results display, highlighting, and keyboard navigation
 */

import React, { useRef, useEffect } from 'react';
import { SearchResult, highlightText } from './searchEngine';

export interface SearchBarProps {
    query: string;
    onQueryChange: (query: string) => void;
    results: SearchResult[];
    selectedIndex: number;
    onSelectResult: (index: number) => void;
    onNavigateToResult: (result: SearchResult) => void;
    onClose?: () => void;
    isOpen: boolean;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    query,
    onQueryChange,
    results,
    selectedIndex,
    onSelectResult,
    onNavigateToResult,
    onClose,
    isOpen,
    placeholder = 'Search nodes... (/ or Ctrl+F)',
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Scroll selected result into view
    useEffect(() => {
        if (resultsRef.current && selectedIndex >= 0) {
            const selectedElement = resultsRef.current.querySelector(
                `.search-result-item[data-index="${selectedIndex}"]`
            );
            selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

    if (!isOpen) {
        return null;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onQueryChange(e.target.value);
    };

    const handleResultClick = (result: SearchResult, index: number) => {
        onSelectResult(index);
        onNavigateToResult(result);
    };

    const handleClear = () => {
        onQueryChange('');
        inputRef.current?.focus();
    };

    const getNodeIcon = (type: string) => {
        const icons: Record<string, string> = {
            file: '📄',
            directory: '📁',
            function: 'ƒ',
            class: '◆',
            module: '📦',
        };
        return icons[type] || '•';
    };

    return (
        <div className="search-bar-container">
            <div className="search-bar-header">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="search-bar-input"
                        placeholder={placeholder}
                        value={query}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                    {query && (
                        <button
                            className="search-clear-btn"
                            onClick={handleClear}
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                    {onClose && (
                        <button
                            className="search-close-btn"
                            onClick={onClose}
                            title="Close search (Esc)"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {query && (
                    <div className="search-bar-stats">
                        <span className="result-count">
                            {results.length} result{results.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {query && results.length > 0 && (
                <div className="search-results-container" ref={resultsRef}>
                    {results.map((result, index) => {
                        const labelHighlight = result.highlights.find(h => h.field === 'label');
                        const pathHighlight = result.highlights.find(h => h.field === 'filePath');
                        const isSelected = index === selectedIndex;

                        return (
                            <div
                                key={result.node.id}
                                data-index={index}
                                className={`search-result-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleResultClick(result, index)}
                                onMouseEnter={() => onSelectResult(index)}
                            >
                                <div className="result-icon">
                                    {getNodeIcon(result.node.type)}
                                </div>

                                <div className="result-content">
                                    <div className="result-label">
                                        {labelHighlight ? (
                                            <HighlightedText
                                                text={labelHighlight.text}
                                                indices={labelHighlight.indices}
                                            />
                                        ) : (
                                            result.node.label
                                        )}
                                    </div>

                                    {result.node.filePath && (
                                        <div className="result-path">
                                            {pathHighlight ? (
                                                <HighlightedText
                                                    text={pathHighlight.text}
                                                    indices={pathHighlight.indices}
                                                />
                                            ) : (
                                                result.node.filePath
                                            )}
                                        </div>
                                    )}

                                    <div className="result-meta">
                                        <span className="result-type">{result.node.type}</span>
                                        {result.node.language && (
                                            <>
                                                <span className="meta-separator">•</span>
                                                <span className="result-language">{result.node.language}</span>
                                            </>
                                        )}
                                        <span className="meta-separator">•</span>
                                        <span className="result-score">
                                            {Math.round(result.score * 100)}% match
                                        </span>
                                    </div>
                                </div>

                                {isSelected && (
                                    <div className="result-indicator">▶</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {query && results.length === 0 && (
                <div className="search-no-results">
                    <span className="no-results-icon">🔍</span>
                    <span className="no-results-text">No results found for "{query}"</span>
                </div>
            )}

            <div className="search-bar-hints">
                <span className="hint">
                    <kbd>↑</kbd><kbd>↓</kbd> Navigate
                </span>
                <span className="hint">
                    <kbd>Enter</kbd> Open
                </span>
                <span className="hint">
                    <kbd>Esc</kbd> Close
                </span>
            </div>
        </div>
    );
};

/**
 * Component to render highlighted text
 */
interface HighlightedTextProps {
    text: string;
    indices: [number, number][];
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, indices }) => {
    const parts = highlightText(text, indices);

    return (
        <>
            {parts.map((part, index) => (
                part.highlighted ? (
                    <mark key={index} className="search-highlight">
                        {part.text}
                    </mark>
                ) : (
                    <span key={index}>{part.text}</span>
                )
            ))}
        </>
    );
};
