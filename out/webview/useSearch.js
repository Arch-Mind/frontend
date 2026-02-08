"use strict";
/**
 * useSearch Hook (Issue #23)
 * Custom hook for managing search state and operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSearch = useSearch;
exports.useSearchKeyboard = useSearchKeyboard;
const react_1 = require("react");
const searchEngine_1 = require("./searchEngine");
/**
 * Custom hook for search functionality
 */
function useSearch(nodes, options = {}) {
    const [query, setQuery] = (0, react_1.useState)('');
    const [debouncedQuery, setDebouncedQuery] = (0, react_1.useState)('');
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(-1);
    const [isSearching, setIsSearching] = (0, react_1.useState)(false);
    const { debounceMs = 300, minQueryLength = 1, ...searchOptions } = options;
    // Debounce query input
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);
        return () => clearTimeout(timer);
    }, [query, debounceMs]);
    // Perform search
    const results = (0, react_1.useMemo)(() => {
        if (debouncedQuery.length < minQueryLength) {
            setIsSearching(false);
            return [];
        }
        setIsSearching(true);
        const searchResults = (0, searchEngine_1.searchNodes)(nodes, debouncedQuery, searchOptions);
        setIsSearching(false);
        // Reset selection when results change
        setSelectedIndex(searchResults.length > 0 ? 0 : -1);
        return searchResults;
    }, [nodes, debouncedQuery, minQueryLength, searchOptions]);
    // Select next result
    const selectNext = (0, react_1.useCallback)(() => {
        if (results.length === 0)
            return;
        setSelectedIndex(prev => (prev + 1) % results.length);
    }, [results.length]);
    // Select previous result
    const selectPrevious = (0, react_1.useCallback)(() => {
        if (results.length === 0)
            return;
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    }, [results.length]);
    // Select specific result
    const selectResult = (0, react_1.useCallback)((index) => {
        if (index >= 0 && index < results.length) {
            setSelectedIndex(index);
        }
    }, [results.length]);
    // Clear search
    const clearSearch = (0, react_1.useCallback)(() => {
        setQuery('');
        setDebouncedQuery('');
        setSelectedIndex(-1);
    }, []);
    // Get selected result
    const selectedResult = selectedIndex >= 0 && selectedIndex < results.length
        ? results[selectedIndex]
        : null;
    return {
        query,
        setQuery,
        results,
        isSearching,
        selectedIndex,
        selectedResult,
        selectNext,
        selectPrevious,
        selectResult,
        clearSearch,
        hasResults: results.length > 0,
        resultCount: results.length,
    };
}
/**
 * Hook for keyboard shortcuts
 */
function useSearchKeyboard(searchHook, callbacks) {
    const { selectNext, selectPrevious, selectedResult, clearSearch } = searchHook;
    const { onOpen, onClose, onNavigate } = callbacks;
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Open search with '/' key
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                // Only if not in an input field
                const target = e.target;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    onOpen?.();
                }
            }
            // Open search with Ctrl+F
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                onOpen?.();
            }
            // Close search with Escape
            if (e.key === 'Escape') {
                clearSearch();
                onClose?.();
            }
            // Navigate results with arrow keys
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectNext();
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectPrevious();
            }
            // Navigate to selected result with Enter
            if (e.key === 'Enter' && selectedResult) {
                e.preventDefault();
                onNavigate?.(selectedResult);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectNext, selectPrevious, selectedResult, clearSearch, onOpen, onClose, onNavigate]);
}
//# sourceMappingURL=useSearch.js.map