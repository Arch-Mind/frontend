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
exports.ModuleBoundaryDiagram = void 0;
const react_1 = __importStar(require("react"));
const webviewClient_1 = require("../api/webviewClient");
const HeatmapLegend_1 = require("./HeatmapLegend");
const heatmapUtils_1 = require("./heatmapUtils");
const vscodeApi_1 = require("../utils/vscodeApi");
const boundaryTypeOrder = ['physical', 'logical', 'architectural'];
const boundaryTypeDescriptions = {
    physical: 'Workspaces, repos, and packages detected from manifests.',
    logical: 'Directory or namespace clusters inferred from structure.',
    architectural: 'Layered groupings inferred from heuristics.',
};
const layerStyles = {
    Presentation: 'layer-pill layer-presentation',
    BusinessLogic: 'layer-pill layer-business',
    DataAccess: 'layer-pill layer-data',
    Infrastructure: 'layer-pill layer-infra',
    Unknown: 'layer-pill layer-unknown',
};
const ModuleBoundaryDiagram = ({ heatmapMode, highlightNodeIds = [], repoId: initialRepoId = null, graphEngineUrl, architectureData, localContributions, }) => {
    const vscode = (0, react_1.useMemo)(() => (0, vscodeApi_1.getVsCodeApi)(), []);
    const apiClient = (0, react_1.useMemo)(() => new webviewClient_1.ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'), [graphEngineUrl]);
    const [repoId, setRepoId] = (0, react_1.useState)(initialRepoId);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [data, setData] = (0, react_1.useState)(null);
    const [insights, setInsights] = (0, react_1.useState)(null);
    const [expandedBoundaryId, setExpandedBoundaryId] = (0, react_1.useState)(null);
    const [contributions, setContributions] = (0, react_1.useState)(localContributions || null);
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
                    const [boundaries, analysis] = await Promise.all([
                        apiClient.getModuleBoundaries(repoId),
                        apiClient.getArchitectureInsights(repoId).catch(() => null),
                    ]);
                    if (!active)
                        return;
                    if (boundaries && boundaries.boundaries.length > 0) {
                        setData(boundaries);
                        setInsights(analysis);
                    }
                    else {
                        throw new Error('No boundaries returned from backend');
                    }
                }
                catch (backendError) {
                    if (!active)
                        return;
                    console.warn('ModuleBoundaryDiagram: Fallback to derived boundaries', backendError);
                    if (architectureData && architectureData.nodes) {
                        const files = architectureData.nodes.filter((n) => n.type === 'file');
                        const dirMap = new Map();
                        files.forEach((node) => {
                            const pathStr = node.filePath || node.id;
                            const parts = pathStr.split('/');
                            let dir = 'root';
                            if (parts.length > 2) {
                                dir = parts.slice(0, 2).join('/');
                            }
                            else if (parts.length > 1) {
                                dir = parts[0];
                            }
                            if (!dirMap.has(dir))
                                dirMap.set(dir, []);
                            dirMap.get(dir)?.push(pathStr);
                        });
                        const derived = Array.from(dirMap.entries()).map(([dir, files], index) => ({
                            id: `local-${dir.replace(/[\/\.]/g, '-')}`,
                            name: dir,
                            path: dir,
                            type: 'physical',
                            files: files,
                            file_count: files.length,
                            layer: 'Unknown'
                        }));
                        setData({
                            boundaries: derived,
                            total_boundaries: derived.length,
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
                setError(err instanceof Error ? err.message : 'Failed to load boundaries');
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
    const groups = (0, react_1.useMemo)(() => {
        const boundaries = data?.boundaries || [];
        const grouped = {};
        boundaries.forEach(boundary => {
            const key = boundary.type || 'unknown';
            if (!grouped[key])
                grouped[key] = [];
            grouped[key].push(boundary);
        });
        return boundaryTypeOrder
            .filter(type => grouped[type]?.length)
            .map(type => ({
            title: type[0].toUpperCase() + type.slice(1),
            description: boundaryTypeDescriptions[type] || '',
            boundaries: grouped[type] || [],
        }));
    }, [data]);
    return (react_1.default.createElement("div", { className: "boundary-view" },
        react_1.default.createElement("div", { className: "boundary-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", { className: "boundary-title" }, "Module Boundaries"),
                react_1.default.createElement("p", { className: "boundary-subtitle" }, "Detailed analysis of code ownership and logical groupings."))),
        heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (react_1.default.createElement(HeatmapLegend_1.HeatmapLegend, { mode: heatmapMode, minMetric: heatmapState.minMetric, maxMetric: heatmapState.maxMetric })),
        isLoading && react_1.default.createElement("div", { className: "boundary-state" }, "Loading boundaries..."),
        error && react_1.default.createElement("div", { className: "boundary-state boundary-error" }, error),
        !isLoading && !error && !repoId && react_1.default.createElement("div", { className: "boundary-state" }, "Missing context."),
        react_1.default.createElement("div", { className: "boundary-grid" }, groups.map(group => (react_1.default.createElement("div", { key: group.title, className: "boundary-column" },
            react_1.default.createElement("div", { className: "boundary-column-header" },
                react_1.default.createElement("h3", null, group.title),
                react_1.default.createElement("p", null, group.description)),
            react_1.default.createElement("div", { className: "boundary-cards" }, group.boundaries.map(boundary => {
                const isExpanded = expandedBoundaryId === boundary.id;
                const layerClass = layerStyles[boundary.layer || 'Unknown'] || layerStyles.Unknown;
                const heatmap = heatmapMode === 'off' ? null : getBoundaryHeatmap(boundary, heatmapState);
                const isHighlighted = boundary.files.some(file => highlightSet.has((0, heatmapUtils_1.normalizePath)(file)));
                return (react_1.default.createElement("div", { key: boundary.id, className: "boundary-card", style: {
                        borderColor: heatmap?.color,
                        boxShadow: isHighlighted ? '0 0 10px rgba(249, 115, 22, 0.5)' : undefined,
                    }, title: heatmap?.tooltip || '' },
                    react_1.default.createElement("div", { className: "boundary-card-header" },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("div", { className: "boundary-name" }, boundary.name),
                            boundary.path && react_1.default.createElement("div", { className: "boundary-path" }, boundary.path)),
                        boundary.layer && (react_1.default.createElement("span", { className: layerClass }, boundary.layer))),
                    react_1.default.createElement("div", { className: "boundary-card-meta" },
                        react_1.default.createElement("span", null,
                            boundary.file_count,
                            " files"),
                        react_1.default.createElement("button", { className: "boundary-toggle", onClick: () => setExpandedBoundaryId(isExpanded ? null : boundary.id) }, isExpanded ? 'Hide' : 'Show')),
                    isExpanded && (react_1.default.createElement("ul", { className: "boundary-files" },
                        boundary.files.slice(0, 15).map(file => (react_1.default.createElement("li", { key: file }, file))),
                        boundary.files.length > 15 && (react_1.default.createElement("li", { className: "boundary-more" },
                            "+",
                            boundary.files.length - 15,
                            " more"))))));
            }))))))));
};
exports.ModuleBoundaryDiagram = ModuleBoundaryDiagram;
function getBoundaryHeatmap(boundary, heatmapState) {
    let hottest = null;
    boundary.files.forEach(file => {
        const entry = (0, heatmapUtils_1.findHeatmapEntry)(heatmapState, file);
        if (!entry)
            return;
        if (!hottest || entry.metric > hottest.metric) {
            hottest = { color: entry.color, tooltip: entry.tooltip, metric: entry.metric };
        }
    });
    return hottest;
}
//# sourceMappingURL=ModuleBoundaryDiagram.js.map