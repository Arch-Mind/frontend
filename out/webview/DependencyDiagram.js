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
exports.DependencyDiagram = void 0;
const react_1 = __importStar(require("react"));
const reactflow_1 = __importStar(require("reactflow"));
require("reactflow/dist/style.css");
const webviewClient_1 = require("../api/webviewClient");
const heatmapUtils_1 = require("./heatmapUtils");
const HeatmapLegend_1 = require("./HeatmapLegend");
const layoutAlgorithms_1 = require("./layoutAlgorithms");
const vscode_api_1 = require("./vscode-api");
/**
 * Generate fallback dependencies from the architecture graph edges.
 * Handles local analysis data where node IDs are absolute file paths
 * and import targets may be relative module paths.
 */
function generateFallbackDependencies(graphData) {
    const nodesArray = graphData?.nodes || [];
    const edgesArray = graphData?.edges || [];
    // Find the workspace root for building short names
    const rootNode = nodesArray.find((n) => n.type === 'directory' && n.depth === 0);
    const rootPrefix = rootNode
        ? (rootNode.filePath || rootNode.id || '').replace(/\\/g, '/').replace(/\/?$/, '/')
        : '';
    function shortName(absPath) {
        const normalized = absPath.replace(/\\/g, '/');
        return rootPrefix && normalized.startsWith(rootPrefix)
            ? normalized.slice(rootPrefix.length)
            : normalized;
    }
    // Build a set of known node IDs for resolution
    const nodeIds = new Set(nodesArray.map((n) => n.id));
    // Collect import and call edges
    const depEdges = edgesArray.filter((e) => e.type === 'imports' || e.type === 'calls');
    const dependencies = [];
    const seen = new Set();
    for (const edge of depEdges) {
        const src = edge.source || '';
        const tgt = edge.target || '';
        const key = `${src}→${tgt}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        dependencies.push({
            source_file: shortName(src),
            source_language: '',
            target: shortName(tgt),
            target_type: nodeIds.has(tgt) ? 'file' : 'module',
            relationship: edge.type || 'imports',
            relationship_properties: {},
        });
    }
    // If no import/call edges found, generate lightweight dependencies 
    // from directory→file containment so the diagram shows *something*
    if (dependencies.length === 0) {
        const fileNodes = nodesArray.filter((n) => n.type === 'file');
        const dirNodes = nodesArray.filter((n) => n.type === 'directory' && n.depth > 0);
        for (const dir of dirNodes) {
            const children = fileNodes.filter((f) => f.parentId === dir.id);
            if (children.length > 1) {
                // Create dependencies between sibling files (they share a module)
                for (let i = 1; i < children.length; i++) {
                    dependencies.push({
                        source_file: shortName(children[0].id),
                        source_language: '',
                        target: shortName(children[i].id),
                        target_type: 'file',
                        relationship: 'sibling',
                        relationship_properties: { directory: shortName(dir.id) },
                    });
                }
            }
        }
    }
    return {
        repo_id: graphData?.repoId || graphData?.repo_id || '',
        total_dependencies: dependencies.length,
        dependencies,
    };
}
const DependencyDiagramInner = ({ heatmapMode, highlightNodeIds = [] }) => {
    const vscode = (0, react_1.useMemo)(() => (0, vscode_api_1.getVsCodeApi)(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(), []);
    const [nodes, setNodes, onNodesChange] = (0, reactflow_1.useNodesState)([]);
    const [edges, setEdges, onEdgesChange] = (0, reactflow_1.useEdgesState)([]);
    const [repoId, setRepoId] = (0, react_1.useState)(null);
    const [initialLoading, setInitialLoading] = (0, react_1.useState)(true);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [dependencyData, setDependencyData] = (0, react_1.useState)(null);
    const [contributions, setContributions] = (0, react_1.useState)(null);
    const [graphData, setGraphData] = (0, react_1.useState)(null);
    const heatmapState = (0, react_1.useMemo)(() => (0, heatmapUtils_1.buildHeatmap)(contributions?.contributions || [], heatmapMode), [contributions, heatmapMode]);
    (0, react_1.useEffect)(() => {
        const handler = (event) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                setInitialLoading(false);
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
                }
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
    (0, react_1.useEffect)(() => {
        if (!repoId) {
            // No repoId — try fallback from graph data
            if (graphData) {
                const fallback = generateFallbackDependencies(graphData);
                if (fallback.dependencies.length > 0) {
                    setDependencyData(fallback);
                }
            }
            return;
        }
        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await apiClient.getDependencies(repoId);
                if (response && response.dependencies && response.dependencies.length > 0) {
                    setDependencyData(response);
                }
                else {
                    console.warn('Dependency API returned empty, using fallback');
                    const fallback = generateFallbackDependencies(graphData);
                    setDependencyData(fallback.dependencies.length > 0 ? fallback : response);
                }
            }
            catch (err) {
                console.error("Failed to load dependencies:", err);
                if (graphData) {
                    const fallback = generateFallbackDependencies(graphData);
                    if (fallback.dependencies.length > 0) {
                        setDependencyData(fallback);
                        setError(null);
                    }
                    else {
                        setError("Failed to load dependency data. Backend may be unavailable.");
                    }
                }
                else {
                    setError("Failed to load dependency data. Backend may be unavailable.");
                }
            }
            finally {
                setIsLoading(false);
            }
        };
        load();
    }, [repoId, apiClient, graphData]);
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
    (0, react_1.useEffect)(() => {
        if (!dependencyData)
            return;
        const uniqueNodes = new Map();
        const newEdges = [];
        dependencyData.dependencies.forEach((dep, index) => {
            // Source Node
            if (!uniqueNodes.has(dep.source_file)) {
                uniqueNodes.set(dep.source_file, {
                    id: dep.source_file,
                    data: { label: dep.source_file.split('/').pop(), type: 'file' },
                    position: { x: 0, y: 0 },
                    style: { background: 'var(--am-panel-bg)', color: 'var(--am-fg)', border: '1px solid var(--am-border)', borderRadius: 4, padding: 8, width: 180 },
                });
            }
            // Target Node
            if (!uniqueNodes.has(dep.target)) {
                uniqueNodes.set(dep.target, {
                    id: dep.target,
                    data: { label: dep.target.split('/').pop(), type: dep.target_type },
                    position: { x: 0, y: 0 },
                    style: { background: 'var(--am-panel-bg)', color: 'var(--am-fg)', border: '1px solid var(--am-border)', borderRadius: 4, padding: 8, width: 180 },
                });
            }
            // Edge
            newEdges.push({
                id: `e-${index}`,
                source: dep.source_file,
                target: dep.target,
                label: dep.relationship,
                type: 'smoothstep',
                markerEnd: { type: reactflow_1.MarkerType.ArrowClosed },
                style: { stroke: 'var(--am-fg)', opacity: 0.6 },
            });
        });
        // Apply Heatmap
        let processedNodes = Array.from(uniqueNodes.values());
        if (heatmapMode !== 'off') {
            processedNodes = processedNodes.map(node => {
                const entry = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(node.id));
                if (entry) {
                    return {
                        ...node,
                        style: { ...node.style, background: entry.color },
                        data: { ...node.data, heatmapTooltip: entry.tooltip }
                    };
                }
                return node;
            });
        }
        // Apply Layout
        const layoutNodes = processedNodes.map(n => ({ id: n.id, width: 180, height: 40 }));
        const layoutEdgesWrapper = newEdges.map(e => ({ id: e.id, source: e.source, target: e.target }));
        const layoutResult = (0, layoutAlgorithms_1.dagreLayout)(layoutNodes, layoutEdgesWrapper, 'TB');
        const finalNodes = processedNodes.map(node => {
            const pos = layoutResult.nodes.get(node.id) || { x: 0, y: 0 };
            return { ...node, position: pos };
        });
        setNodes(finalNodes);
        setEdges(newEdges);
    }, [dependencyData, heatmapState, heatmapMode, setNodes, setEdges]);
    // Show "initializing" spinner while waiting for first architectureData
    if (initialLoading) {
        return (react_1.default.createElement("div", { className: "loading-container" },
            react_1.default.createElement("div", { className: "loading-spinner" }),
            "Initializing dependency diagram..."));
    }
    if (!repoId && !dependencyData) {
        return (react_1.default.createElement("div", { className: "diagram-container", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' } },
            react_1.default.createElement("div", { style: { fontSize: '48px', marginBottom: '16px' } }, "\uD83D\uDD0D"),
            react_1.default.createElement("h3", null, "No Repository Analyzed"),
            react_1.default.createElement("p", { style: { opacity: 0.8, maxWidth: '400px', marginBottom: '24px' } }, "Run backend analysis to visualize dependencies, or open a workspace for local analysis."),
            react_1.default.createElement("button", { className: "diagram-pill active", onClick: () => vscode.postMessage({ command: 'analyzeRepository' }) }, "Analyze Repository")));
    }
    if (isLoading) {
        return react_1.default.createElement("div", { className: "loading-container" },
            react_1.default.createElement("div", { className: "loading-spinner" }),
            "Loading dependencies...");
    }
    if (error) {
        return (react_1.default.createElement("div", { className: "error-container" },
            react_1.default.createElement("div", { className: "error-icon" }, "\u26A0\uFE0F"),
            react_1.default.createElement("h3", null, "Error"),
            react_1.default.createElement("p", null, error),
            react_1.default.createElement("div", { className: "error-actions" },
                react_1.default.createElement("button", { className: "retry-button", onClick: () => {
                        setError(null);
                        if (repoId) {
                            setIsLoading(true);
                            apiClient.getDependencies(repoId)
                                .then(r => { setDependencyData(r); setIsLoading(false); })
                                .catch(() => { setError('Retry failed'); setIsLoading(false); });
                        }
                    } }, "Retry"))));
    }
    // Empty state
    if (!isLoading && !error && (!dependencyData || dependencyData.total_dependencies === 0)) {
        return (react_1.default.createElement("div", { className: "loading-container" },
            react_1.default.createElement("div", { style: { fontSize: '48px', marginBottom: '16px' } }, "\uD83D\uDD17"),
            react_1.default.createElement("h3", { style: { margin: 0, fontSize: '18px' } }, "No Dependencies Found"),
            react_1.default.createElement("p", { style: { opacity: 0.8, maxWidth: '400px', textAlign: 'center' } }, "Run analysis to detect dependencies.")));
    }
    return (react_1.default.createElement("div", { style: { width: '100%', height: '100%' } },
        heatmapMode !== 'off' && (react_1.default.createElement("div", { className: "heatmap-legend-floating" },
            react_1.default.createElement(HeatmapLegend_1.HeatmapLegend, { mode: heatmapMode, minMetric: heatmapState.minMetric, maxMetric: heatmapState.maxMetric }))),
        react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, fitView: true },
            react_1.default.createElement(reactflow_1.Background, { color: "var(--am-border)", gap: 16 }))));
};
const DependencyDiagram = (props) => (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
    react_1.default.createElement(DependencyDiagramInner, { ...props })));
exports.DependencyDiagram = DependencyDiagram;
//# sourceMappingURL=DependencyDiagram.js.map