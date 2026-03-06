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
    import: { color: '#64748b', dash: '0', width: 1.2 },
    inheritance: { color: '#8b5cf6', dash: '5 5', width: 1.5 },
    library: { color: '#f59e0b', dash: '2 2', width: 1.2 },
    data: { color: '#ef4444', dash: '0', width: 2.0 },
};
const DependencyDiagram = ({ heatmapMode, highlightNodeIds = [], repoId: initialRepoId = null, graphEngineUrl, architectureData, localContributions, }) => {
    const vscode = (0, react_1.useMemo)(() => (0, vscodeApi_1.getVsCodeApi)(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'), [graphEngineUrl]);
    const [repoId, setRepoId] = (0, react_1.useState)(initialRepoId);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [rawData, setRawData] = (0, react_1.useState)(null);
    const [contributions, setContributions] = (0, react_1.useState)(localContributions || null);
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
        if (vscode) {
            vscode.postMessage({ command: 'requestArchitecture' });
        }
        return () => window.removeEventListener('message', handler);
    }, [vscode]);
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
                    if (!active)
                        return;
                    console.warn('DependencyDiagram: Fallback to architectureData', backendError);
                    if (architectureData && architectureData.edges) {
                        const filePathMap = new Map();
                        const typeMap = new Map();
                        architectureData.nodes.forEach((n) => {
                            filePathMap.set(n.id, n.filePath || n.id);
                            typeMap.set(n.id, n.type);
                        });
                        const derived = architectureData.edges
                            .filter((e) => ['imports', 'calls', 'inheritance'].includes(e.type))
                            .map((e) => {
                            const targetId = e.target;
                            const targetType = typeMap.get(targetId) || 'File';
                            return {
                                source_file: filePathMap.get(e.source) || e.source,
                                source_language: 'typescript',
                                target: filePathMap.get(targetId) || targetId,
                                target_type: targetType.charAt(0).toUpperCase() + targetType.slice(1),
                                relationship: e.type === 'inheritance' ? 'INHERITS' :
                                    e.type === 'calls' ? 'CALLS' : 'IMPORTS',
                                relationship_properties: {}
                            };
                        });
                        setRawData({
                            dependencies: derived,
                            total_dependencies: derived.length,
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
                if (active)
                    setIsLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [apiClient, repoId, architectureData]);
    (0, react_1.useEffect)(() => {
        if (localContributions) {
            setContributions(localContributions);
            return;
        }
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
            catch {
                if (active)
                    setContributions(null);
            }
        };
        load();
        return () => { active = false; };
    }, [apiClient, repoId, heatmapMode, localContributions]);
    (0, react_1.useEffect)(() => {
        if (!rawData)
            return;
        let records = rawData.dependencies.filter(record => filters[getDependencyCategory(record)]);
        records = applyFocusMode(records, selectedNode, focusMode);
        const nodeMap = new Map();
        const edgeMap = new Map();
        records.forEach(record => {
            const sourceId = `file:${record.source_file}`;
            const targetId = `${record.target_type}:${record.target}`;
            const category = getDependencyCategory(record);
            if (!nodeMap.has(sourceId)) {
                const heatmap = (0, heatmapUtils_1.findHeatmapEntry)(heatmapState, record.source_file);
                const highlighted = highlightSet.has((0, heatmapUtils_1.normalizePath)(record.source_file));
                nodeMap.set(sourceId, createNode(sourceId, record.source_file, 'File', heatmap?.color, heatmap?.tooltip, highlighted));
            }
            if (!nodeMap.has(targetId)) {
                const isFile = record.target_type === 'File';
                const heatmap = isFile ? (0, heatmapUtils_1.findHeatmapEntry)(heatmapState, record.target) : undefined;
                const highlighted = isFile ? highlightSet.has((0, heatmapUtils_1.normalizePath)(record.target)) : false;
                nodeMap.set(targetId, createNode(targetId, record.target, record.target_type, heatmap?.color, heatmap?.tooltip, highlighted));
            }
            const key = `${sourceId}|${targetId}|${category}`;
            const existing = edgeMap.get(key);
            if (existing)
                existing.count++;
            else
                edgeMap.set(key, { source: sourceId, target: targetId, category, count: 1 });
        });
        const nodeList = Array.from(nodeMap.values());
        const edgeList = Array.from(edgeMap.entries()).map(([key, edge]) => {
            const style = edgeStyles[edge.category];
            return {
                id: key,
                source: edge.source,
                target: edge.target,
                label: edge.count > 1 ? `${edge.count} ${edge.category}` : edge.category,
                style: {
                    stroke: style.color,
                    strokeWidth: style.width,
                    strokeDasharray: style.dash,
                },
                labelStyle: { fill: style.color, fontSize: 10 },
                markerEnd: { type: reactflow_1.MarkerType.ArrowClosed, color: style.color },
            };
        });
        // Dagre layout
        const layoutNodes = nodeList.map(n => ({ id: n.id, width: 220, height: 60 }));
        const { nodes: positions } = (0, layoutAlgorithms_1.dagreLayout)(layoutNodes, edgeList.map(e => ({ id: e.id, source: e.source, target: e.target })), 'LR');
        const layoutedNodes = nodeList.map(node => ({
            ...node,
            position: positions.get(node.id) || { x: 0, y: 0 }
        }));
        setNodes(layoutedNodes);
        setEdges(edgeList);
    }, [rawData, filters, focusMode, selectedNode, heatmapState, highlightSet]);
    return (react_1.default.createElement("div", { className: "diagram-container" },
        react_1.default.createElement("div", { className: "diagram-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", null, "Dependency Diagram"),
                react_1.default.createElement("p", null, "Visualizing relationships and dependencies across the codebase.")),
            react_1.default.createElement("div", { className: "diagram-filters" }, Object.keys(filters).map(key => (react_1.default.createElement("label", { key: key },
                react_1.default.createElement("input", { type: "checkbox", checked: filters[key], onChange: () => setFilters(prev => ({ ...prev, [key]: !prev[key] })) }),
                key.charAt(0).toUpperCase() + key.slice(1))))),
            react_1.default.createElement("div", { className: "diagram-filters focus-options" },
                react_1.default.createElement("span", null, "Focus Depth:"),
                ['off', '1', '2', 'all'].map(mode => (react_1.default.createElement("button", { key: mode, className: focusMode === mode ? 'diagram-pill active' : 'diagram-pill', onClick: () => setFocusMode(mode) }, mode === 'off' ? 'All' : `${mode}-hop`))))),
        heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (react_1.default.createElement(HeatmapLegend_1.HeatmapLegend, { mode: heatmapMode, minMetric: heatmapState.minMetric, maxMetric: heatmapState.maxMetric })),
        isLoading && react_1.default.createElement("div", { className: "diagram-state" }, "Loading dependencies..."),
        error && react_1.default.createElement("div", { className: "diagram-state diagram-error" }, error),
        !isLoading && !error && !repoId && react_1.default.createElement("div", { className: "diagram-state" }, "Missing context."),
        !isLoading && !error && !!repoId && (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
            react_1.default.createElement("div", { className: "diagram-flow" },
                react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, nodeTypes: { heatmapNode: HeatmapNode_1.HeatmapNode }, fitView: true, fitViewOptions: { padding: 0.2 }, onNodeClick: (_, node) => setSelectedNode(node.id), onPaneClick: () => setSelectedNode(null) },
                    react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 0.8 })))))));
};
exports.DependencyDiagram = DependencyDiagram;
function getDependencyCategory(record) {
    if (record.relationship === 'INHERITS')
        return 'inheritance';
    if (record.relationship === 'USES_TABLE')
        return 'data';
    if (record.target_type === 'Library')
        return 'library';
    return 'import';
}
function createNode(id, label, type, heatmapColor, heatmapTooltip, isHighlighted) {
    return {
        id,
        type: 'heatmapNode',
        data: { label, type, heatmapTooltip },
        position: { x: 0, y: 0 },
        style: {
            padding: '10px',
            borderRadius: '9px',
            background: heatmapColor || '#0f172a',
            color: '#f8fafc',
            border: isHighlighted ? '2px solid #f97316' : '1px solid #334155',
            boxShadow: isHighlighted ? '0 0 10px rgba(249, 115, 22, 0.4)' : undefined,
            fontSize: 12,
        },
        width: 220,
    };
}
function applyFocusMode(records, selectedNode, mode) {
    if (!selectedNode || mode === 'off')
        return records;
    const target = selectedNode.includes(':') ? selectedNode.split(':').slice(1).join(':') : selectedNode;
    const adj = new Map();
    records.forEach(r => {
        if (!adj.has(r.source_file))
            adj.set(r.source_file, new Set());
        adj.get(r.source_file)?.add(r.target);
        if (!adj.has(r.target))
            adj.set(r.target, new Set());
        adj.get(r.target)?.add(r.source_file);
    });
    const depthLimit = mode === 'all' ? 99 : parseInt(mode, 10);
    const visited = new Set([target]);
    const queue = [{ id: target, d: 0 }];
    while (queue.length > 0) {
        const { id, d } = queue.shift();
        if (d >= depthLimit)
            continue;
        adj.get(id)?.forEach(n => {
            if (!visited.has(n)) {
                visited.add(n);
                queue.push({ id: n, d: d + 1 });
            }
        });
    }
    return records.filter(r => visited.has(r.source_file) || visited.has(r.target));
}
//# sourceMappingURL=DependencyDiagram.js.map