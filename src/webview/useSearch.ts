/**
 * useSearch Hook (Issue #23)
 * -------------------------
 * Custom React hook for managing search state, debouncing, and result navigation.
 * Provides search query state, debounced search, result selection, and keyboard navigation helpers.
 *
 * Used in the search bar and related UI components.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    SearchableNode,
    SearchResult,
    SearchOptions,
    searchNodes,
    filterSearchResults,
} from './searchEngine';

export interface UseSearchOptions extends SearchOptions {
    debounceMs?: number;
    minQueryLength?: number;
}

export interface UseSearchReturn {
    query: string;
    setQuery: (query: string) => void;
    results: SearchResult[];
    isSearching: boolean;
    selectedIndex: number;
    selectedResult: SearchResult | null;
    selectNext: () => void;
    selectPrevious: () => void;
    selectResult: (index: number) => void;
    clearSearch: () => void;
    hasResults: boolean;
    resultCount: number;
}

/**
 * useSearch
 * ---------
 * Main hook for search functionality. Handles debounced search, result selection, and exposes search state.
 *
 * @param nodes - Array of searchable nodes
 * @param options - Search options (debounce, min length, etc.)
 * @returns UseSearchReturn - Search state and handlers
 */
export function useSearch(
    nodes: SearchableNode[],
    options: UseSearchOptions = {}
): UseSearchReturn {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);

    const {
        debounceMs = 300,
        minQueryLength = 1,
        ...searchOptions
    } = options;

    // Debounce query input to avoid excessive search calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    // Perform search when debouncedQuery changes
    const results = useMemo(() => {
        if (debouncedQuery.length < minQueryLength) {
            setIsSearching(false);
            return [];
        }

        setIsSearching(true);
        const searchResults = searchNodes(nodes, debouncedQuery, searchOptions);
        setIsSearching(false);

        // Reset selection when results change
        setSelectedIndex(searchResults.length > 0 ? 0 : -1);

        return searchResults;
    }, [nodes, debouncedQuery, minQueryLength, searchOptions]);

    // Select next result in the list
    const selectNext = useCallback(() => {
        if (results.length === 0) return;
        setSelectedIndex(prev => (prev + 1) % results.length);
    }, [results.length]);

    // Select previous result in the list
    const selectPrevious = useCallback(() => {
        if (results.length === 0) return;
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    }, [results.length]);

    // Select a specific result by index
    const selectResult = useCallback((index: number) => {
        if (index >= 0 && index < results.length) {
            setSelectedIndex(index);
        }
    }, [results.length]);

    // Clear search state and selection
    const clearSearch = useCallback(() => {
        setQuery('');
        setDebouncedQuery('');
        setSelectedIndex(-1);
    }, []);

    // Get the currently selected result (or null)
    const selectedResult = selectedIndex >= 0 && selectedIndex < results.length
        ? results[selectedIndex]
        : null;

    return {
        query, // Current search query
        setQuery, // Setter for query
        results, // Array of search results
        isSearching, // Search in progress flag
        selectedIndex, // Index of selected result
        selectedResult, // The selected result object
        selectNext, // Select next result
        selectPrevious, // Select previous result
        selectResult, // Select result by index
        clearSearch, // Clear search state
        hasResults: results.length > 0, // True if there are results
        resultCount: results.length, // Number of results
    };
}

/**
 * useSearchKeyboard
 * -----------------
 * Hook for handling keyboard shortcuts for search UI.
 * Supports opening (/, Ctrl+F), closing (Esc), navigating (arrows), and selecting (Enter) search results.
 *
 * @param searchHook - The useSearch return object
 * @param callbacks - Optional callbacks for open, close, and navigation
 */
export function useSearchKeyboard(
    searchHook: UseSearchReturn,
    callbacks: {
        onOpen?: () => void;
        onClose?: () => void;
        onNavigate?: (result: SearchResult) => void;
    }
) {
    const { selectNext, selectPrevious, selectedResult, clearSearch } = searchHook;
    const { onOpen, onClose, onNavigate } = callbacks;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open search with '/' key (if not in input/textarea)
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                const target = e.target as HTMLElement;
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
