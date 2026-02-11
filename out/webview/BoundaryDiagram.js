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
const layoutAlgorithms_1 = require("./layoutAlgorithms");
const webviewClient_1 = require("../api/webviewClient");
const HeatmapLegend_1 = require("./HeatmapLegend");
const heatmapUtils_1 = require("./heatmapUtils");
const boundaryColors = {
    physical: '#3b82f6',
    logical: '#22c55e',
    architectural: '#f59e0b',
};
const defaultBoundaryColor = '#94a3b8';
const boundaryNodeTypes = {
    boundaryNode: BoundaryNode,
    fileDot: FileNode,
};
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
function BoundaryNode({ data }) {
    const color = boundaryColors[data.boundary.type] || defaultBoundaryColor;
    const ring = data.isHighlighted ? '0 0 0 3px rgba(249, 115, 22, 0.75)' : undefined;
    return (react_1.default.createElement("div", { className: "boundary-diagram-node", style: {
            borderColor: color,
            boxShadow: ring || (data.heatmapColor ? `0 0 0 2px ${data.heatmapColor}` : undefined),
        }, title: data.heatmapTooltip || data.summary || '' },
        react_1.default.createElement("div", { className: "boundary-node-header", style: { color } },
            react_1.default.createElement("span", null, data.boundary.name),
            data.boundary.layer && (react_1.default.createElement("span", { className: "boundary-layer-pill" }, data.boundary.layer))),
        data.boundary.path && react_1.default.createElement("div", { className: "boundary-node-path" }, data.boundary.path),
        react_1.default.createElement("div", { className: "boundary-node-meta" },
            data.boundary.file_count,
            " files")));
}
function FileNode({ data }) {
    return (react_1.default.createElement("div", { className: "boundary-file-dot", style: {
            backgroundColor: data?.heatmapColor || undefined,
            boxShadow: data?.isHighlighted ? '0 0 0 2px rgba(249, 115, 22, 0.75)' : undefined,
        }, title: data?.heatmapTooltip || '' }));
}
const BoundaryDiagram = ({ heatmapMode, highlightNodeIds = [], repoId: initialRepoId = null, graphEngineUrl, }) => {
    const vscode = (0, react_1.useMemo)(() => acquireVsCodeApi(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'), [graphEngineUrl]);
    const [repoId, setRepoId] = (0, react_1.useState)(initialRepoId);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [boundaryData, setBoundaryData] = (0, react_1.useState)(null);
    const [insights, setInsights] = (0, react_1.useState)(null);
    const [contributions, setContributions] = (0, react_1.useState)(null);
    const [nodes, setNodes] = (0, react_1.useState)([]);
    const [edges, setEdges] = (0, react_1.useState)([]);
    const [highlightBoundaryId, setHighlightBoundaryId] = (0, react_1.useState)(null);
    const [filters, setFilters] = (0, react_1.useState)({
        physical: true,
        logical: true,
        architectural: true,
        showFiles: true,
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
            if (message?.command === 'revealBoundaryFile' && message.filePath && boundaryData) {
                const normalized = (0, heatmapUtils_1.normalizePath)(message.filePath);
                const match = boundaryData.boundaries.find(boundary => boundary.files.some(file => (0, heatmapUtils_1.normalizePath)(file) === normalized));
                if (match) {
                    setHighlightBoundaryId(match.id);
                }
                setFilters(prev => ({ ...prev, showFiles: true }));
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => window.removeEventListener('message', handler);
    }, [vscode, boundaryData]);
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
                const [boundaries, analysis] = await Promise.all([
                    apiClient.getModuleBoundaries(repoId),
                    apiClient.getArchitectureInsights(repoId).catch(() => null),
                ]);
                if (!active)
                    return;
                setBoundaryData(boundaries);
                setInsights(analysis);
            }
            catch (err) {
                if (!active)
                    return;
                setError(err instanceof Error ? err.message : 'Failed to load boundaries');
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
    }, [apiClient, repoId]);
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
    const summaryByBoundary = (0, react_1.useMemo)(() => {
        const map = new Map();
        if (!insights?.insights)
            return map;
        insights.insights.forEach(item => {
            if (item.pattern_type?.startsWith('module_summary:')) {
                const name = item.pattern_type.replace('module_summary:', '').trim();
                map.set(name, item.summary);
            }
        });
        return map;
    }, [insights]);
    (0, react_1.useEffect)(() => {
        if (!boundaryData)
            return;
        const filteredBoundaries = boundaryData.boundaries.filter(boundary => {
            if (boundary.type === 'physical')
                return filters.physical;
            if (boundary.type === 'logical')
                return filters.logical;
            if (boundary.type === 'architectural')
                return filters.architectural;
            return true;
        });
        const boundaryNodes = filteredBoundaries.map(boundary => {
            const hottest = getBoundaryHeatmap(boundary, heatmapState);
            const isHighlighted = highlightBoundaryId === boundary.id ||
                boundary.files.some(file => highlightSet.has((0, heatmapUtils_1.normalizePath)(file)));
            return {
                id: `boundary:${boundary.id}`,
                type: 'boundaryNode',
                position: { x: 0, y: 0 },
                data: {
                    boundary,
                    summary: summaryByBoundary.get(boundary.name) || '',
                    heatmapColor: hottest?.color,
                    heatmapTooltip: hottest?.tooltip,
                    isHighlighted,
                },
                draggable: false,
                selectable: true,
                style: {
                    width: 260,
                    height: 120,
                    boxShadow: isHighlighted ? '0 0 12px rgba(249, 115, 22, 0.6)' : undefined,
                },
            };
        });
        const fileNodes = [];
        if (filters.showFiles) {
            filteredBoundaries.forEach(boundary => {
                const parentId = `boundary:${boundary.id}`;
                const files = boundary.files || [];
                const columns = Math.max(3, Math.ceil(Math.sqrt(files.length)));
                files.forEach((file, index) => {
                    const row = Math.floor(index / columns);
                    const col = index % columns;
                    const entry = heatmapState.entries.get((0, heatmapUtils_1.normalizePath)(file));
                    const isHighlighted = highlightSet.has((0, heatmapUtils_1.normalizePath)(file));
                    fileNodes.push({
                        id: `file:${boundary.id}:${index}`,
                        type: 'fileDot',
                        position: {
                            x: 16 + col * 14,
                            y: 44 + row * 12,
                        },
                        parentNode: parentId,
                        extent: 'parent',
                        draggable: false,
                        selectable: false,
                        data: {
                            file,
                            heatmapColor: entry?.color,
                            heatmapTooltip: entry?.tooltip,
                            isHighlighted,
                        },
                    });
                });
            });
        }
        const layoutNodes = boundaryNodes.map(node => ({
            id: node.id,
            width: 260,
            height: 140,
        }));
        const applyLayout = async () => {
            try {
                const { nodes: positions } = await (0, layoutAlgorithms_1.elkLayout)(layoutNodes, [], 'layered');
                const layoutedBoundaries = boundaryNodes.map(node => {
                    const pos = positions.get(node.id) || { x: 0, y: 0 };
                    return { ...node, position: pos };
                });
                setNodes([...layoutedBoundaries, ...fileNodes]);
                setEdges([]);
            }
            catch (err) {
                console.error('Layout failed:', err);
                setError('Failed to calculate layout for boundary diagram.');
            }
        };
        applyLayout();
    }, [boundaryData, filters, summaryByBoundary, heatmapState, highlightBoundaryId, highlightSet]);
    return (react_1.default.createElement("div", { className: "diagram-container" },
        react_1.default.createElement("div", { className: "diagram-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", null, "Boundary Diagram"),
                react_1.default.createElement("p", null, "Grouped view of detected module boundaries.")),
            react_1.default.createElement("div", { className: "diagram-filters" },
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.physical, onChange: () => setFilters(prev => ({ ...prev, physical: !prev.physical })) }),
                    "Physical"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.logical, onChange: () => setFilters(prev => ({ ...prev, logical: !prev.logical })) }),
                    "Logical"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.architectural, onChange: () => setFilters(prev => ({ ...prev, architectural: !prev.architectural })) }),
                    "Architectural"),
                react_1.default.createElement("label", null,
                    react_1.default.createElement("input", { type: "checkbox", checked: filters.showFiles, onChange: () => setFilters(prev => ({ ...prev, showFiles: !prev.showFiles })) }),
                    "Show files"))),
        heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (react_1.default.createElement(HeatmapLegend_1.HeatmapLegend, { mode: heatmapMode, minMetric: heatmapState.minMetric, maxMetric: heatmapState.maxMetric })),
        isLoading && react_1.default.createElement("div", { className: "diagram-state" }, "Loading boundaries..."),
        error && react_1.default.createElement("div", { className: "diagram-state diagram-error" }, error),
        !isLoading && !error && !repoId && (react_1.default.createElement("div", { className: "diagram-state" }, "Backend repository context is not available. Run backend analysis first.")),
        !isLoading && !error && !!repoId && boundaryData && boundaryData.boundaries.length === 0 && (react_1.default.createElement("div", { className: "diagram-state" }, "No boundaries were returned for this repository.")),
        !isLoading && !error && !!repoId && (react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
            react_1.default.createElement("div", { className: "diagram-flow" },
                react_1.default.createElement(reactflow_1.default, { nodes: nodes, edges: edges, nodeTypes: boundaryNodeTypes, fitView: true, fitViewOptions: { padding: 0.2 } },
                    react_1.default.createElement(reactflow_1.Background, { variant: reactflow_1.BackgroundVariant.Dots, gap: 16, size: 0.8 })))))));
};
exports.BoundaryDiagram = BoundaryDiagram;
//# sourceMappingURL=BoundaryDiagram.js.map