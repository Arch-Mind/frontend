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
const vscode = acquireVsCodeApi();
// Custom Node Component with tooltip
const CustomNode = ({ data, selected }) => {
    const [showTooltip, setShowTooltip] = (0, react_1.useState)(false);
    const getNodeIcon = () => {
        switch (data.type) {
            case 'directory': return '📁';
            case 'function': return 'ƒ';
            case 'class': return '◆';
            case 'module': return '📦';
            default: return '📄';
        }
    };
    const formatSize = (bytes) => {
        if (!bytes)
            return '';
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const nodeClass = `custom-node type-${data.type} ${data.isMatched === false ? 'dimmed' : ''} ${data.isSelected ? 'selected' : ''} ${data.isConnected ? 'connected' : ''}`;
    return (react_1.default.createElement("div", { className: nodeClass, onMouseEnter: () => setShowTooltip(true), onMouseLeave: () => setShowTooltip(false) },
        react_1.default.createElement(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Top }),
        react_1.default.createElement("div", { className: "node-content" },
            react_1.default.createElement("span", { className: "node-icon" }, getNodeIcon()),
            react_1.default.createElement("span", { className: "node-label" }, data.label)),
        react_1.default.createElement(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Bottom }),
        showTooltip && (react_1.default.createElement("div", { className: "node-tooltip" },
            react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("strong", null, "Name:"),
                " ",
                data.label),
            react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("strong", null, "Type:"),
                " ",
                data.type),
            react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("strong", null, "Path:"),
                " ",
                data.relativePath),
            data.lineNumber && react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("strong", null, "Line:"),
                " ",
                data.lineNumber),
            data.fileExtension && react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("strong", null, "Extension:"),
                " .",
                data.fileExtension),
            data.size && react_1.default.createElement("div", { className: "tooltip-row" },
                react_1.default.createElement("strong", null, "Size:"),
                " ",
                formatSize(data.size)),
            react_1.default.createElement("div", { className: "tooltip-hint" }, "Click to open \u2022 Right-click for menu")))));
};
const nodeTypes = { custom: CustomNode };
// Match function for path patterns (simple glob-like matching)
function matchPathPattern(path, pattern) {
    if (!pattern)
        return true;
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
    const normalizedPattern = pattern.replace(/\\/g, '/').toLowerCase().trim();
    // Simple contains check first (for paths like "billing-system" or "projects/billing-system")
    if (normalizedPath.includes(normalizedPattern)) {
        return true;
    }
    // Check if any segment of the path matches the pattern
    const pathSegments = normalizedPath.split('/');
    const patternSegments = normalizedPattern.split('/');
    // Check if the last segment of pattern matches any segment in path
    const lastPatternSegment = patternSegments[patternSegments.length - 1];
    if (pathSegments.some(segment => segment.includes(lastPatternSegment))) {
        return true;
    }
    // Convert glob pattern to regex for wildcard support
    const regexPattern = normalizedPattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{GLOBSTAR}}/g, '.*')
        .replace(/\?/g, '.');
    try {
        const regex = new RegExp(regexPattern, 'i');
        return regex.test(normalizedPath);
    }
    catch {
        return normalizedPath.includes(normalizedPattern);
    }
}
const ArchitectureGraphInner = ({ filter, onMatchCountChange }) => {
    const [nodes, setNodes, onNodesChange] = (0, reactflow_1.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)([]);
    const [rawNodes, setRawNodes] = (0, react_1.useState)([]);
    const [rawEdges, setRawEdges] = (0, react_1.useState)([]);
    const [selectedNodeId, setSelectedNodeId] = (0, react_1.useState)(null);
    const [contextMenu, setContextMenu] = (0, react_1.useState)({
        visible: false,
        x: 0,
        y: 0,
        nodeId: null,
        nodeData: null
    });
    const { fitView, setCenter } = (0, reactflow_1.useReactFlow)();
    const onConnect = (0, react_1.useCallback)((params) => setEdges((eds) => (0, reactflow_1.addEdge)(params, eds)), [setEdges]);
    // Get connected node IDs for a given node
    const getConnectedNodeIds = (0, react_1.useCallback)((nodeId) => {
        const connected = new Set();
        rawEdges.forEach((edge) => {
            if (edge.source === nodeId)
                connected.add(edge.target);
            if (edge.target === nodeId)
                connected.add(edge.source);
        });
        return connected;
    }, [rawEdges]);
    // Apply filters and update nodes
    (0, react_1.useEffect)(() => {
        if (rawNodes.length === 0)
            return;
        const connectedIds = selectedNodeId ? getConnectedNodeIds(selectedNodeId) : new Set();
        const layoutedNodes = rawNodes.map((n, index) => {
            // Check if node matches filters
            const matchesSearch = !filter.searchQuery ||
                n.label.toLowerCase().includes(filter.searchQuery.toLowerCase());
            // Ensure type is valid, default to 'file' if not recognized
            const nodeType = (n.type && ['file', 'directory', 'function', 'class', 'module'].includes(n.type))
                ? n.type
                : 'file';
            const matchesType = filter.nodeTypes[nodeType] !== false;
            const matchesPath = matchPathPattern(n.relativePath || n.label, filter.pathPattern);
            const isMatched = matchesSearch && matchesType && matchesPath;
            const isSelected = n.id === selectedNodeId;
            const isConnected = connectedIds.has(n.id);
            return {
                id: n.id,
                type: 'custom',
                data: {
                    label: n.label,
                    type: n.type || 'file',
                    filePath: n.filePath || n.id,
                    relativePath: n.relativePath || n.label,
                    lineNumber: n.lineNumber,
                    fileExtension: n.fileExtension,
                    size: n.size,
                    isMatched,
                    isSelected,
                    isConnected
                },
                position: { x: (index % 5) * 220, y: Math.floor(index / 5) * 120 },
            };
        });
        const matchedCount = layoutedNodes.filter(n => n.data.isMatched).length;
        onMatchCountChange(matchedCount, layoutedNodes.length);
        setNodes(layoutedNodes);
        // Style edges based on selection
        const styledEdges = rawEdges.map((e) => ({
            ...e,
            style: {
                stroke: (e.source === selectedNodeId || e.target === selectedNodeId)
                    ? '#007acc'
                    : 'var(--vscode-editor-foreground)',
                strokeWidth: (e.source === selectedNodeId || e.target === selectedNodeId) ? 2 : 1,
                opacity: selectedNodeId && e.source !== selectedNodeId && e.target !== selectedNodeId ? 0.3 : 1
            }
        }));
        setEdges(styledEdges);
    }, [rawNodes, rawEdges, filter, selectedNodeId, getConnectedNodeIds, onMatchCountChange, setNodes, setEdges]);
    // Listen for messages from the extension
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const { nodes: newNodes, edges: newEdges } = message.data;
                setRawNodes(newNodes);
                setRawEdges(newEdges);
            }
        };
        window.addEventListener('message', handleMessage);
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    // Handle node click - open file
    const onNodeClick = (0, react_1.useCallback)((event, node) => {
        setSelectedNodeId(node.id);
        // Open file in editor
        if (node.data.type !== 'directory') {
            vscode.postMessage({
                command: 'openFile',
                filePath: node.data.filePath,
                lineNumber: node.data.lineNumber
            });
        }
    }, []);
    // Handle node right-click - show context menu
    const onNodeContextMenu = (0, react_1.useCallback)((event, node) => {
        event.preventDefault();
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            nodeId: node.id,
            nodeData: node.data
        });
    }, []);
    // Close context menu
    const closeContextMenu = (0, react_1.useCallback)(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);
    // Context menu actions
    const handleContextMenuAction = (0, react_1.useCallback)((action) => {
        if (!contextMenu.nodeData)
            return;
        switch (action) {
            case 'open':
                vscode.postMessage({
                    command: 'openFile',
                    filePath: contextMenu.nodeData.filePath,
                    lineNumber: contextMenu.nodeData.lineNumber
                });
                break;
            case 'reveal':
                vscode.postMessage({
                    command: 'revealInExplorer',
                    filePath: contextMenu.nodeData.filePath
                });
                break;
            case 'definition':
                vscode.postMessage({
                    command: 'goToDefinition',
                    filePath: contextMenu.nodeData.filePath,
                    lineNumber: contextMenu.nodeData.lineNumber
                });
                break;
            case 'references':
                vscode.postMessage({
                    command: 'findReferences',
                    filePath: contextMenu.nodeData.filePath,
                    lineNumber: contextMenu.nodeData.lineNumber
                });
                break;
        }
        closeContextMenu();
    }, [contextMenu.nodeData, closeContextMenu]);
    // Handle pane click to close context menu and deselect
    const onPaneClick = (0, react_1.useCallback)(() => {
        closeContextMenu();
        setSelectedNodeId(null);
    }, [closeContextMenu]);
    // Focus on filtered results
    (0, react_1.useEffect)(() => {
        const handleFocusSelection = (event) => {
            const matchedNodes = nodes.filter(n => n.data.isMatched);
            if (matchedNodes.length > 0) {
                fitView({ nodes: matchedNodes, padding: 0.2, duration: 500 });
            }
        };
        window.addEventListener('focusSelection', handleFocusSelection);
        return () => window.removeEventListener('focusSelection', handleFocusSelection);
    }, [nodes, fitView]);
    return (react_1.default.createElement("div", { style: { width: '100%', height: '100%' }, onClick: closeContextMenu },
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: onNodeClick, onNodeContextMenu: onNodeContextMenu, onPaneClick: onPaneClick, nodeTypes: nodeTypes, fitView: true },
            react_1.default.createElement(reactflow_1.Controls, null),
            react_1.default.createElement(reactflow_1.MiniMap, { nodeColor: (node) => {
                    const data = node.data;
                    if (data.isSelected)
                        return '#007acc';
                    if (data.isMatched === false)
                        return '#666';
                    switch (data.type) {
                        case 'directory': return '#dcb67a';
                        case 'function': return '#dcdcaa';
                        case 'class': return '#4ec9b0';
                        case 'module': return '#c586c0';
                        default: return '#9cdcfe';
                    }
                } }),
            react_1.default.createElement(reactflow_1.Background, { gap: 12, size: 1 })),
        contextMenu.visible && (react_1.default.createElement("div", { className: "context-menu", style: {
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 1000
            }, onClick: (e) => e.stopPropagation() },
            react_1.default.createElement("div", { className: "context-menu-item", onClick: () => handleContextMenuAction('open') }, "\uD83D\uDCC4 Open File"),
            react_1.default.createElement("div", { className: "context-menu-item", onClick: () => handleContextMenuAction('reveal') }, "\uD83D\uDCC2 Reveal in Explorer"),
            react_1.default.createElement("div", { className: "context-menu-separator" }),
            react_1.default.createElement("div", { className: "context-menu-item", onClick: () => handleContextMenuAction('definition') }, "\uD83D\uDD0D Go to Definition"),
            react_1.default.createElement("div", { className: "context-menu-item", onClick: () => handleContextMenuAction('references') }, "\uD83D\uDD17 Find References")))));
};
const ArchitectureGraph = (props) => {
    return (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
        react_1.default.createElement(ArchitectureGraphInner, { ...props })));
};
exports.default = ArchitectureGraph;
//# sourceMappingURL=ArchitectureGraph.js.map