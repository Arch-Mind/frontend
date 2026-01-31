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
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
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
const NODE_COLORS = {
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
// Get color based on node type/language
function getNodeColor(node) {
    if (node.type === 'directory')
        return NODE_COLORS.directory;
    if (node.type === 'function')
        return NODE_COLORS.function;
    if (node.type === 'class')
        return NODE_COLORS.class;
    if (node.type === 'module')
        return NODE_COLORS.module;
    if (node.language)
        return NODE_COLORS[node.language] || NODE_COLORS.default;
    return NODE_COLORS.default;
}
// Check if a node matches the search filters
function matchesFilters(node, filters) {
    const { searchTerm, nodeType, pathPattern } = filters;
    // Filter by node type
    if (nodeType !== 'all' && node.type !== nodeType) {
        return false;
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
// Hierarchical layout algorithm
function calculateHierarchicalLayout(nodes, edges, filters, selectedNodeId) {
    // Determine which nodes match the filters
    const matchingNodeIds = new Set();
    const hasActiveFilter = filters.searchTerm || filters.nodeType !== 'all' || filters.pathPattern;
    if (hasActiveFilter) {
        nodes.forEach(node => {
            if (matchesFilters(node, filters)) {
                matchingNodeIds.add(node.id);
            }
        });
    }
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
            const color = getNodeColor(node);
            const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
            const isSelected = selectedNodeId === node.id;
            layoutedNodes.push({
                id: node.id,
                data: {
                    label: node.label,
                    type: node.type,
                    language: node.language,
                    extension: node.extension,
                    filePath: node.filePath || node.id,
                    lineNumber: node.lineNumber,
                    endLineNumber: node.endLineNumber,
                },
                position: {
                    x: startX + index * horizontalSpacing,
                    y: depth * verticalSpacing,
                },
                style: {
                    background: node.type === 'directory'
                        ? `${color}20`
                        : 'var(--vscode-editor-background)',
                    borderColor: isSelected ? 'var(--vscode-focusBorder)' : color,
                    borderWidth: isSelected ? 3 : (node.type === 'directory' ? 2 : 1),
                    borderRadius: node.type === 'directory' ? 8 : 4,
                    opacity: isMatching ? 1 : 0.3,
                    boxShadow: isSelected ? '0 0 10px var(--vscode-focusBorder)' : undefined,
                },
                className: isMatching ? 'matching-node' : 'dimmed-node',
            });
        });
    });
    return { layoutedNodes, matchingNodeIds };
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
                    ? 'var(--vscode-focusBorder)'
                    : 'var(--vscode-editor-foreground)',
                strokeWidth: isConnectedToSelected ? 2 : 1,
                opacity: isMatching ? (isConnectedToSelected ? 0.9 : 0.5) : 0.15,
            },
        };
    });
}
const StatsDisplay = ({ stats }) => {
    if (!stats)
        return null;
    return (react_1.default.createElement("div", { className: "stats-panel" },
        react_1.default.createElement("div", { className: "stat-item" },
            react_1.default.createElement("span", { className: "stat-label" }, "Files:"),
            react_1.default.createElement("span", { className: "stat-value" }, stats.totalFiles)),
        react_1.default.createElement("div", { className: "stat-item" },
            react_1.default.createElement("span", { className: "stat-label" }, "Directories:"),
            react_1.default.createElement("span", { className: "stat-value" }, stats.totalDirectories)),
        Object.entries(stats.filesByLanguage).length > 0 && (react_1.default.createElement("div", { className: "stat-languages" }, Object.entries(stats.filesByLanguage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([lang, count]) => (react_1.default.createElement("span", { key: lang, className: "language-badge", style: {
                backgroundColor: NODE_COLORS[lang] || NODE_COLORS.default,
            } },
            lang,
            ": ",
            count)))))));
};
const SearchPanel = ({ filters, onFiltersChange, matchCount, totalCount, onFocusSelection, isVisible, onClose, }) => {
    const searchInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (isVisible && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isVisible]);
    if (!isVisible)
        return null;
    const hasActiveFilter = filters.searchTerm || filters.nodeType !== 'all' || filters.pathPattern;
    return (react_1.default.createElement("div", { className: "search-panel" },
        react_1.default.createElement("div", { className: "search-header" },
            react_1.default.createElement("span", { className: "search-title" }, "\uD83D\uDD0D Search & Filter"),
            react_1.default.createElement("button", { className: "search-close", onClick: onClose, title: "Close (Esc)" }, "\u00D7")),
        react_1.default.createElement("div", { className: "search-field" },
            react_1.default.createElement("label", null, "Search by name:"),
            react_1.default.createElement("input", { ref: searchInputRef, type: "text", placeholder: "Enter file/function name...", value: filters.searchTerm, onChange: (e) => onFiltersChange({ ...filters, searchTerm: e.target.value }), className: "search-input" })),
        react_1.default.createElement("div", { className: "search-field" },
            react_1.default.createElement("label", null, "Filter by type:"),
            react_1.default.createElement("select", { value: filters.nodeType, onChange: (e) => onFiltersChange({ ...filters, nodeType: e.target.value }), className: "search-select" },
                react_1.default.createElement("option", { value: "all" }, "All Types"),
                react_1.default.createElement("option", { value: "file" }, "\uD83D\uDCC4 Files"),
                react_1.default.createElement("option", { value: "directory" }, "\uD83D\uDCC1 Directories"),
                react_1.default.createElement("option", { value: "function" }, "\u26A1 Functions"),
                react_1.default.createElement("option", { value: "class" }, "\uD83C\uDFF7\uFE0F Classes"),
                react_1.default.createElement("option", { value: "module" }, "\uD83D\uDCE6 Modules"))),
        react_1.default.createElement("div", { className: "search-field" },
            react_1.default.createElement("label", null, "Path pattern:"),
            react_1.default.createElement("input", { type: "text", placeholder: "e.g., src/*.ts, **/utils/*", value: filters.pathPattern, onChange: (e) => onFiltersChange({ ...filters, pathPattern: e.target.value }), className: "search-input" })),
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
            react_1.default.createElement("button", { className: "search-btn secondary", onClick: () => onFiltersChange({ searchTerm: '', nodeType: 'all', pathPattern: '' }), disabled: !hasActiveFilter }, "Clear Filters")),
        react_1.default.createElement("div", { className: "search-hint" },
            react_1.default.createElement("kbd", null, "Ctrl"),
            "+",
            react_1.default.createElement("kbd", null, "F"),
            " to toggle search")));
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
        react_1.default.createElement("button", { className: "context-menu-item", onClick: () => onAction('copyPath') }, "\uD83D\uDCCB Copy Path")));
};
// Inner component that uses ReactFlow hooks
const ArchitectureGraphInner = () => {
    const [nodes, setNodes, onNodesChange] = (0, reactflow_1.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)([]);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    // Search and filter state
    const [searchVisible, setSearchVisible] = (0, react_1.useState)(false);
    const [filters, setFilters] = (0, react_1.useState)({
        searchTerm: '',
        nodeType: 'all',
        pathPattern: '',
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
    // ReactFlow instance for programmatic control
    const reactFlowInstance = (0, reactflow_1.useReactFlow)();
    // VS Code API reference
    const vscodeRef = (0, react_1.useRef)(null);
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
        }
        setContextMenuNode(null);
    }, [contextMenuNode]);
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
            // Escape to close search or context menu
            if (e.key === 'Escape') {
                setSearchVisible(false);
                setContextMenuNode(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    // Update graph when debounced filters change (performant for large graphs)
    (0, react_1.useEffect)(() => {
        if (!rawData)
            return;
        const { nodes: rawNodes, edges: rawEdges } = rawData;
        const { layoutedNodes, matchingNodeIds: newMatchingIds } = calculateHierarchicalLayout(rawNodes, rawEdges, debouncedFilters, selectedNode);
        const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);
        setNodes(layoutedNodes);
        setEdges(formattedEdges);
        setMatchingNodeIds(newMatchingIds);
    }, [debouncedFilters, selectedNode, rawData, setNodes, setEdges]);
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const data = message.data;
                setRawData(data);
                const { nodes: rawNodes, edges: rawEdges, stats: graphStats } = data;
                // Apply hierarchical layout (use current filters on initial load)
                const { layoutedNodes, matchingNodeIds: newMatchingIds } = calculateHierarchicalLayout(rawNodes, rawEdges, debouncedFilters, selectedNode);
                const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);
                setNodes(layoutedNodes);
                setEdges(formattedEdges);
                setStats(graphStats);
                setMatchingNodeIds(newMatchingIds);
                setIsLoading(false);
            }
        };
        window.addEventListener('message', handleMessage);
        // Request data from extension
        const vscode = acquireVsCodeApi();
        vscodeRef.current = vscode;
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [setNodes, setEdges]);
    // Memoize minimap node color function
    const minimapNodeColor = (0, react_1.useCallback)((node) => {
        if (node.data?.type === 'directory')
            return NODE_COLORS.directory;
        if (node.data?.type === 'function')
            return NODE_COLORS.function;
        if (node.data?.type === 'class')
            return NODE_COLORS.class;
        if (node.data?.language)
            return NODE_COLORS[node.data.language] || NODE_COLORS.default;
        return NODE_COLORS.default;
    }, []);
    if (isLoading) {
        return (react_1.default.createElement("div", { className: "loading-container" },
            react_1.default.createElement("div", { className: "loading-spinner" }),
            react_1.default.createElement("p", null, "Analyzing workspace structure...")));
    }
    return (react_1.default.createElement("div", { style: { width: '100%', height: '100%', position: 'relative' } },
        react_1.default.createElement(StatsDisplay, { stats: stats }),
        react_1.default.createElement(SearchPanel, { filters: filters, onFiltersChange: setFilters, matchCount: matchingNodeIds.size || (filters.searchTerm || filters.nodeType !== 'all' || filters.pathPattern ? 0 : rawData?.nodes.length || 0), totalCount: rawData?.nodes.length || 0, onFocusSelection: handleFocusSelection, isVisible: searchVisible, onClose: () => setSearchVisible(false) }),
        !searchVisible && (react_1.default.createElement("button", { className: "search-toggle-btn", onClick: () => setSearchVisible(true), title: "Search & Filter (Ctrl+F)" }, "\uD83D\uDD0D")),
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: onNodeClick, onNodeContextMenu: onNodeContextMenu, onNodeMouseEnter: onNodeMouseEnter, onNodeMouseLeave: onNodeMouseLeave, fitView: true, fitViewOptions: { padding: 0.2 }, minZoom: 0.1, maxZoom: 2, defaultEdgeOptions: {
                type: 'smoothstep',
            } },
            react_1.default.createElement(reactflow_1.Controls, { showInteractive: false }),
            react_1.default.createElement(reactflow_1.MiniMap, { nodeColor: minimapNodeColor, maskColor: "rgba(0, 0, 0, 0.8)", style: {
                    backgroundColor: 'var(--vscode-editor-background)',
                } }),
            react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 1, color: "var(--vscode-editor-foreground)", style: { opacity: 0.1 } })),
        react_1.default.createElement(NodeTooltip, { node: hoveredNode, position: tooltipPosition }),
        react_1.default.createElement(ContextMenu, { node: contextMenuNode, position: contextMenuPosition, onAction: handleContextMenuAction, onClose: () => setContextMenuNode(null) })));
};
// Wrapper component with ReactFlowProvider
const ArchitectureGraph = () => {
    return (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
        react_1.default.createElement(ArchitectureGraphInner, null)));
};
exports.default = ArchitectureGraph;
//# sourceMappingURL=ArchitectureGraph.js.map