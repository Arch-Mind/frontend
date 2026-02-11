"use strict";
/**
 * Impact Analysis Component (Issue #15)
 * Visualizes the impact radius when a node is selected
 */
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
exports.ImpactAnalysisPanel = void 0;
exports.useImpactAnalysis = useImpactAnalysis;
const react_1 = __importStar(require("react"));
const ImpactAnalysisPanel = ({ data, onClose, onNodeClick, }) => {
    const [expandedDepth, setExpandedDepth] = (0, react_1.useState)(null);
    if (!data)
        return null;
    // Group nodes by distance
    const nodesByDistance = new Map();
    data.affectedNodes.forEach(node => {
        const group = nodesByDistance.get(node.distance) || [];
        group.push(node);
        nodesByDistance.set(node.distance, group);
    });
    // Get color for distance level
    const getDistanceColor = (distance) => {
        const colors = [
            '#e74c3c', // Red - 1 hop
            '#e67e22', // Orange - 2 hops
            '#f39c12', // Yellow - 3 hops
            '#3498db', // Blue - 4+ hops
        ];
        return colors[Math.min(distance - 1, colors.length - 1)];
    };
    return (react_1.default.createElement("div", { className: "impact-analysis-panel" },
        react_1.default.createElement("div", { className: "impact-header" },
            react_1.default.createElement("div", { className: "impact-title" },
                react_1.default.createElement("span", { className: "impact-icon" }, "\uD83D\uDCA5"),
                react_1.default.createElement("span", null, "Impact Analysis")),
            react_1.default.createElement("button", { className: "impact-close-btn", onClick: onClose, title: "Close" }, "\u2715")),
        react_1.default.createElement("div", { className: "impact-summary" },
            react_1.default.createElement("div", { className: "impact-stat" },
                react_1.default.createElement("span", { className: "stat-label" }, "Total Impact:"),
                react_1.default.createElement("span", { className: "stat-value" },
                    data.totalImpact,
                    " nodes")),
            react_1.default.createElement("div", { className: "impact-stat" },
                react_1.default.createElement("span", { className: "stat-label" }, "Max Distance:"),
                react_1.default.createElement("span", { className: "stat-value" },
                    data.maxDepth,
                    " hops"))),
        react_1.default.createElement("div", { className: "impact-legend" },
            react_1.default.createElement("div", { className: "legend-title" }, "Impact Levels:"),
            react_1.default.createElement("div", { className: "legend-items" },
                react_1.default.createElement("div", { className: "legend-item" },
                    react_1.default.createElement("div", { className: "legend-color", style: { backgroundColor: '#e74c3c' } }),
                    react_1.default.createElement("span", null, "1 hop (Direct)")),
                react_1.default.createElement("div", { className: "legend-item" },
                    react_1.default.createElement("div", { className: "legend-color", style: { backgroundColor: '#e67e22' } }),
                    react_1.default.createElement("span", null, "2 hops")),
                react_1.default.createElement("div", { className: "legend-item" },
                    react_1.default.createElement("div", { className: "legend-color", style: { backgroundColor: '#f39c12' } }),
                    react_1.default.createElement("span", null, "3 hops")),
                react_1.default.createElement("div", { className: "legend-item" },
                    react_1.default.createElement("div", { className: "legend-color", style: { backgroundColor: '#3498db' } }),
                    react_1.default.createElement("span", null, "4+ hops")))),
        react_1.default.createElement("div", { className: "impact-levels" }, Array.from(nodesByDistance.entries())
            .sort(([a], [b]) => a - b)
            .map(([distance, nodes]) => (react_1.default.createElement("div", { key: distance, className: "impact-level" },
            react_1.default.createElement("div", { className: "impact-level-header", onClick: () => setExpandedDepth(expandedDepth === distance ? null : distance) },
                react_1.default.createElement("div", { className: "level-indicator", style: { backgroundColor: getDistanceColor(distance) } }),
                react_1.default.createElement("div", { className: "level-info" },
                    react_1.default.createElement("span", { className: "level-distance" },
                        distance,
                        " hop",
                        distance > 1 ? 's' : ''),
                    react_1.default.createElement("span", { className: "level-count" },
                        nodes.length,
                        " node",
                        nodes.length > 1 ? 's' : '')),
                react_1.default.createElement("span", { className: "level-toggle" }, expandedDepth === distance ? '▼' : '▶')),
            expandedDepth === distance && (react_1.default.createElement("div", { className: "impact-level-nodes" }, nodes.map(node => (react_1.default.createElement("div", { key: node.nodeId, className: "impact-node-item", onClick: () => onNodeClick?.(node.nodeId) },
                react_1.default.createElement("span", { className: "node-type-badge" }, node.impactType === 'direct' ? '→' : '⤷'),
                react_1.default.createElement("span", { className: "node-id" }, node.nodeId)))))))))),
        react_1.default.createElement("div", { className: "impact-actions" },
            react_1.default.createElement("button", { className: "impact-btn", onClick: onClose }, "Close"))));
};
exports.ImpactAnalysisPanel = ImpactAnalysisPanel;
/**
 * Hook for fetching impact analysis data
 */
function useImpactAnalysis(nodeId, depth = 3) {
    const [data, setData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchImpact = async (targetNodeId) => {
        setIsLoading(true);
        setError(null);
        try {
            // Call backend API
            const response = await fetch(`https://graph-engine-production-90f5.up.railway.app/api/impact/${encodeURIComponent(targetNodeId)}?depth=${depth}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            // Transform to our format
            const impactData = {
                sourceNodeId: targetNodeId,
                affectedNodes: result.affected_nodes?.map((node) => ({
                    nodeId: node.node_id || node.id,
                    distance: node.distance || 1,
                    impactType: node.distance === 1 ? 'direct' : 'indirect',
                })) || [],
                maxDepth: result.max_depth || depth,
                totalImpact: result.total_impact || result.affected_nodes?.length || 0,
            };
            setData(impactData);
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch impact analysis';
            setError(errorMsg);
            console.error('Impact analysis error:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (nodeId) {
            fetchImpact(nodeId);
        }
    }, [nodeId, depth]);
    return { data, isLoading, error, fetchImpact };
}
//# sourceMappingURL=ImpactAnalysis.js.map