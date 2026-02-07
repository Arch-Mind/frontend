"use strict";
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
const react_1 = __importStar(require("react"));
const defaultFilter = {
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
const SearchFilter = ({ onFilterChange, onFocusSelection, matchCount, totalCount }) => {
    const [filter, setFilter] = (0, react_1.useState)(defaultFilter);
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const searchInputRef = (0, react_1.useRef)(null);
    // Keyboard shortcut: Ctrl+F to focus search
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
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
    const updateFilter = (0, react_1.useCallback)((updates) => {
        const newFilter = { ...filter, ...updates };
        setFilter(newFilter);
        onFilterChange(newFilter);
    }, [filter, onFilterChange]);
    const handleSearchChange = (e) => {
        updateFilter({ searchQuery: e.target.value });
    };
    const handlePathPatternChange = (e) => {
        updateFilter({ pathPattern: e.target.value });
    };
    const toggleNodeType = (type) => {
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
    return (react_1.default.createElement("div", { className: "search-filter-panel" },
        react_1.default.createElement("div", { className: "search-filter-main" },
            react_1.default.createElement("div", { className: "search-input-container" },
                react_1.default.createElement("span", { className: "search-icon" }, "\uD83D\uDD0D"),
                react_1.default.createElement("input", { ref: searchInputRef, type: "text", placeholder: "Search nodes... (Ctrl+F)", value: filter.searchQuery, onChange: handleSearchChange, className: "search-input" }),
                filter.searchQuery && (react_1.default.createElement("span", { className: "search-count" },
                    matchCount,
                    " / ",
                    totalCount))),
            react_1.default.createElement("button", { className: "filter-toggle-btn", onClick: () => setIsExpanded(!isExpanded), title: "Toggle filters" },
                react_1.default.createElement("span", null, "\u2699\uFE0F"),
                hasActiveFilters && react_1.default.createElement("span", { className: "filter-badge" }, "\u2022")),
            hasActiveFilters && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("button", { className: "focus-btn", onClick: onFocusSelection, title: "Focus on filtered results" }, "\uD83C\uDFAF Focus"),
                react_1.default.createElement("button", { className: "clear-btn", onClick: clearFilters, title: "Clear all filters" }, "\u2715")))),
        isExpanded && (react_1.default.createElement("div", { className: "search-filter-expanded" },
            react_1.default.createElement("div", { className: "filter-section" },
                react_1.default.createElement("label", { className: "filter-label" }, "Filter by Type:"),
                react_1.default.createElement("div", { className: "type-filters" }, Object.entries(filter.nodeTypes).map(([type, enabled]) => (react_1.default.createElement("button", { key: type, className: `type-filter-btn ${enabled ? 'active' : 'inactive'}`, onClick: () => toggleNodeType(type) },
                    react_1.default.createElement("span", { className: `type-icon type-${type}` },
                        type === 'file' && '📄',
                        type === 'directory' && '📁',
                        type === 'function' && 'ƒ',
                        type === 'class' && '◆',
                        type === 'module' && '📦'),
                    type))))),
            react_1.default.createElement("div", { className: "filter-section" },
                react_1.default.createElement("label", { className: "filter-label" }, "Filter by Path:"),
                react_1.default.createElement("input", { type: "text", placeholder: "e.g., src/components/* or *.tsx", value: filter.pathPattern, onChange: handlePathPatternChange, className: "path-input" })),
            react_1.default.createElement("div", { className: "filter-shortcuts" },
                react_1.default.createElement("span", { className: "shortcut-hint" },
                    react_1.default.createElement("kbd", null, "Ctrl"),
                    "+",
                    react_1.default.createElement("kbd", null, "F"),
                    " Search"),
                react_1.default.createElement("span", { className: "shortcut-hint" },
                    react_1.default.createElement("kbd", null, "Esc"),
                    " Close"))))));
};
exports.default = SearchFilter;
//# sourceMappingURL=SearchFilter.js.map