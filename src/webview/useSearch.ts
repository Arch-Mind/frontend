/**
 * useSearch Hook (Issue #23)
 * Custom hook for managing search state and operations
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
 * Custom hook for search functionality
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

    // Debounce query input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    // Perform search
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

    // Select next result
    const selectNext = useCallback(() => {
        if (results.length === 0) return;
        setSelectedIndex(prev => (prev + 1) % results.length);
    }, [results.length]);

    // Select previous result
    const selectPrevious = useCallback(() => {
        if (results.length === 0) return;
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    }, [results.length]);

    // Select specific result
    const selectResult = useCallback((index: number) => {
        if (index >= 0 && index < results.length) {
            setSelectedIndex(index);
        }
    }, [results.length]);

    // Clear search
    const clearSearch = useCallback(() => {
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
            // Open search with '/' key
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                // Only if not in an input field
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
