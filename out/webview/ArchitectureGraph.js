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
exports.NODE_COLORS = void 0;
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
// Layout algorithm imports
const layoutAlgorithms_1 = require("./layoutAlgorithms");
// Clustering imports (#11)
const clustering_1 = require("./clustering");
const ClusterNode_1 = require("./ClusterNode");
// Impact Analysis imports (#15)
const ImpactAnalysis_1 = require("./ImpactAnalysis");
const LocalOutline_1 = require("./LocalOutline");
// Keyboard Navigation imports (#18)
const KeyboardNavigation_1 = require("./KeyboardNavigation");
// Enhanced MiniMap imports (#19)
const EnhancedMiniMap_1 = require("./EnhancedMiniMap");
// Zoom & Pan imports (#20)
const useZoomPan_1 = require("./useZoomPan");
const ZoomControls_1 = require("./ZoomControls");
// Relationship Visualizer imports (#21)
const RelationshipVisualizer_1 = require("./RelationshipVisualizer");
// Export Modal imports
const ExportModal_1 = require("../components/ExportModal");
// Custom node types for ReactFlow
const nodeTypes = {
    clusterNode: ClusterNode_1.ClusterNode,
};
// Debounce hook for performant search on large graphs
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
// Color scheme for different node types
exports.NODE_COLORS = {
    directory: '#4a9eff',
    typescript: '#3178c6',
    javascript: '#f7df1e',
    json: '#292929',
    markdown: '#083fa1',
    css: '#264de4',
    python: '#3776ab',
    rust: '#dea584',
    go: '#00add8',
    function: '#9b59b6',
    class: '#e74c3c',
    module: '#27ae60',
    default: '#6b7280',
};
// Status colors
const STATUS_COLORS = {
    modified: '#e67e22', // Orange for modified
    added: '#2ecc71', // Green for added
    deleted: '#e74c3c', // Red for deleted
};
// Get color based on node type/language
function getNodeColor(node) {
    if (node.status && node.status !== 'unchanged' && STATUS_COLORS[node.status]) {
        return STATUS_COLORS[node.status];
    }
    if (node.type === 'directory')
        return exports.NODE_COLORS.directory;
    if (node.type === 'function')
        return exports.NODE_COLORS.function;
    if (node.type === 'class')
        return exports.NODE_COLORS.class;
    if (node.type === 'module')
        return exports.NODE_COLORS.module;
    if (node.language)
        return exports.NODE_COLORS[node.language] || exports.NODE_COLORS.default;
    return exports.NODE_COLORS.default;
}
// Check if a node matches the search filters
function matchesFilters(node, filters) {
    const { searchTerm, nodeTypes, languages, pathPattern } = filters;
    // Filter by node type (if any selected)
    if (nodeTypes.length > 0 && !nodeTypes.includes(node.type)) {
        return false;
    }
    // Filter by language (if any selected)
    // Only applies to nodes that have a language property (files, functions, classes)
    if (languages.length > 0) {
        if (!node.language || !languages.includes(node.language)) {
            // If it's a directory, we might want to show it if it contains matching files?
            // For now, strict filtering: if language filter is active, only show nodes of that language.
            // Directories usually don't have a specific language, so they might be hidden unless we handle them.
            // Let's say directories match if their children match? No, that's complex path filtering.
            // Simple rule: If language filter is on, hide anything that isn't that language.
            // BUT: Directories don't have language. Maybe we should always show directories? 
            // Or only if node.language is present.
            if (node.type !== 'directory') {
                return false;
            }
            // For directories, we default to hidden if we are strictly filtering by language?
            // Actually, usually users want to see the structure. 
            // Let's decide: strict filtering hides directories.
            return false;
        }
    }
    // Filter by path pattern (glob-like matching)
    if (pathPattern) {
        // Normalize paths: convert backslashes to forward slashes for consistent matching
        const normalizedNodePath = node.id.replace(/\\/g, '/').toLowerCase();
        const normalizedPattern = pathPattern.replace(/\\/g, '/').toLowerCase();
        // Convert glob pattern to regex
        const regexPattern = normalizedPattern
            .replace(/[.+^${}()|[\]]/g, '\\$&') // Escape special regex chars except * and ?
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        // Match anywhere in the path (not just from start)
        const regex = new RegExp(regexPattern, 'i');
        if (!regex.test(normalizedNodePath)) {
            return false;
        }
    }
    // Filter by search term (matches label or id)
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesLabel = node.label.toLowerCase().includes(term);
        const matchesId = node.id.toLowerCase().includes(term);
        if (!matchesLabel && !matchesId) {
            return false;
        }
    }
    return true;
}
// Node dimensions for layout
const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;
// Calculate matching node IDs based on filters
function calculateMatchingNodeIds(nodes, edges, filters) {
    const matchingNodeIds = new Set();
    const { searchTerm, nodeTypes, languages, pathPattern, showNeighbors } = filters;
    const hasActiveFilter = searchTerm || nodeTypes.length > 0 || languages.length > 0 || pathPattern;
    if (!hasActiveFilter) {
        return matchingNodeIds; // Empty set means everything matches (or is handled by caller)
    }
    // Pass 1: Direct matches
    nodes.forEach(node => {
        if (matchesFilters(node, filters)) {
            matchingNodeIds.add(node.id);
        }
    });
    // Pass 2: Neighbors (if enabled)
    if (showNeighbors && matchingNodeIds.size > 0) {
        // Find all edges connected to matching nodes
        // We iterate edges to find neighbors
        // This acts as "bfs" of depth 1
        const neighborIds = new Set();
        edges.forEach(edge => {
            if (matchingNodeIds.has(edge.source)) {
                neighborIds.add(edge.target);
            }
            if (matchingNodeIds.has(edge.target)) {
                neighborIds.add(edge.source);
            }
        });
        // Add neighbors to matching set
        neighborIds.forEach(id => matchingNodeIds.add(id));
    }
    return matchingNodeIds;
}
// Create styled ReactFlow node from RawNode and position
function createStyledNode(node, position, isMatching, isSelected) {
    const color = getNodeColor(node);
    const isChanged = node.status && node.status !== 'unchanged';
    return {
        id: node.id,
        data: {
            label: node.label + (isChanged ? ` (${node.status})` : ''),
            type: node.type,
            language: node.language,
            extension: node.extension,
            filePath: node.filePath || node.id,
            lineNumber: node.lineNumber,
            endLineNumber: node.endLineNumber,
            status: node.status, // Pass status to data
        },
        position,
        style: {
            background: node.type === 'directory'
                ? `${color}20`
                : 'var(--am-panel-bg)',
            color: 'var(--am-panel-fg)',
            borderColor: isSelected ? 'var(--am-accent)' : color,
            borderWidth: isSelected ? 3 : (node.type === 'directory' ? 2 : 1),
            borderRadius: node.type === 'directory' ? 8 : 4,
            opacity: isMatching ? 1 : 0.3,
            boxShadow: isSelected ? '0 0 10px var(--am-accent)' : undefined,
            borderStyle: isChanged ? 'dashed' : 'solid', // Dashed border for changed files
        },
        className: isMatching ? 'matching-node' : 'dimmed-node',
    };
}
// Hierarchical layout algorithm (original built-in)
function calculateHierarchicalLayout(nodes, edges, filters, selectedNodeId) {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;
    // Group nodes by depth
    const nodesByDepth = new Map();
    nodes.forEach(node => {
        const depthNodes = nodesByDepth.get(node.depth) || [];
        depthNodes.push(node);
        nodesByDepth.set(node.depth, depthNodes);
    });
    const layoutedNodes = [];
    const horizontalSpacing = 220;
    const verticalSpacing = 80;
    nodesByDepth.forEach((depthNodes, depth) => {
        const totalWidth = depthNodes.length * horizontalSpacing;
        const startX = -totalWidth / 2;
        depthNodes.forEach((node, index) => {
            const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
            const isSelected = selectedNodeId === node.id;
            layoutedNodes.push(createStyledNode(node, { x: startX + index * horizontalSpacing, y: depth * verticalSpacing }, isMatching, isSelected));
        });
    });
    return { layoutedNodes, matchingNodeIds };
}
// Dagre layout algorithm
function calculateDagreLayout(nodes, edges, filters, selectedNodeId, direction) {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;
    const layoutNodes = nodes.map(n => ({
        id: n.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        depth: n.depth,
    }));
    const layoutEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
    }));
    const result = (0, layoutAlgorithms_1.dagreLayout)(layoutNodes, layoutEdges, direction);
    const layoutedNodes = nodes.map(node => {
        const position = result.nodes.get(node.id) || { x: 0, y: 0 };
        const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        return createStyledNode(node, position, isMatching, isSelected);
    });
    return { layoutedNodes, matchingNodeIds };
}
// ELK layout algorithm (async)
async function calculateElkLayout(nodes, edges, filters, selectedNodeId, algorithm) {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;
    const layoutNodes = nodes.map(n => ({
        id: n.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        depth: n.depth,
    }));
    const layoutEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
    }));
    const result = await (0, layoutAlgorithms_1.elkLayout)(layoutNodes, layoutEdges, algorithm);
    const layoutedNodes = nodes.map(node => {
        const position = result.nodes.get(node.id) || { x: 0, y: 0 };
        const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        return createStyledNode(node, position, isMatching, isSelected);
    });
    return { layoutedNodes, matchingNodeIds };
}
// Main layout calculation function
async function calculateLayout(layoutType, nodes, edges, filters, selectedNodeId) {
    switch (layoutType) {
        case 'dagre-tb':
            return calculateDagreLayout(nodes, edges, filters, selectedNodeId, 'TB');
        case 'dagre-lr':
            return calculateDagreLayout(nodes, edges, filters, selectedNodeId, 'LR');
        case 'elk-layered':
            return calculateElkLayout(nodes, edges, filters, selectedNodeId, 'layered');
        case 'elk-force':
            return calculateElkLayout(nodes, edges, filters, selectedNodeId, 'force');
        case 'hierarchical':
        default:
            return calculateHierarchicalLayout(nodes, edges, filters, selectedNodeId);
    }
}
// Format edges with proper styling
function formatEdges(rawEdges, selectedNodeId, matchingNodeIds) {
    return rawEdges.map(edge => {
        const isConnectedToSelected = selectedNodeId !== null &&
            (edge.source === selectedNodeId || edge.target === selectedNodeId);
        const isMatching = matchingNodeIds.size === 0 ||
            (matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target));
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            animated: isConnectedToSelected ? true : false,
            style: {
                stroke: isConnectedToSelected
                    ? 'var(--am-accent)'
                    : 'var(--am-fg)',
                strokeWidth: isConnectedToSelected ? 2 : 1,
                opacity: isMatching ? (isConnectedToSelected ? 0.9 : 0.5) : 0.15,
            },
        };
    });
}
const StatsDisplay = ({ stats, source = 'local' }) => {
    if (!stats)
        return null;
    return (react_1.default.createElement("div", { className: "stats-panel" },
        react_1.default.createElement("div", { className: "source-badge", style: {
                backgroundColor: source === 'backend' ? '#27ae60' : '#3498db',
            } }, source === 'backend' ? '🌐 Backend (Neo4j)' : '📁 Local'),
        react_1.default.createElement("div", { className: "stat-item" },
            react_1.default.createElement("span", { className: "stat-label" }, "Files:"),
            react_1.default.createElement("span", { className: "stat-value" }, stats.totalFiles)),
        react_1.default.createElement("div", { className: "stat-item" },
            react_1.default.createElement("span", { className: "stat-label" }, "Directories:"),
            react_1.default.createElement("span", { className: "stat-value" }, stats.totalDirectories)),
        stats.totalFunctions !== undefined && stats.totalFunctions > 0 && (react_1.default.createElement("div", { className: "stat-item" },
            react_1.default.createElement("span", { className: "stat-label" }, "Functions:"),
            react_1.default.createElement("span", { className: "stat-value" }, stats.totalFunctions))),
        stats.totalClasses !== undefined && stats.totalClasses > 0 && (react_1.default.createElement("div", { className: "stat-item" },
            react_1.default.createElement("span", { className: "stat-label" }, "Classes:"),
            react_1.default.createElement("span", { className: "stat-value" }, stats.totalClasses))),
        Object.entries(stats.filesByLanguage).length > 0 && (react_1.default.createElement("div", { className: "stat-languages" }, Object.entries(stats.filesByLanguage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([lang, count]) => (react_1.default.createElement("span", { key: lang, className: "language-badge", style: {
                backgroundColor: exports.NODE_COLORS[lang] || exports.NODE_COLORS.default,
            } },
            lang,
            ": ",
            count)))))));
};
const SearchPanel = ({ filters, onFiltersChange, matchCount, totalCount, onFocusSelection, isVisible, onClose, availableLanguages }) => {
    const searchInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (isVisible && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isVisible]);
    if (!isVisible)
        return null;
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;
    const toggleNodeType = (type) => {
        const current = filters.nodeTypes;
        if (current.includes(type)) {
            onFiltersChange({ ...filters, nodeTypes: current.filter(t => t !== type) });
        }
        else {
            onFiltersChange({ ...filters, nodeTypes: [...current, type] });
        }
    };
    const toggleLanguage = (lang) => {
        const current = filters.languages;
        if (current.includes(lang)) {
            onFiltersChange({ ...filters, languages: current.filter(l => l !== lang) });
        }
        else {
            onFiltersChange({ ...filters, languages: [...current, lang] });
        }
    };
    return (react_1.default.createElement("div", { className: "search-panel" },
        react_1.default.createElement("div", { className: "search-header" },
            react_1.default.createElement("span", { className: "search-title" }, "\uD83D\uDD0D Search & Filter"),
            react_1.default.createElement("button", { className: "search-close", onClick: onClose, title: "Close (Esc)" }, "\u00D7")),
        react_1.default.createElement("div", { className: "search-field" },
            react_1.default.createElement("label", null, "Search by name:"),
            react_1.default.createElement("input", { ref: searchInputRef, type: "text", placeholder: "Enter file/function name...", value: filters.searchTerm, onChange: (e) => onFiltersChange({ ...filters, searchTerm: e.target.value }), className: "search-input" })),
        react_1.default.createElement("div", { className: "search-field" },
            react_1.default.createElement("label", null, "Path pattern:"),
            react_1.default.createElement("input", { type: "text", placeholder: "e.g., src/*.ts, **/utils/*", value: filters.pathPattern, onChange: (e) => onFiltersChange({ ...filters, pathPattern: e.target.value }), className: "search-input" })),
        react_1.default.createElement("div", { className: "search-section" },
            react_1.default.createElement("label", null, "Filter by Type:"),
            react_1.default.createElement("div", { className: "checkbox-group" }, ['file', 'directory', 'function', 'class', 'module'].map(type => (react_1.default.createElement("label", { key: type, className: "checkbox-label" },
                react_1.default.createElement("input", { type: "checkbox", checked: filters.nodeTypes.includes(type), onChange: () => toggleNodeType(type) }),
                type.charAt(0).toUpperCase() + type.slice(1)))))),
        availableLanguages.length > 0 && (react_1.default.createElement("div", { className: "search-section" },
            react_1.default.createElement("label", null, "Filter by Language:"),
            react_1.default.createElement("div", { className: "checkbox-group" }, availableLanguages.map(lang => (react_1.default.createElement("label", { key: lang, className: "checkbox-label" },
                react_1.default.createElement("input", { type: "checkbox", checked: filters.languages.includes(lang), onChange: () => toggleLanguage(lang) }),
                lang)))))),
        react_1.default.createElement("div", { className: "search-field toggle-field" },
            react_1.default.createElement("label", { className: "checkbox-label" },
                react_1.default.createElement("input", { type: "checkbox", checked: filters.showNeighbors, onChange: (e) => onFiltersChange({ ...filters, showNeighbors: e.target.checked }) }),
                "Show Reachable Neighbors")),
        react_1.default.createElement("div", { className: "search-results" }, hasActiveFilter ? (react_1.default.createElement("span", { className: "result-count" },
            "Found ",
            react_1.default.createElement("strong", null, matchCount),
            " of ",
            totalCount,
            " nodes")) : (react_1.default.createElement("span", { className: "result-count" },
            "Showing all ",
            totalCount,
            " nodes"))),
        react_1.default.createElement("div", { className: "search-actions" },
            react_1.default.createElement("button", { className: "search-btn", onClick: onFocusSelection, disabled: matchCount === 0, title: "Zoom to show all matching nodes" }, "\uD83D\uDCCD Focus on Results"),
            react_1.default.createElement("button", { className: "search-btn secondary", onClick: () => onFiltersChange({
                    searchTerm: '',
                    nodeTypes: [],
                    languages: [],
                    pathPattern: '',
                    showNeighbors: false
                }), disabled: !hasActiveFilter }, "Clear Filters")),
        react_1.default.createElement("div", { className: "search-hint" },
            react_1.default.createElement("kbd", null, "Ctrl"),
            "+",
            react_1.default.createElement("kbd", null, "F"),
            " to toggle search"),
        react_1.default.createElement("style", null, `
                .search-section { margin-bottom: 12px; }
                .checkbox-group { 
                    display: flex; 
                    flex-wrap: wrap; 
                    gap: 8px; 
                    margin-top: 4px;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    background: var(--am-bg-lighter);
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid var(--am-border);
                }
                .checkbox-label:hover { background: var(--am-bg-hover); }
                .toggle-field { margin-top: 8px; }
            `)));
};
const NodeTooltip = ({ node, position }) => {
    if (!node)
        return null;
    const data = node.data;
    return (react_1.default.createElement("div", { className: "node-tooltip", style: {
            left: position.x + 10,
            top: position.y + 10,
        } },
        react_1.default.createElement("div", { className: "tooltip-header" },
            react_1.default.createElement("span", { className: "tooltip-icon" }, data.type === 'directory' ? '📁' :
                data.type === 'function' ? '⚡' :
                    data.type === 'class' ? '🏷️' : '📄'),
            react_1.default.createElement("span", { className: "tooltip-label" }, data.label)),
        react_1.default.createElement("div", { className: "tooltip-details" },
            react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("span", { className: "tooltip-key" }, "Path:"),
                react_1.default.createElement("span", { className: "tooltip-value" }, data.filePath || node.id)),
            data.lineNumber && (react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("span", { className: "tooltip-key" }, "Line:"),
                react_1.default.createElement("span", { className: "tooltip-value" },
                    data.lineNumber,
                    data.endLineNumber ? ` - ${data.endLineNumber}` : ''))),
            data.language && (react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("span", { className: "tooltip-key" }, "Language:"),
                react_1.default.createElement("span", { className: "tooltip-value" }, data.language))),
            react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("span", { className: "tooltip-key" }, "Type:"),
                react_1.default.createElement("span", { className: "tooltip-value" }, data.type))),
        react_1.default.createElement("div", { className: "tooltip-hint" }, "Click to open \u2022 Right-click for actions")));
};
const ContextMenu = ({ node, position, onAction, onClose }) => {
    const menuRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    if (!node)
        return null;
    const isFile = node.data.type === 'file' || node.data.type === 'function' || node.data.type === 'class';
    return (react_1.default.createElement("div", { ref: menuRef, className: "context-menu", style: { left: position.x, top: position.y } },
        react_1.default.createElement("div", { className: "context-menu-header" }, node.data.label),
        react_1.default.createElement("div", { className: "context-menu-divider" }),
        isFile && (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('open') }, "\uD83D\uDCC4 Open File"),
            react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('goToDefinition') }, "\uD83C\uDFAF Go to Definition"),
            react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('findReferences') }, "\uD83D\uDD17 Find References"),
            react_1.default.createElement("div", { className: "context-menu-divider" }))),
        react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('revealInExplorer') }, "\uD83D\uDCC2 Reveal in Explorer"),
        react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('copyPath') }, "\uD83D\uDCCB Copy Path"),
        react_1.default.createElement("div", { className: "context-menu-divider" }),
        react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('analyzeImpact') }, "\uD83D\uDCA5 Analyze Impact"),
        react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('showRelationships') }, "\uD83D\uDD17 Show Relationships")));
};
const LayoutPanel = ({ currentLayout, onLayoutChange, isLayouting, isVisible, onClose, }) => {
    if (!isVisible)
        return null;
    return (react_1.default.createElement("div", { className: "layout-panel" },
        react_1.default.createElement("div", { className: "layout-header" },
            react_1.default.createElement("span", { className: "layout-title" }, "\uD83D\uDCD0 Layout Algorithm"),
            react_1.default.createElement("button", { className: "layout-close", onClick: onClose, title: "Close" }, "\u00D7")),
        react_1.default.createElement("div", { className: "layout-options" }, layoutAlgorithms_1.LAYOUT_OPTIONS.map((option) => (react_1.default.createElement("button", { key: option.value, className: `layout-option ${currentLayout === option.value ? 'active' : ''}`, onClick: () => onLayoutChange(option.value), disabled: isLayouting, title: option.description },
            react_1.default.createElement("span", { className: "layout-option-label" }, option.label),
            currentLayout === option.value && react_1.default.createElement("span", { className: "layout-check" }, "\u2713"))))),
        isLayouting && (react_1.default.createElement("div", { className: "layout-loading" },
            react_1.default.createElement("div", { className: "loading-spinner-small" }),
            react_1.default.createElement("span", null, "Calculating layout..."))),
        react_1.default.createElement("div", { className: "layout-hint" },
            react_1.default.createElement("kbd", null, "Ctrl"),
            "+",
            react_1.default.createElement("kbd", null, "L"),
            " to toggle layout panel")));
};
// Inner component that uses ReactFlow hooks
const ArchitectureGraphInner = () => {
    // VS Code API reference - memoized to call only once
    const vscode = (0, react_1.useMemo)(() => acquireVsCodeApi(), []);
    const vscodeRef = (0, react_1.useRef)(vscode); // Keep ref for backward compatibility in callbacks
    const state = vscode.getState() || {};
    const [nodes, setNodes, onNodesChange] = (0, reactflow_1.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)([]);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [loadingMessage, setLoadingMessage] = (0, react_1.useState)('Analyzing workspace structure...');
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const [dataSource, setDataSource] = (0, react_1.useState)('local');
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    // Search and filter state - initialized from persistence
    const [searchVisible, setSearchVisible] = (0, react_1.useState)(false);
    const [filters, setFilters] = (0, react_1.useState)(state.filters || {
        searchTerm: '',
        nodeTypes: [],
        languages: [],
        pathPattern: '',
        showNeighbors: false,
    });
    // Debounce filters for performance on large graphs (200ms delay)
    const debouncedFilters = useDebounce(filters, 200);
    // Tooltip state
    const [hoveredNode, setHoveredNode] = (0, react_1.useState)(null);
    const [tooltipPosition, setTooltipPosition] = (0, react_1.useState)({ x: 0, y: 0 });
    // Context menu state
    const [contextMenuNode, setContextMenuNode] = (0, react_1.useState)(null);
    const [contextMenuPosition, setContextMenuPosition] = (0, react_1.useState)({ x: 0, y: 0 });
    // Store raw data for re-filtering
    const [rawData, setRawData] = (0, react_1.useState)(null);
    const [matchingNodeIds, setMatchingNodeIds] = (0, react_1.useState)(new Set());
    // Local Outline State
    const [localSymbols, setLocalSymbols] = (0, react_1.useState)([]);
    const [localFileName, setLocalFileName] = (0, react_1.useState)('');
    const [localOutlineVisible, setLocalOutlineVisible] = (0, react_1.useState)(true);
    // Layout state - initialized from persistence
    const [layoutType, setLayoutType] = (0, react_1.useState)(state.layoutType || 'hierarchical');
    const [layoutPanelVisible, setLayoutPanelVisible] = (0, react_1.useState)(false);
    const [isLayouting, setIsLayouting] = (0, react_1.useState)(false);
    // Persist state when filters or layout change
    (0, react_1.useEffect)(() => {
        vscode.setState({ filters, layoutType });
    }, [filters, layoutType, vscode]);
    // Clustering state (#11)
    const [clusters, setClusters] = (0, react_1.useState)([]);
    const [clusterState, setClusterState] = (0, react_1.useState)({});
    const [clusteringEnabled, setClusteringEnabled] = (0, react_1.useState)(false);
    // Impact Analysis state (#15)
    const [impactData, setImpactData] = (0, react_1.useState)(null);
    const [impactVisible, setImpactVisible] = (0, react_1.useState)(false);
    // Keyboard Navigation state (#18)
    const [keyboardHelpVisible, setKeyboardHelpVisible] = (0, react_1.useState)(false);
    // Relationship Visualizer state (#21)
    const [relationshipVisible, setRelationshipVisible] = (0, react_1.useState)(false);
    // Export Menu state
    const [exportMenuVisible, setExportMenuVisible] = (0, react_1.useState)(false);
    const reactFlowWrapperRef = (0, react_1.useRef)(null);
    // ReactFlow instance for programmatic control
    const reactFlowInstance = (0, reactflow_1.useReactFlow)();
    // Zoom & Pan controls (#20)
    const zoomPan = (0, useZoomPan_1.useZoomPan)({ minZoom: 0.1, maxZoom: 4.0 });
    (0, useZoomPan_1.useZoomPanKeyboard)(zoomPan);
    // Mini-map click navigation (#19)
    const { handleMiniMapNodeClick } = (0, EnhancedMiniMap_1.useMiniMapNavigation)((nodeId) => {
        setSelectedNode(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            reactFlowInstance.setCenter(node.position.x + (NODE_WIDTH / 2), node.position.y + (NODE_HEIGHT / 2), { zoom: 1, duration: 300 });
        }
    });
    // (Removed duplicate vscodeRef init)
    // ... (onConnect, mouse handlers...)
    const onConnect = (0, react_1.useCallback)((params) => setEdges((eds) => (0, reactflow_1.addEdge)(params, eds)), [setEdges]);
    // Handle node click - open file in VS Code
    const onNodeClick = (0, react_1.useCallback)((event, node) => {
        setSelectedNode(node.id);
        setContextMenuNode(null);
        // Open file in VS Code
        if (vscodeRef.current && node.data.type !== 'directory') {
            vscodeRef.current.postMessage({
                command: 'openFile',
                filePath: node.data.filePath || node.id,
                lineNumber: node.data.lineNumber,
            });
        }
    }, []);
    // ... (rest of handlers)
    // Handle node right-click - show context menu
    const onNodeContextMenu = (0, react_1.useCallback)((event, node) => {
        event.preventDefault();
        setContextMenuNode(node);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
    }, []);
    // Handle node hover
    const onNodeMouseEnter = (0, react_1.useCallback)((event, node) => {
        setHoveredNode(node);
        setTooltipPosition({ x: event.clientX, y: event.clientY });
    }, []);
    const onNodeMouseLeave = (0, react_1.useCallback)(() => {
        setHoveredNode(null);
    }, []);
    // Handle context menu actions
    const handleContextMenuAction = (0, react_1.useCallback)((action) => {
        if (!contextMenuNode || !vscodeRef.current)
            return;
        // ... (implementation same as before)
        const filePath = contextMenuNode.data.filePath || contextMenuNode.id;
        const lineNumber = contextMenuNode.data.lineNumber;
        switch (action) {
            case 'open':
                vscodeRef.current.postMessage({
                    command: 'openFile',
                    filePath,
                    lineNumber,
                });
                break;
            case 'goToDefinition':
                vscodeRef.current.postMessage({
                    command: 'goToDefinition',
                    filePath,
                    lineNumber,
                });
                break;
            case 'findReferences':
                vscodeRef.current.postMessage({
                    command: 'findReferences',
                    filePath,
                    lineNumber,
                });
                break;
            case 'revealInExplorer':
                vscodeRef.current.postMessage({
                    command: 'revealInExplorer',
                    filePath,
                });
                break;
            case 'copyPath':
                vscodeRef.current.postMessage({
                    command: 'copyPath',
                    filePath,
                });
                break;
            case 'analyzeImpact':
                // Perform local impact analysis based on edges
                if (rawData) {
                    const affectedNodes = [];
                    const visited = new Set();
                    const queue = [{ id: contextMenuNode.id, distance: 0 }];
                    visited.add(contextMenuNode.id);
                    while (queue.length > 0) {
                        const current = queue.shift();
                        if (current.distance > 0) {
                            affectedNodes.push({
                                nodeId: current.id,
                                distance: current.distance,
                                impactType: current.distance === 1 ? 'direct' : 'indirect',
                            });
                        }
                        if (current.distance < 3) {
                            rawData.edges.forEach(edge => {
                                const neighbor = edge.source === current.id ? edge.target :
                                    edge.target === current.id ? edge.source : null;
                                if (neighbor && !visited.has(neighbor)) {
                                    visited.add(neighbor);
                                    queue.push({ id: neighbor, distance: current.distance + 1 });
                                }
                            });
                        }
                    }
                    setImpactData({
                        sourceNodeId: contextMenuNode.id,
                        affectedNodes,
                        maxDepth: Math.max(0, ...affectedNodes.map(n => n.distance)),
                        totalImpact: affectedNodes.length,
                    });
                    setImpactVisible(true);
                }
                break;
            case 'showRelationships':
                setSelectedNode(contextMenuNode.id);
                setRelationshipVisible(true);
                break;
        }
        setContextMenuNode(null);
    }, [contextMenuNode, rawData]);
    // Focus on filtered/matching nodes
    const handleFocusSelection = (0, react_1.useCallback)(() => {
        if (matchingNodeIds.size === 0)
            return;
        const matchingNodes = nodes.filter(n => matchingNodeIds.has(n.id));
        if (matchingNodes.length > 0) {
            reactFlowInstance.fitView({
                nodes: matchingNodes,
                padding: 0.3,
                duration: 500,
            });
        }
    }, [matchingNodeIds, nodes, reactFlowInstance]);
    // Keyboard shortcuts
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Ctrl+F / Cmd+F to toggle search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setSearchVisible(prev => !prev);
            }
            // Ctrl+L / Cmd+L to toggle layout panel
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                setLayoutPanelVisible(prev => !prev);
            }
            // Ctrl+E / Cmd+E to toggle export menu
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setExportMenuVisible(prev => !prev);
            }
            // Escape to close search, context menu, layout panel, or export menu
            if (e.key === 'Escape') {
                setSearchVisible(false);
                setContextMenuNode(null);
                setLayoutPanelVisible(false);
                setExportMenuVisible(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    // Update graph when debounced filters, layout type, or selection change
    // ... (same as before)
    (0, react_1.useEffect)(() => {
        // ... (runLayout implementation)
        if (!rawData)
            return;
        const { nodes: rawNodes, edges: rawEdges } = rawData;
        // Use async layout calculation
        const runLayout = async () => {
            setIsLayouting(true);
            try {
                const { layoutedNodes, matchingNodeIds: newMatchingIds } = await calculateLayout(layoutType, rawNodes, rawEdges, debouncedFilters, selectedNode);
                const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);
                setNodes(layoutedNodes);
                setEdges(formattedEdges);
                setMatchingNodeIds(newMatchingIds);
            }
            catch (error) {
                console.error('Layout calculation failed:', error);
            }
            finally {
                setIsLayouting(false);
            }
        };
        runLayout();
    }, [debouncedFilters, selectedNode, rawData, layoutType, setNodes, setEdges]);
    // Message handling
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            // ... (message handling logic same as before)
            const message = event.data;
            // Handle loading state
            if (message.command === 'loading') {
                setIsLoading(true);
                setLoadingMessage(message.message || 'Loading...');
                setErrorMessage(null);
                return;
            }
            // Handle error state
            if (message.command === 'error') {
                setIsLoading(false);
                setErrorMessage(message.message || 'An error occurred');
                return;
            }
            // Handle no data state
            if (message.command === 'noData') {
                setIsLoading(false);
                setErrorMessage(message.message || 'No data available');
                return;
            }
            if (message.command === 'architectureData') {
                setErrorMessage(null);
                const data = message.data;
                setRawData(data);
                setDataSource(data.source || 'local');
                const { nodes: rawNodes, edges: rawEdges, stats: graphStats } = data;
                // Apply initial layout asynchronously
                const initLayout = async () => {
                    try {
                        const { layoutedNodes, matchingNodeIds: newMatchingIds } = await calculateLayout(layoutType, rawNodes, rawEdges, debouncedFilters, selectedNode);
                        const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);
                        setNodes(layoutedNodes);
                        setEdges(formattedEdges);
                        setStats(graphStats);
                        setMatchingNodeIds(newMatchingIds);
                        setIsLoading(false);
                    }
                    catch (error) {
                        console.error('Initial layout failed:', error);
                        setIsLoading(false);
                    }
                };
                initLayout();
            }
            // Handle impact analysis response
            if (message.command === 'impactAnalysis') {
                console.log('Impact analysis data:', message.data);
                // TODO: Highlight impacted nodes in the graph
            }
            // Handle local parsed data
            if (message.command === 'localData') {
                const { symbols, fileName } = message.data;
                setLocalSymbols(symbols);
                setLocalFileName(fileName);
                setLocalOutlineVisible(true);
            }
        };
        window.addEventListener('message', handleMessage);
        // Request data (using stable vscode instance)
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [setNodes, setEdges, vscode, debouncedFilters, layoutType, selectedNode]);
    // Memoize minimap node color function
    const minimapNodeColor = (0, react_1.useCallback)((node) => {
        if (node.data?.type === 'directory')
            return exports.NODE_COLORS.directory;
        if (node.data?.type === 'function')
            return exports.NODE_COLORS.function;
        if (node.data?.type === 'class')
            return exports.NODE_COLORS.class;
        if (node.data?.language)
            return exports.NODE_COLORS[node.data.language] || exports.NODE_COLORS.default;
        return exports.NODE_COLORS.default;
    }, []);
    // Clustering logic (#11) - compute clusters when rawData changes
    (0, react_1.useEffect)(() => {
        if (!rawData || rawData.nodes.length < 20) {
            setClusters([]);
            setClusteringEnabled(false);
            return;
        }
        const computed = (0, clustering_1.clusterNodesByDirectory)(rawData.nodes, 5, 3);
        setClusters(computed);
        setClusteringEnabled(computed.length > 0);
    }, [rawData]);
    // Handle cluster toggle
    const handleClusterToggle = (0, react_1.useCallback)((clusterId) => {
        setClusterState(prev => (0, clustering_1.toggleCluster)(clusterId, prev));
    }, []);
    // Keyboard Navigation (#18)
    const getConnectedNodes = (0, react_1.useCallback)((nodeId) => {
        if (!rawData)
            return [];
        const connected = [];
        rawData.edges.forEach(edge => {
            if (edge.source === nodeId)
                connected.push(edge.target);
            if (edge.target === nodeId)
                connected.push(edge.source);
        });
        return connected;
    }, [rawData]);
    const handleNodeActivate = (0, react_1.useCallback)((nodeId) => {
        if (vscodeRef.current) {
            const rawNode = rawData?.nodes.find(n => n.id === nodeId);
            if (rawNode && rawNode.type !== 'directory') {
                vscodeRef.current.postMessage({
                    command: 'openFile',
                    filePath: rawNode.filePath || rawNode.id,
                    lineNumber: rawNode.lineNumber,
                });
            }
        }
    }, [rawData]);
    (0, KeyboardNavigation_1.useKeyboardNavigation)({
        nodes: rawData?.nodes || [],
        onNodeSelect: (nodeId) => {
            setSelectedNode(nodeId);
            // Center on selected node
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                reactFlowInstance.setCenter(node.position.x + (NODE_WIDTH / 2), node.position.y + (NODE_HEIGHT / 2), { zoom: 1, duration: 300 });
            }
        },
        onNodeActivate: handleNodeActivate,
        getCurrentNodeId: () => selectedNode,
        getConnectedNodes,
        onFocusSearch: () => setSearchVisible(true),
        onShowHelp: () => setKeyboardHelpVisible(true),
    });
    // Relationship nodes for the visualizer (#21)
    const relationshipNodes = (0, react_1.useMemo)(() => {
        if (!rawData)
            return [];
        return rawData.nodes.map(n => ({
            id: n.id,
            type: n.type,
            parentId: n.parentId,
            filePath: n.filePath,
        }));
    }, [rawData]);
    const relationshipEdges = (0, react_1.useMemo)(() => {
        if (!rawData)
            return [];
        return rawData.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
        }));
    }, [rawData]);
    // Retry loading / trigger backend analysis
    const handleRetry = (0, react_1.useCallback)(() => {
        if (vscodeRef.current) {
            setErrorMessage(null);
            setIsLoading(true);
            setLoadingMessage('Retrying...');
            vscodeRef.current.postMessage({ command: 'requestArchitecture' });
        }
    }, []);
    const handleAnalyzeWithBackend = (0, react_1.useCallback)(() => {
        if (vscodeRef.current) {
            setErrorMessage(null);
            vscodeRef.current.postMessage({ command: 'analyzeRepository' });
        }
    }, []);
    // Calculate available languages from stats
    const availableLanguages = (0, react_1.useMemo)(() => {
        if (!stats || !stats.filesByLanguage)
            return [];
        return Object.keys(stats.filesByLanguage).sort();
    }, [stats]);
    // Show error state
    if (errorMessage) {
        return (react_1.default.createElement("div", { className: "error-container" },
            react_1.default.createElement("div", { className: "error-icon" }, "\u26A0\uFE0F"),
            react_1.default.createElement("h3", null, "Error"),
            react_1.default.createElement("p", { className: "error-message" }, errorMessage),
            react_1.default.createElement("div", { className: "error-actions" },
                react_1.default.createElement("button", { className: "retry-button", onClick: handleRetry }, "Retry Local Analysis"),
                react_1.default.createElement("button", { className: "backend-button", onClick: handleAnalyzeWithBackend }, "Analyze with Backend"))));
    }
    if (isLoading) {
        return (react_1.default.createElement("div", { className: "loading-container" },
            react_1.default.createElement("div", { className: "loading-spinner" }),
            react_1.default.createElement("p", null, loadingMessage)));
    }
    return (react_1.default.createElement("div", { ref: reactFlowWrapperRef, style: { width: '100%', height: '100%', position: 'relative' } },
        react_1.default.createElement(StatsDisplay, { stats: stats, source: dataSource }),
        react_1.default.createElement(SearchPanel, { filters: filters, onFiltersChange: setFilters, matchCount: matchingNodeIds.size > 0 ? matchingNodeIds.size : (filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern ? 0 : rawData?.nodes.length || 0), totalCount: rawData?.nodes.length || 0, onFocusSelection: handleFocusSelection, isVisible: searchVisible, onClose: () => setSearchVisible(false), availableLanguages: availableLanguages }),
        !searchVisible && (react_1.default.createElement("button", { className: "search-toggle-btn", onClick: () => setSearchVisible(true), title: "Search & Filter (Ctrl+F)" }, "\uD83D\uDD0D")),
        react_1.default.createElement(LayoutPanel, { currentLayout: layoutType, onLayoutChange: setLayoutType, isLayouting: isLayouting, isVisible: layoutPanelVisible, onClose: () => setLayoutPanelVisible(false) }),
        !layoutPanelVisible && (react_1.default.createElement("button", { className: "layout-toggle-btn", onClick: () => setLayoutPanelVisible(true), title: "Layout Algorithm (Ctrl+L)" }, "\uD83D\uDCD0")),
        !exportMenuVisible && (react_1.default.createElement("button", { className: "export-toggle-btn", onClick: () => setExportMenuVisible(true), title: "Export Graph (Ctrl+E)" }, "\uD83D\uDCE5")),
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: onNodeClick, onNodeContextMenu: onNodeContextMenu, onNodeMouseEnter: onNodeMouseEnter, onNodeMouseLeave: onNodeMouseLeave, nodeTypes: nodeTypes, fitView: true, fitViewOptions: { padding: 0.2 }, minZoom: 0.1, maxZoom: 2, defaultEdgeOptions: {
                type: 'smoothstep',
            }, style: { background: 'var(--am-bg)' } },
            react_1.default.createElement(EnhancedMiniMap_1.EnhancedMiniMap, { selectedNodeId: selectedNode, hoveredNodeId: hoveredNode?.id || null, nodeColors: exports.NODE_COLORS, onNodeClick: handleMiniMapNodeClick }),
            react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 1, color: "var(--am-fg)", style: { opacity: 0.15 } })),
        react_1.default.createElement(ZoomControls_1.ZoomControls, { zoomPan: zoomPan, position: "bottom-left" }),
        clusteringEnabled && clusters.length > 0 && (react_1.default.createElement("div", { className: "cluster-controls" },
            react_1.default.createElement("span", { className: "cluster-label" },
                "\uD83D\uDCE6 Clusters (",
                clusters.length,
                ")"),
            react_1.default.createElement("button", { className: "cluster-btn", onClick: () => setClusterState((0, clustering_1.expandAllClusters)(clusters)), title: "Expand All" }, "\u229E"),
            react_1.default.createElement("button", { className: "cluster-btn", onClick: () => setClusterState((0, clustering_1.collapseAllClusters)(clusters)), title: "Collapse All" }, "\u229F"))),
        react_1.default.createElement(NodeTooltip, { node: hoveredNode, position: tooltipPosition }),
        react_1.default.createElement(ContextMenu, { node: contextMenuNode, position: contextMenuPosition, onAction: handleContextMenuAction, onClose: () => setContextMenuNode(null) }),
        impactVisible && (react_1.default.createElement(ImpactAnalysis_1.ImpactAnalysisPanel, { data: impactData, onClose: () => { setImpactVisible(false); setImpactData(null); }, onNodeClick: (nodeId) => {
                setSelectedNode(nodeId);
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    reactFlowInstance.setCenter(node.position.x + (NODE_WIDTH / 2), node.position.y + (NODE_HEIGHT / 2), { zoom: 1, duration: 300 });
                }
            } })),
        relationshipVisible && selectedNode && (react_1.default.createElement(RelationshipVisualizer_1.RelationshipVisualizer, { selectedNodeId: selectedNode, nodes: relationshipNodes, edges: relationshipEdges, onNodeClick: (nodeId) => {
                setSelectedNode(nodeId);
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    reactFlowInstance.setCenter(node.position.x + (NODE_WIDTH / 2), node.position.y + (NODE_HEIGHT / 2), { zoom: 1, duration: 300 });
                }
            }, onClose: () => setRelationshipVisible(false) })),
        keyboardHelpVisible && (react_1.default.createElement(KeyboardNavigation_1.KeyboardHelp, { onClose: () => setKeyboardHelpVisible(false) })),
        react_1.default.createElement(ExportModal_1.ExportModal, { isOpen: exportMenuVisible, onClose: () => setExportMenuVisible(false), nodes: nodes, edges: edges, rawData: rawData, reactFlowWrapper: reactFlowWrapperRef.current, source: rawData?.source || 'local' }),
        react_1.default.createElement(LocalOutline_1.LocalOutline, { fileName: localFileName, symbols: localSymbols, isVisible: localOutlineVisible, onClose: () => setLocalOutlineVisible(false), onSymbolClick: (line) => console.log('Jump to line', line) })));
};
// Wrapper component with ReactFlowProvider
const ArchitectureGraph = () => {
    return (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
        react_1.default.createElement(ArchitectureGraphInner, null)));
};
exports.default = ArchitectureGraph;
//# sourceMappingURL=ArchitectureGraph.js.map