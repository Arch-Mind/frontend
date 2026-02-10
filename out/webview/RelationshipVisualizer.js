"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
function RelationshipVisualizer({ selectedNodeId, nodes, edges, onClose }) {
    // Compute relationships
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const parent = selectedNode && selectedNode.parentId ? nodes.find(n => n.id === selectedNode.parentId) : undefined;
    const children = nodes.filter(n => n.parentId === selectedNodeId);
    const siblings = selectedNode && selectedNode.parentId
        ? nodes.filter(n => n.parentId === selectedNode.parentId && n.id !== selectedNodeId)
        : [];
    // For demo: ancestors, descendants, totalRelationships
    const ancestors = [];
    const descendants = [];
    const totalRelationships = (parent ? 1 : 0) + children.length + siblings.length;
    return (react_1.default.createElement("div", { className: "relationship-visualizer" },
        react_1.default.createElement("div", { className: "summary" },
            react_1.default.createElement("span", { className: "summary-label" }, "Relationships"),
            react_1.default.createElement("span", { className: "summary-value" }, totalRelationships),
            react_1.default.createElement("button", { onClick: onClose }, "Close")),
        parent && (react_1.default.createElement("div", { className: "relationship-section" },
            react_1.default.createElement("span", null,
                "Parent: ",
                parent.id))),
        children.length > 0 && (react_1.default.createElement("div", { className: "relationship-section" },
            react_1.default.createElement("span", null,
                "Children: ",
                children.map(c => c.id).join(', ')))),
        siblings.length > 0 && (react_1.default.createElement("div", { className: "relationship-section" },
            react_1.default.createElement("span", null,
                "Siblings: ",
                siblings.map(s => s.id).join(', ')))),
        totalRelationships === 0 && (react_1.default.createElement("div", { className: "no-relationships" },
            react_1.default.createElement("span", { className: "no-rel-text" }, "No relationships found")))));
}
exports.default = RelationshipVisualizer;
//# sourceMappingURL=RelationshipVisualizer.js.map