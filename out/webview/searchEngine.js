"use strict";
/**
 * Search Engine for Graph Nodes (Issue #23)
 * Advanced search with fuzzy matching, ranking, and highlighting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNodes = searchNodes;
exports.highlightText = highlightText;
exports.filterSearchResults = filterSearchResults;
const DEFAULT_OPTIONS = {
    caseSensitive: false,
    fuzzyMatch: true,
    fuzzyThreshold: 0.6,
    searchFields: ['label', 'filePath', 'type', 'language'],
    maxResults: 100,
};
/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, // deletion
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[len1][len2];
}
/**
 * Calculate fuzzy match score (0-1, higher is better)
 */
function fuzzyScore(query, target, options) {
    if (!options.fuzzyMatch) {
        return target.includes(query) ? 1 : 0;
    }
    const distance = levenshteinDistance(query, target);
    const maxLength = Math.max(query.length, target.length);
    return 1 - (distance / maxLength);
}
/**
 * Find all match indices in a string
 */
function findMatchIndices(query, text, caseSensitive) {
    const indices = [];
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    let index = 0;
    while (true) {
        const pos = searchText.indexOf(searchQuery, index);
        if (pos === -1)
            break;
        indices.push([pos, pos + searchQuery.length]);
        index = pos + 1;
    }
    return indices;
}
/**
 * Search nodes with ranking and highlighting
 */
function searchNodes(nodes, query, options = {}) {
    if (!query.trim()) {
        return [];
    }
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const results = [];
    const searchQuery = opts.caseSensitive ? query : query.toLowerCase();
    for (const node of nodes) {
        const matchedFields = [];
        const highlights = [];
        let totalScore = 0;
        let fieldCount = 0;
        // Search in each field
        if (opts.searchFields.includes('label')) {
            const text = opts.caseSensitive ? node.label : node.label.toLowerCase();
            const score = fuzzyScore(searchQuery, text, opts);
            if (score >= opts.fuzzyThreshold) {
                matchedFields.push('label');
                totalScore += score * 2; // Label matches get higher weight
                fieldCount++;
                const indices = findMatchIndices(query, node.label, opts.caseSensitive);
                if (indices.length > 0) {
                    highlights.push({
                        field: 'label',
                        text: node.label,
                        indices,
                    });
                }
            }
        }
        if (opts.searchFields.includes('filePath') && node.filePath) {
            const text = opts.caseSensitive ? node.filePath : node.filePath.toLowerCase();
            const score = fuzzyScore(searchQuery, text, opts);
            if (score >= opts.fuzzyThreshold) {
                matchedFields.push('filePath');
                totalScore += score;
                fieldCount++;
                const indices = findMatchIndices(query, node.filePath, opts.caseSensitive);
                if (indices.length > 0) {
                    highlights.push({
                        field: 'filePath',
                        text: node.filePath,
                        indices,
                    });
                }
            }
        }
        if (opts.searchFields.includes('type')) {
            const text = opts.caseSensitive ? node.type : node.type.toLowerCase();
            if (text.includes(searchQuery)) {
                matchedFields.push('type');
                totalScore += 1;
                fieldCount++;
            }
        }
        if (opts.searchFields.includes('language') && node.language) {
            const text = opts.caseSensitive ? node.language : node.language.toLowerCase();
            if (text.includes(searchQuery)) {
                matchedFields.push('language');
                totalScore += 0.5;
                fieldCount++;
            }
        }
        if (opts.searchFields.includes('tags') && node.tags) {
            for (const tag of node.tags) {
                const text = opts.caseSensitive ? tag : tag.toLowerCase();
                if (text.includes(searchQuery)) {
                    matchedFields.push('tags');
                    totalScore += 0.8;
                    fieldCount++;
                    break; // Only count once
                }
            }
        }
        // Add to results if any matches found
        if (matchedFields.length > 0) {
            const averageScore = totalScore / Math.max(fieldCount, 1);
            results.push({
                node,
                score: averageScore,
                matchedFields,
                highlights,
            });
        }
    }
    // Sort by score (descending) and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, opts.maxResults);
}
/**
 * Highlight search query in text
 * Returns JSX-like structure for rendering
 */
function highlightText(text, indices) {
    if (indices.length === 0) {
        return [{ text, highlighted: false }];
    }
    const parts = [];
    let lastIndex = 0;
    // Sort indices by start position
    const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);
    for (const [start, end] of sortedIndices) {
        // Add non-highlighted text before this match
        if (start > lastIndex) {
            parts.push({
                text: text.substring(lastIndex, start),
                highlighted: false,
            });
        }
        // Add highlighted match
        parts.push({
            text: text.substring(start, end),
            highlighted: true,
        });
        lastIndex = end;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({
            text: text.substring(lastIndex),
            highlighted: false,
        });
    }
    return parts;
}
/**
 * Filter search results by additional criteria
 */
function filterSearchResults(results, filters) {
    let filtered = results;
    if (filters.types && filters.types.length > 0) {
        filtered = filtered.filter(r => filters.types.includes(r.node.type));
    }
    if (filters.minScore !== undefined) {
        filtered = filtered.filter(r => r.score >= filters.minScore);
    }
    if (filters.maxResults !== undefined) {
        filtered = filtered.slice(0, filters.maxResults);
    }
    return filtered;
}
//# sourceMappingURL=searchEngine.js.map