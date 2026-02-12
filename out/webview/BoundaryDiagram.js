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
exports.BoundaryDiagram = void 0;
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const webviewClient_1 = require("../api/webviewClient");
const heatmapUtils_1 = require("./heatmapUtils");
const HeatmapLegend_1 = require("./HeatmapLegend");
const vscode_api_1 = require("./vscode-api");
/**
 * Generate fallback boundaries by grouping files from the architecture
 * graph data by their directory relative to the workspace root.
 */
function generateFallbackBoundaries(graphData) {
    const nodesArray = graphData?.nodes || [];
    const fileNodes = nodesArray.filter((n) => n.type === 'file');
    if (fileNodes.length === 0) {
        return { repo_id: graphData?.repoId || graphData?.repo_id || '', total_boundaries: 0, boundaries: [] };
    }
    // Find the workspace root (the depth=0 directory node)
    const rootNode = nodesArray.find((n) => n.type === 'directory' && n.depth === 0);
    const rootPrefix = rootNode
        ? (rootNode.filePath || rootNode.id || '').replace(/\\/g, '/').replace(/\/?$/, '/')
        : '';
    const groups = new Map();
    fileNodes.forEach((node) => {
        const filePath = (node.filePath || node.id || '').replace(/\\/g, '/');
        // Strip the workspace root prefix to get a relative path
        const relative = rootPrefix && filePath.startsWith(rootPrefix)
            ? filePath.slice(rootPrefix.length)
            : filePath;
        const parts = relative.split('/');
        // Group by first directory segment, or 'root' for files at root level
        const dir = parts.length > 1 ? parts[0] : 'root';
        if (!groups.has(dir))
            groups.set(dir, []);
        groups.get(dir).push(relative);
    });
    const boundaries = Array.from(groups.entries()).map(([dir, files], idx) => ({
        id: `fallback-${idx}`,
        name: dir,
        type: 'logical',
        path: dir,
        layer: null,
        file_count: files.length,
        files,
    }));
    return {
        repo_id: graphData?.repoId || graphData?.repo_id || '',
        total_boundaries: boundaries.length,
        boundaries,
    };
}
// Reuse logic from ModuleBoundaryDiagram
function getBoundaryHeatmap(boundary, heatmapState) {
    let hottest = null;
    boundary.files.forEach((file) => {
        const entry = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(file));
        if (!entry)
            return;
        if (!hottest || entry.metric > hottest.metric) {
            hottest = { color: entry.color, tooltip: entry.tooltip, metric: entry.metric };
        }
    });
    return hottest;
}
const LAYER_COLORS = {
    Presentation: '#4fc3f7',
    BusinessLogic: '#ff9800',
    DataAccess: '#4caf50',
    Infrastructure: '#9c27b0',
    Unknown: '#78909c',
};
const BoundaryDiagramInner = ({ heatmapMode, highlightNodeIds = [] }) => {
    const vscode = (0, react_1.useMemo)(() => (0, vscode_api_1.getVsCodeApi)(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(), []);
    const [nodes, setNodes, onNodesChange] = (0, reactflow_1.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)([]);
    const [repoId, setRepoId] = (0, react_1.useState)(null);
    const [initialLoading, setInitialLoading] = (0, react_1.useState)(true); // true until first architectureData
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [boundaryData, setBoundaryData] = (0, react_1.useState)(null);
    const [contributions, setContributions] = (0, react_1.useState)(null);
    const [graphData, setGraphData] = (0, react_1.useState)(null); // Store raw graph data for fallback
    const heatmapState = (0, react_1.useMemo)(() => (0, heatmapUtils_1.buildHeatmap)(contributions?.contributions || [], heatmapMode), [contributions, heatmapMode]);
    // Listen for repoId and graph data from parent/extension
    (0, react_1.useEffect)(() => {
        const handler = (event) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                setInitialLoading(false);
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
                }
                // Store graph data for fallback boundary generation
                if (message.data) {
                    setGraphData(message.data);
                }
            }
            if (message?.command === 'loading') {
                setInitialLoading(false);
                setIsLoading(true);
                setError(null);
            }
            if (message?.command === 'error') {
                setInitialLoading(false);
                setError(message.message || 'An error occurred');
                setIsLoading(false);
            }
            if (message?.command === 'noData') {
                setInitialLoading(false);
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => window.removeEventListener('message', handler);
    }, [vscode]);
    // Fetch boundaries (with fallback)
    (0, react_1.useEffect)(() => {
        if (!repoId) {
            // No repoId — try fallback from graph data
            if (graphData) {
                const fallback = generateFallbackBoundaries(graphData);
                if (fallback.boundaries.length > 0) {
                    setBoundaryData(fallback);
                }
            }
            return;
        }
        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await apiClient.getModuleBoundaries(repoId);
                if (response && response.boundaries && response.boundaries.length > 0) {
                    setBoundaryData(response);
                }
                else {
                    // API returned empty boundaries, use fallback
                    console.warn('Boundary API returned empty, using fallback grouping');
                    const fallback = generateFallbackBoundaries(graphData);
                    setBoundaryData(fallback.boundaries.length > 0 ? fallback : response);
                }
            }
            catch (err) {
                console.error("Failed to load boundaries:", err);
                // Try fallback instead of showing error
                if (graphData) {
                    const fallback = generateFallbackBoundaries(graphData);
                    if (fallback.boundaries.length > 0) {
                        setBoundaryData(fallback);
                        setError(null);
                    }
                    else {
                        setError("Failed to load boundary data. Backend may be unavailable.");
                    }
                }
                else {
                    setError("Failed to load boundary data. Backend may be unavailable.");
                }
            }
            finally {
                setIsLoading(false);
            }
        };
        load();
    }, [repoId, apiClient, graphData]);
    // Fetch contributions for heatmap
    (0, react_1.useEffect)(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }
        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active)
                    setContributions(response);
            }
            catch (err) {
                console.error("Failed to load contributions:", err);
            }
        };
        load();
        return () => { active = false; };
    }, [repoId, heatmapMode, apiClient]);
    // Convert boundaries to nodes
    (0, react_1.useEffect)(() => {
        if (!boundaryData)
            return;
        const newNodes = [];
        const boundaries = boundaryData.boundaries || [];
        // Simple grid layout
        const SPACING_X = 250;
        const SPACING_Y = 150;
        const COLUMNS = 4;
        boundaries.forEach((boundary, index) => {
            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;
            const heatmap = heatmapMode === 'off' ? null : getBoundaryHeatmap(boundary, heatmapState);
            const baseColor = LAYER_COLORS[boundary.layer || 'Unknown'] || LAYER_COLORS.Unknown;
            const finalColor = heatmap ? heatmap.color : `${baseColor}20`; // Transparent base if no heatmap
            newNodes.push({
                id: boundary.id,
                position: { x: col * SPACING_X, y: row * SPACING_Y },
                data: {
                    label: boundary.name,
                    layer: boundary.layer,
                    files: boundary.file_count,
                    heatmapTooltip: heatmap?.tooltip
                },
                style: {
                    background: finalColor,
                    border: `1px solid ${heatmap ? finalColor : baseColor}`,
                    borderRadius: 8,
                    padding: 10,
                    width: 200,
                    fontSize: 12,
                    color: 'var(--am-fg)',
                },
                type: 'default',
            });
        });
        setNodes(newNodes);
        setEdges([]); // No edges for now as API doesn't provide them explicitly
    }, [boundaryData, heatmapState, heatmapMode, setNodes, setEdges]);
    // Show "initializing" spinner while waiting for first architectureData
    if (initialLoading) {
        return (react_1.default.createElement("div", { className: "loading-container" },
            react_1.default.createElement("div", { className: "loading-spinner" }),
            "Initializing boundary diagram..."));
    }
    // Only show "No Repository" screen if no repoId AND no fallback data
    if (!repoId && !boundaryData) {
        return (react_1.default.createElement("div", { className: "diagram-container", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' } },
            react_1.default.createElement("div", { style: { fontSize: '48px', marginBottom: '16px' } }, "\uD83D\uDD0D"),
            react_1.default.createElement("h3", null, "No Repository Analyzed"),
            react_1.default.createElement("p", { style: { opacity: 0.8, maxWidth: '400px', marginBottom: '24px' } }, "Run backend analysis to visualize module boundaries, or open a workspace for local analysis."),
            react_1.default.createElement("button", { className: "diagram-pill active", onClick: () => vscode.postMessage({ command: 'analyzeRepository' }) }, "Analyze Repository")));
    }
    if (isLoading) {
        return react_1.default.createElement("div", { className: "loading-container" },
            react_1.default.createElement("div", { className: "loading-spinner" }),
            "Loading boundaries...");
    }
    if (error) {
        return react_1.default.createElement("div", { className: "error-container" },
            react_1.default.createElement("h3", null, "Error"),
            error);
    }
    if (!isLoading && !error && (!boundaryData || !boundaryData.boundaries || boundaryData.boundaries.length === 0)) {
        return (react_1.default.createElement("div", { className: "diagram-container", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--am-fg)' } },
            react_1.default.createElement("div", { style: { fontSize: '48px', marginBottom: '16px' } }, "\u2205"),
            react_1.default.createElement("h3", null, "No Boundaries Detected"),
            react_1.default.createElement("p", { style: { opacity: 0.8, maxWidth: '400px', marginBottom: '24px' } }, "The analysis could not identify any distinct module boundaries in this repository."),
            react_1.default.createElement("button", { className: "diagram-pill active", onClick: () => vscode.postMessage({ command: 'analyzeRepository' }) }, "Re-run Analysis")));
    }
    return (react_1.default.createElement("div", { style: { width: '100%', height: '100%' } },
        heatmapMode !== 'off' && (react_1.default.createElement("div", { className: "heatmap-legend-floating" },
            react_1.default.createElement(HeatmapLegend_1.HeatmapLegend, { mode: heatmapMode, minMetric: heatmapState.minMetric, maxMetric: heatmapState.maxMetric }))),
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, fitView: true },
            react_1.default.createElement(reactflow_1.Background, { color: "var(--am-border)", gap: 16 }))));
};
const BoundaryDiagram = (props) => (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
    react_1.default.createElement(BoundaryDiagramInner, { ...props })));
exports.BoundaryDiagram = BoundaryDiagram;
//# sourceMappingURL=BoundaryDiagram.js.map