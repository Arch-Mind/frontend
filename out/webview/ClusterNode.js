"use strict";
/**
 * ClusterNode Component
 * ---------------------
 * Displays a collapsed cluster node with summary metrics and an expand button.
 * Used for grouping nodes in large graphs for better visualization and navigation.
 *
 * Features:
 * - Shows cluster label and metrics (nodes, files, functions, classes)
 * - Provides expand button to reveal cluster contents
 * - Integrates with React Flow for graph rendering
 *
 * @component
 * @param {NodeProps<ClusterNodeData>} props - Cluster data and expand handler
 * @returns {JSX.Element}
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterNode = ClusterNode;
const react_1 = __importDefault(require("react"));
const reactflow_1 = require("reactflow");
function ClusterNode({ data }) {
    // Destructure cluster data and expand handler
    const { cluster, onExpand } = data;
    const { label, metrics } = cluster;
    /**
     * Handles click on expand button to reveal cluster contents
     * @param e - Mouse event
     */
    const handleExpand = (e) => {
        e.stopPropagation();
        onExpand(cluster.id);
    };
    return (react_1.default.createElement("div", { className: "cluster-node" },
        react_1.default.createElement(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Top }),
        react_1.default.createElement("div", { className: "cluster-header" },
            react_1.default.createElement("div", { className: "cluster-icon" }, "\uD83D\uDCC1"),
            react_1.default.createElement("div", { className: "cluster-title" }, label)),
        react_1.default.createElement("div", { className: "cluster-metrics" },
            react_1.default.createElement("div", { className: "metric" },
                react_1.default.createElement("span", { className: "metric-label" }, "Nodes:"),
                react_1.default.createElement("span", { className: "metric-value" }, metrics.nodeCount)),
            metrics.fileCount > 0 && (react_1.default.createElement("div", { className: "metric" },
                react_1.default.createElement("span", { className: "metric-label" }, "Files:"),
                react_1.default.createElement("span", { className: "metric-value" }, metrics.fileCount))),
            metrics.functionCount > 0 && (react_1.default.createElement("div", { className: "metric" },
                react_1.default.createElement("span", { className: "metric-label" }, "Functions:"),
                react_1.default.createElement("span", { className: "metric-value" }, metrics.functionCount))),
            metrics.classCount > 0 && (react_1.default.createElement("div", { className: "metric" },
                react_1.default.createElement("span", { className: "metric-label" }, "Classes:"),
                react_1.default.createElement("span", { className: "metric-value" }, metrics.classCount)))),
        react_1.default.createElement("button", { className: "cluster-expand-button", onClick: handleExpand, title: "Expand cluster" }, "Expand \u25B6"),
        react_1.default.createElement(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Bottom })));
}
//# sourceMappingURL=ClusterNode.js.map