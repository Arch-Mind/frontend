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
const layoutAlgorithms_1 = require("./layoutAlgorithms");
const webviewClient_1 = require("../api/webviewClient");
const HeatmapLegend_1 = require("./HeatmapLegend");
const HeatmapNode_1 = require("./HeatmapNode");
const heatmapUtils_1 = require("./heatmapUtils");
const vscodeApi_1 = require("../utils/vscodeApi");
const edgeStyles = {
    import: { color: '#6b7280', dash: '0', width: 1.2 },
    inheritance: { color: '#8b5cf6', dash: '6 4', width: 1.2 },
    library: { color: '#a16207', dash: '2 6', width: 1.2 },
    data: { color: '#dc2626', dash: '0', width: 2.2 },
};
const DependencyDiagram = ({ heatmapMode, highlightNodeIds = [], repoId: initialRepoId = null, graphEngineUrl, architectureData, }) => {
    const vscode = (0, react_1.useMemo)(() => (0, vscodeApi_1.getVsCodeApi)(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'), [graphEngineUrl]);
    const [repoId, setRepoId] = (0, react_1.useState)(initialRepoId);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [rawData, setRawData] = (0, react_1.useState)(null);
    const [contributions, setContributions] = (0, react_1.useState)(null);
    const [nodes, setNodes] = (0, react_1.useState)([]);
    const [edges, setEdges] = (0, react_1.useState)([]);
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    const [focusMode, setFocusMode] = (0, react_1.useState)('off');
    const [filters, setFilters] = (0, react_1.useState)({
        import: true,
        inheritance: true,
        library: true,
        data: true,
    });
    const heatmapState = (0, react_1.useMemo)(() => (0, heatmapUtils_1.buildHeatmap)(contributions?.contributions || [], heatmapMode), [contributions, heatmapMode]);
    const highlightSet = (0, react_1.useMemo)(() => new Set(highlightNodeIds.map((id) => (0, heatmapUtils_1.normalizePath)(id.replace(/^file:/, '')))), [highlightNodeIds]);
    (0, react_1.useEffect)(() => {
        const handler = (event) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(String(extractedRepoId));
                }
            }
        };
        window.addEventListener('message', handler);
        window.addEventListener('message', handler);
        if (vscode) {
            vscode.postMessage({ command: 'requestArchitecture' });
        }
        return () => window.removeEventListener('message', handler);
    }, [vscode]);
    (0, react_1.useEffect)(() => {
        if (initialRepoId) {
            setRepoId(initialRepoId);
        }
    }, [initialRepoId]);
    (0, react_1.useEffect)(() => {
        if (!repoId)
            return;
        let active = true;
        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await apiClient.getDependencies(repoId);
                    if (!active)
                        return;
                    if (response && response.dependencies.length > 0) {
                        setRawData(response);
                    }
                    else {
                        throw new Error('No dependencies returned from backend');
                    }
                }
                catch (backendError) {
                    console.warn('Failed to fetch dependencies from backend, falling back to graph data:', backendError);
                    if (!active)
                        return;
                    // Fallback: Derive from architectureData if available
                    if (architectureData && architectureData.edges && architectureData.nodes) {
                        const derivedDependencies = [];
                        const nodesMap = new Map(); // id -> filePath (or type)
                        // Populate helpers
                        architectureData.nodes.forEach((n) => {
                            if (n.type === 'file') {
                                nodesMap.set(n.id, n.filePath || n.id);
                            }
                            else {
                                nodesMap.set(n.id, n.label || n.id);
                            }
                        });
                        architectureData.edges.forEach((e) => {
                            if (e.type === 'imports' || e.type === 'calls' || e.type === 'inheritance') {
                                const sourceFile = nodesMap.get(e.source) || e.source;
                                const target = nodesMap.get(e.target) || e.target;
                                // Basic mapping
                                let relationship = 'IMPORTS'; // default
                                if (e.type === 'inheritance')
                                    relationship = 'INHERITS';
                                if (e.type === 'calls')
                                    relationship = 'CALLS'; // Could map to USES_TABLE or just treating as import for visibility
                                derivedDependencies.push({
                                    source_file: sourceFile,
                                    source_language: 'typescript', // default assumption
                                    target: target,
                                    target_type: 'File', // Simplified Assumption
                                    relationship: relationship,
                                    relationship_properties: {}
                                });
                            }
                        });
                        setRawData({
                            dependencies: derivedDependencies,
                            total_dependencies: derivedDependencies.length,
                            repo_id: repoId
                        });
                    }
                    else {
                        throw backendError;
                    }
                }
            }
            catch (err) {
                if (!active)
                    return;
                setError(err instanceof Error ? err.message : 'Failed to load dependencies');
            }
            finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId, architectureData]);
    (0, react_1.useEffect)(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }
        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) {
                    setContributions(response);
                }
            }
            catch {
                if (active) {
                    setContributions(null);
                }
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId, heatmapMode]);
    const filteredRecords = (0, react_1.useMemo)(() => {
        if (!rawData)
            return [];
        return rawData.dependencies.filter(record => {
            const category = getDependencyCategory(record);
            return filters[category];
        });
    }, [rawData, filters]);
    (0, react_1.useEffect)(() => {
        if (!rawData)
            return;
        const records = applyFocusMode(filteredRecords, selectedNode, focusMode);
        const nodeMap = new Map();
        const edgeMap = new Map();
        records.forEach(record => {
            const sourceId = `file:${record.source_file}`;
            const targetId = `${record.target_type}:${record.target}`;
            const category = getDependencyCategory(record);
            const sourceHeatmap = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(record.source_file));
            const sourceHighlighted = highlightSet.has((0, heatmapUtils_1.normalizePath)(record.source_file));
            if (!nodeMap.has(sourceId)) {
                nodeMap.set(sourceId, createNode(sourceId, record.source_file, 'File', sourceHeatmap?.color, sourceHeatmap?.tooltip, sourceHighlighted));
            }
            if (!nodeMap.has(targetId)) {
                const targetHighlighted = targetId.startsWith('file:') && highlightSet.has((0, heatmapUtils_1.normalizePath)(record.target));
                nodeMap.set(targetId, createNode(targetId, record.target, record.target_type, undefined, undefined, targetHighlighted));
            }
            const key = `${sourceId}|${targetId}|${category}`;
            const entry = edgeMap.get(key);
            if (entry) {
                entry.count += 1;
            }
            else {
                edgeMap.set(key, { source: sourceId, target: targetId, category, count: 1 });
            }
        });
        const nodeList = Array.from(nodeMap.values());
        const edgeList = Array.from(edgeMap.entries()).map(([key, edge]) => {
            const style = edgeStyles[edge.category];
            return {
                id: key,
                source: edge.source,
                target: edge.target,
                label: `${edge.count} ${edge.category}`,
                style: {
                    stroke: style.color,
                    strokeWidth: style.width,
                    strokeDasharray: style.dash,
                },
                labelStyle: { fill: style.color, fontSize: 10 },
                animated: edge.category === 'data',
            };
        });
        const layoutNodes = nodeList.map(node => ({
            id: node.id,
            width: 180,
            height: 50,
        }));
        const layoutEdges = edgeList.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
        }));
        const { nodes: positions } = (0, layoutAlgorithms_1.dagreLayout)(layoutNodes, layoutEdges, 'LR');
        const layoutedNodes = nodeList.map(node => ({
            ...node,
            position: positions.get(node.id) || { x: 0, y: 0 },
        }));
        setNodes(layoutedNodes);
        setEdges(edgeList);
    }, [rawData, filteredRecords, focusMode, selectedNode, heatmapState, highlightSet]);
    return (react_1.default.createElement("div", { className: "diagram-container" },
        react_1.default.createElement("div", { className: "diagram-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", null, "Dependency Diagram"),
                react_1.default.createElement("p", null, "Visualize import, inheritance, library, and data dependencies.")),
            react_1.default.createElement("div", { className: "diagram-filters" },
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.import, onChange: () => setFilters(prev => ({ ...prev, import: !prev.import })) }),
                    "Import"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.inheritance, onChange: () => setFilters(prev => ({ ...prev, inheritance: !prev.inheritance })) }),
                    "Inheritance"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.library, onChange: () => setFilters(prev => ({ ...prev, library: !prev.library })) }),
                    "Library"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.data, onChange: () => setFilters(prev => ({ ...prev, data: !prev.data })) }),
                    "Data")),
            react_1.default.createElement("div", { className: "diagram-filters focus-group" },
                react_1.default.createElement("span", null, "Focus:"),
                ['off', '1', '2', 'all'].map(mode => (react_1.default.createElement("button", { key: mode, className: focusMode === mode ? 'diagram-pill active' : 'diagram-pill', onClick: () => setFocusMode(mode) }, mode === 'off' ? 'All' : `${mode}-hop`))))),
        heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (react_1.default.createElement(HeatmapLegend_1.HeatmapLegend, { mode: heatmapMode, minMetric: heatmapState.minMetric, maxMetric: heatmapState.maxMetric })),
        isLoading && react_1.default.createElement("div", { className: "diagram-state" }, "Loading dependencies..."),
        error && react_1.default.createElement("div", { className: "diagram-state diagram-error" }, error),
        !isLoading && !error && !repoId && (react_1.default.createElement("div", { className: "diagram-state" }, "Backend repository context is not available. Run backend analysis first.")),
        !isLoading && !error && !!repoId && rawData && filteredRecords.length === 0 && (react_1.default.createElement("div", { className: "diagram-state" }, "No dependency records matched the current filters.")),
        !isLoading && !error && !!repoId && (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
            react_1.default.createElement("div", { className: "diagram-flow" },
                react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, nodeTypes: { heatmapNode: HeatmapNode_1.HeatmapNode }, fitView: true, fitViewOptions: { padding: 0.2 }, onNodeClick: (_, node) => setSelectedNode(node.id) },
                    react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 0.8 })))))));
};
exports.DependencyDiagram = DependencyDiagram;
function getDependencyCategory(record) {
    if (record.relationship === 'INHERITS')
        return 'inheritance';
    if (record.relationship === 'USES_TABLE')
        return 'data';
    if (record.relationship === 'DEPENDS_ON' && record.target_type === 'Library')
        return 'library';
    return 'import';
}
function createNode(id, label, type, heatmapColor, heatmapTooltip, isHighlighted) {
    return {
        id,
        type: 'heatmapNode',
        position: { x: 0, y: 0 },
        style: {
            padding: '8px 10px',
            borderRadius: '8px',
            background: heatmapColor || '#0f172a',
            color: '#f8fafc',
            border: isHighlighted ? '2px solid #f97316' : '1px solid #334155',
            boxShadow: isHighlighted ? '0 0 0 2px rgba(249, 115, 22, 0.6)' : undefined,
            fontSize: 11,
        },
        width: 180,
        data: {
            label,
            type,
            heatmapTooltip,
        },
    };
}
function applyFocusMode(records, selectedNode, focusMode) {
    if (!selectedNode || focusMode === 'off')
        return records;
    const targetId = selectedNode.includes(':')
        ? selectedNode.split(':').slice(1).join(':')
        : selectedNode;
    const adjacency = new Map();
    records.forEach(record => {
        const source = record.source_file;
        const target = record.target;
        if (!adjacency.has(source))
            adjacency.set(source, new Set());
        adjacency.get(source)?.add(target);
        if (!adjacency.has(target))
            adjacency.set(target, new Set());
        adjacency.get(target)?.add(source);
    });
    const maxDepth = focusMode === 'all' ? 99 : parseInt(focusMode, 10);
    const queue = [{ id: targetId, depth: 0 }];
    const visited = new Set([targetId]);
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current)
            break;
        if (current.depth >= maxDepth)
            continue;
        const neighbors = adjacency.get(current.id);
        if (!neighbors)
            continue;
        neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push({ id: neighbor, depth: current.depth + 1 });
            }
        });
    }
    return records.filter(record => visited.has(record.source_file) || visited.has(record.target));
}
//# sourceMappingURL=DependencyDiagram.js.map