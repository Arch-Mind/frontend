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
exports.ReverseImpactAnalysisPanel = void 0;
exports.useReverseImpactAnalysis = useReverseImpactAnalysis;
const react_1 = __importStar(require("react"));
const ReverseImpactAnalysisPanel = ({ filePath, backendUrl, repoId, onClose, onNodeClick, }) => {
    const { data, isLoading, error } = useReverseImpactAnalysis(filePath, backendUrl, repoId);
    const [expandedTier, setExpandedTier] = (0, react_1.useState)(true);
    if (!filePath)
        return null;
    const getSeverityColor = (tier) => {
        switch (tier) {
            case 'Critical': return '#e74c3c'; // Red
            case 'High': return '#e67e22'; // Orange
            case 'Medium': return '#f39c12'; // Yellow
            case 'Low': return '#2ecc71'; // Green
            default: return '#3498db'; // Default blue
        }
    };
    return (react_1.default.createElement("div", { className: "impact-analysis-panel reverse-impact-panel" },
        react_1.default.createElement("div", { className: "impact-header" },
            react_1.default.createElement("div", { className: "impact-title" },
                react_1.default.createElement("span", { className: "impact-icon" }, "\uD83C\uDFAF"),
                react_1.default.createElement("span", null, "Reverse Impact Analysis")),
            react_1.default.createElement("button", { className: "impact-close-btn", onClick: onClose, title: "Close" }, "\u2715")),
        isLoading && (react_1.default.createElement("div", { className: "impact-loading" },
            react_1.default.createElement("div", { className: "loading-spinner" }),
            react_1.default.createElement("span", null, "Analyzing impact..."))),
        error && (react_1.default.createElement("div", { className: "impact-error" },
            react_1.default.createElement("span", null,
                "\u26A0\uFE0F ",
                error))),
        data && (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement("div", { className: "impact-summary" },
                react_1.default.createElement("div", { className: "impact-stat" },
                    react_1.default.createElement("span", { className: "stat-label" }, "Target File:"),
                    react_1.default.createElement("span", { className: "stat-value", title: data.target_file }, data.target_file.split(/[/\\]/).pop() || data.target_file)),
                react_1.default.createElement("div", { className: "impact-stat" },
                    react_1.default.createElement("span", { className: "stat-label" }, "Total Impact:"),
                    react_1.default.createElement("span", { className: "stat-value" },
                        data.impact_count,
                        " dependents"))),
            react_1.default.createElement("div", { className: "severity-section", style: {
                    marginTop: '15px',
                    padding: '12px',
                    backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${getSeverityColor(data.severity_tier)}`
                } },
                react_1.default.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                    react_1.default.createElement("div", { style: { fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' } },
                        react_1.default.createElement("span", null, "Severity:"),
                        react_1.default.createElement("span", { style: {
                                color: getSeverityColor(data.severity_tier),
                                textTransform: 'uppercase',
                                fontWeight: '800'
                            } }, data.severity_tier)),
                    react_1.default.createElement("div", { style: { fontSize: '18px', fontWeight: 'bold' } },
                        data.severity_score,
                        " ",
                        react_1.default.createElement("span", { style: { fontSize: '12px', color: 'var(--vscode-descriptionForeground)' } }, "/ 100"))),
                react_1.default.createElement("div", { style: { fontSize: '12px', display: 'flex', gap: '15px', color: 'var(--vscode-descriptionForeground)' } },
                    react_1.default.createElement("span", null,
                        "Churn: ",
                        data.metrics?.churn || 0),
                    react_1.default.createElement("span", null,
                        "PageRank: ",
                        (data.metrics?.pagerank || 0).toFixed(4)))),
            react_1.default.createElement("div", { className: "impact-levels", style: { marginTop: '15px' } },
                react_1.default.createElement("div", { className: "impact-level" },
                    react_1.default.createElement("div", { className: "impact-level-header", onClick: () => setExpandedTier(!expandedTier) },
                        react_1.default.createElement("div", { className: "level-indicator", style: { backgroundColor: getSeverityColor(data.severity_tier) } }),
                        react_1.default.createElement("div", { className: "level-info" },
                            react_1.default.createElement("span", { className: "level-distance" }, "Upstream Dependencies"),
                            react_1.default.createElement("span", { className: "level-count" },
                                data.upstream_dependencies?.length || 0,
                                " node",
                                (data.upstream_dependencies?.length || 0) !== 1 ? 's' : '')),
                        react_1.default.createElement("span", { className: "level-toggle" }, expandedTier ? '▼' : '▶')),
                    expandedTier && data.upstream_dependencies && data.upstream_dependencies.length > 0 && (react_1.default.createElement("div", { className: "impact-level-nodes" }, data.upstream_dependencies.map((dep, index) => (react_1.default.createElement("div", { key: `${dep.id}-${index}`, className: "impact-node-item", onClick: () => onNodeClick?.(dep.id) },
                        react_1.default.createElement("span", { className: "node-type-badge", title: `Depth: ${dep.depth}` }, dep.depth === 1 ? '←' : '⤶'),
                        react_1.default.createElement("div", { style: { display: 'flex', flexDirection: 'column' } },
                            react_1.default.createElement("span", { className: "node-id" }, dep.id.split('/').pop() || dep.id),
                            react_1.default.createElement("span", { style: { fontSize: '10px', color: 'var(--vscode-descriptionForeground)' } },
                                dep.type,
                                " \u2022 Distance: ",
                                dep.depth))))))),
                    expandedTier && (!data.upstream_dependencies || data.upstream_dependencies.length === 0) && (react_1.default.createElement("div", { className: "impact-level-nodes", style: { padding: '10px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic', fontSize: '12px' } }, "No upstream dependencies found.")))))),
        react_1.default.createElement("div", { className: "impact-actions" },
            react_1.default.createElement("button", { className: "impact-btn", onClick: onClose }, "Close"))));
};
exports.ReverseImpactAnalysisPanel = ReverseImpactAnalysisPanel;
/**
 * Hook for fetching reverse impact analysis data
 */
function useReverseImpactAnalysis(filePath, backendUrl, repoId) {
    const [data, setData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const formatToRelativeUnixPath = (absolutePath) => {
        if (!absolutePath)
            return '';
        // 1. Replace all Windows backslashes with forward slashes
        let unixPath = absolutePath.replace(/\\/g, '/');
        // 2. Strip away everything before the root of the actual project 
        // (matches local paths like .../FULL STACK/MathVerse/... or ArchMind...)
        const match = unixPath.match(/.*\/(?:MathVerse|ArchMind-Frontend|ArchMind-Backend)\/(.*)/);
        if (match && match[1]) {
            return match[1];
        }
        // 3. Generic fallback: extract from 'src/' or 'backend/' onwards
        const srcIndex = unixPath.indexOf('/src/');
        if (srcIndex !== -1) {
            return unixPath.substring(srcIndex + 1);
        }
        return unixPath;
    };
    const fetchReverseImpact = async (targetPath) => {
        setIsLoading(true);
        setError(null);
        try {
            const relativeUnixPath = formatToRelativeUnixPath(targetPath);
            const normalizedBackendUrl = (backendUrl ?? '').replace(/\/+$/, '');
            let url = `${normalizedBackendUrl}/api/v1/analyze/impact?file_path=${encodeURIComponent(relativeUnixPath)}`;
            if (repoId) {
                url += `&repo_id=${encodeURIComponent(repoId)}`;
            }
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            setData(result);
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch reverse impact analysis';
            setError(errorMsg);
            console.error('Reverse impact analysis error:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (filePath && backendUrl) {
            fetchReverseImpact(filePath);
        }
    }, [filePath, backendUrl]);
    return { data, isLoading, error, fetchReverseImpact };
}
//# sourceMappingURL=ReverseImpactAnalysis.js.map