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
    default: '#6b7280',
};
// Get color based on node type/language
function getNodeColor(node) {
    if (node.type === 'directory')
        return NODE_COLORS.directory;
    if (node.language)
        return NODE_COLORS[node.language] || NODE_COLORS.default;
    return NODE_COLORS.default;
}
// Hierarchical layout algorithm
function calculateHierarchicalLayout(nodes, edges) {
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
            layoutedNodes.push({
                id: node.id,
                data: {
                    label: node.label,
                    type: node.type,
                    language: node.language,
                    extension: node.extension,
                },
                position: {
                    x: startX + index * horizontalSpacing,
                    y: depth * verticalSpacing,
                },
                style: {
                    background: node.type === 'directory'
                        ? `${color}20`
                        : 'var(--vscode-editor-background)',
                    borderColor: color,
                    borderWidth: node.type === 'directory' ? 2 : 1,
                    borderRadius: node.type === 'directory' ? 8 : 4,
                },
            });
        });
    });
    return layoutedNodes;
}
// Format edges with proper styling
function formatEdges(rawEdges) {
    return rawEdges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        style: {
            stroke: 'var(--vscode-editor-foreground)',
            strokeWidth: 1,
            opacity: 0.5,
        },
    }));
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
const ArchitectureGraph = () => {
    const [nodes, setNodes, onNodesChange] = (0, reactflow_1.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)([]);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    const onConnect = (0, react_1.useCallback)((params) => setEdges((eds) => (0, reactflow_1.addEdge)(params, eds)), [setEdges]);
    const onNodeClick = (0, react_1.useCallback)((_, node) => {
        setSelectedNode(node.id);
    }, []);
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const data = message.data;
                const { nodes: rawNodes, edges: rawEdges, stats: graphStats } = data;
                // Apply hierarchical layout
                const layoutedNodes = calculateHierarchicalLayout(rawNodes, rawEdges);
                const formattedEdges = formatEdges(rawEdges);
                setNodes(layoutedNodes);
                setEdges(formattedEdges);
                setStats(graphStats);
                setIsLoading(false);
            }
        };
        window.addEventListener('message', handleMessage);
        // Request data from extension
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [setNodes, setEdges]);
    // Memoize minimap node color function
    const minimapNodeColor = (0, react_1.useCallback)((node) => {
        if (node.data?.type === 'directory')
            return NODE_COLORS.directory;
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
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: onNodeClick, fitView: true, fitViewOptions: { padding: 0.2 }, minZoom: 0.1, maxZoom: 2, defaultEdgeOptions: {
                type: 'smoothstep',
            } },
            react_1.default.createElement(reactflow_1.Controls, { showInteractive: false }),
            react_1.default.createElement(reactflow_1.MiniMap, { nodeColor: minimapNodeColor, maskColor: "rgba(0, 0, 0, 0.8)", style: {
                    backgroundColor: 'var(--vscode-editor-background)',
                } }),
            react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 1, color: "var(--vscode-editor-foreground)", style: { opacity: 0.1 } }))));
};
exports.default = ArchitectureGraph;
//# sourceMappingURL=ArchitectureGraph.js.map