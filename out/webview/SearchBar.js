"use strict";
/**
 * SearchBar Component
 * -------------------
 * Provides a search input with results display, highlighting, and keyboard navigation.
 * Used for searching and filtering nodes in the architecture graph.
 *
 * Features:
 * - Displays search results with highlight for matches
 * - Supports keyboard navigation and selection
 * - Handles focus, scrolling, and closing
 *
 * @component
 * @param {SearchBarProps} props - Props for search query, results, selection, and callbacks
 * @returns {JSX.Element | null}
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchBar = void 0;
const react_1 = __importStar(require("react"));
const searchEngine_1 = require("./searchEngine");
const SearchBar = ({ query, onQueryChange, results, selectedIndex, onSelectResult, onNavigateToResult, onClose, isOpen, placeholder = 'Search nodes... (/ or Ctrl+F)', }) => {
    // Ref for the search input element
    const inputRef = (0, react_1.useRef)(null);
    // Ref for the results container
    const resultsRef = (0, react_1.useRef)(null);
    // Effect: Auto-focus input when search bar is opened
    (0, react_1.useEffect)(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);
    // Effect: Scroll selected result into view when selection changes
    (0, react_1.useEffect)(() => {
        if (resultsRef.current && selectedIndex >= 0) {
            const selectedElement = resultsRef.current.querySelector(`.search-result-item[data-index="${selectedIndex}"]`);
            selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);
    // Hide search bar if not open
    if (!isOpen) {
        return null;
    }
    /**
     * Handles input change event for search query
     * @param e - Input change event
     */
    const handleInputChange = (e) => {
        onQueryChange(e.target.value);
    };
    /**
     * Handles click on a search result
     * @param result - The clicked search result
     * @param index - Index of the result
     */
    const handleResultClick = (result, index) => {
        onSelectResult(index);
        onNavigateToResult(result);
    };
    const handleClear = () => {
        onQueryChange('');
        inputRef.current?.focus();
    };
    const getNodeIcon = (type) => {
        const icons = {
            file: '📄',
            directory: '📁',
            function: 'ƒ',
            class: '◆',
            module: '📦',
        };
        return icons[type] || '•';
    };
    return (react_1.default.createElement("div", { className: "search-bar-container" },
        react_1.default.createElement("div", { className: "search-bar-header" },
            react_1.default.createElement("div", { className: "search-input-wrapper" },
                react_1.default.createElement("span", { className: "search-icon" }, "\uD83D\uDD0D"),
                react_1.default.createElement("input", { ref: inputRef, type: "text", className: "search-bar-input", placeholder: placeholder, value: query, onChange: handleInputChange, autoComplete: "off" }),
                query && (react_1.default.createElement("button", { className: "search-clear-btn", onClick: handleClear, title: "Clear search" }, "\u2715")),
                onClose && (react_1.default.createElement("button", { className: "search-close-btn", onClick: onClose, title: "Close search (Esc)" }, "\u2715"))),
            query && (react_1.default.createElement("div", { className: "search-bar-stats" },
                react_1.default.createElement("span", { className: "result-count" },
                    results.length,
                    " result",
                    results.length !== 1 ? 's' : '')))),
        query && results.length > 0 && (react_1.default.createElement("div", { className: "search-results-container", ref: resultsRef }, results.map((result, index) => {
            const labelHighlight = result.highlights.find(h => h.field === 'label');
            const pathHighlight = result.highlights.find(h => h.field === 'filePath');
            const isSelected = index === selectedIndex;
            return (react_1.default.createElement("div", { key: result.node.id, "data-index": index, className: `search-result-item ${isSelected ? 'selected' : ''}`, onClick: () => handleResultClick(result, index), onMouseEnter: () => onSelectResult(index) },
                react_1.default.createElement("div", { className: "result-icon" }, getNodeIcon(result.node.type)),
                react_1.default.createElement("div", { className: "result-content" },
                    react_1.default.createElement("div", { className: "result-label" }, labelHighlight ? (react_1.default.createElement(HighlightedText, { text: labelHighlight.text, indices: labelHighlight.indices })) : (result.node.label)),
                    result.node.filePath && (react_1.default.createElement("div", { className: "result-path" }, pathHighlight ? (react_1.default.createElement(HighlightedText, { text: pathHighlight.text, indices: pathHighlight.indices })) : (result.node.filePath))),
                    react_1.default.createElement("div", { className: "result-meta" },
                        react_1.default.createElement("span", { className: "result-type" }, result.node.type),
                        result.node.language && (react_1.default.createElement(react_1.default.Fragment, null,
                            react_1.default.createElement("span", { className: "meta-separator" }, "\u2022"),
                            react_1.default.createElement("span", { className: "result-language" }, result.node.language))),
                        react_1.default.createElement("span", { className: "meta-separator" }, "\u2022"),
                        react_1.default.createElement("span", { className: "result-score" },
                            Math.round(result.score * 100),
                            "% match"))),
                isSelected && (react_1.default.createElement("div", { className: "result-indicator" }, "\u25B6"))));
        }))),
        query && results.length === 0 && (react_1.default.createElement("div", { className: "search-no-results" },
            react_1.default.createElement("span", { className: "no-results-icon" }, "\uD83D\uDD0D"),
            react_1.default.createElement("span", { className: "no-results-text" },
                "No results found for \"",
                query,
                "\""))),
        react_1.default.createElement("div", { className: "search-bar-hints" },
            react_1.default.createElement("span", { className: "hint" },
                react_1.default.createElement("kbd", null, "\u2191"),
                react_1.default.createElement("kbd", null, "\u2193"),
                " Navigate"),
            react_1.default.createElement("span", { className: "hint" },
                react_1.default.createElement("kbd", null, "Enter"),
                " Open"),
            react_1.default.createElement("span", { className: "hint" },
                react_1.default.createElement("kbd", null, "Esc"),
                " Close"))));
};
exports.SearchBar = SearchBar;
const HighlightedText = ({ text, indices }) => {
    const parts = (0, searchEngine_1.highlightText)(text, indices);
    return (react_1.default.createElement(react_1.default.Fragment, null, parts.map((part, index) => (part.highlighted ? (react_1.default.createElement("mark", { key: index, className: "search-highlight" }, part.text)) : (react_1.default.createElement("span", { key: index }, part.text))))));
};
//# sourceMappingURL=SearchBar.js.map