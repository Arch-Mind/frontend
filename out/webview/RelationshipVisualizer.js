"use strict";
/**
 * Relationship Visualizer Component (Issue #21)
 * Visualizes parent-child and sibling relationships between nodes
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
exports.RelationshipVisualizer = void 0;
const react_1 = __importStar(require("react"));
/**
 * Calculate relationships for a node
 */
function calculateRelationships(nodeId, nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) {
        return { children: [], siblings: [], ancestors: [], descendants: [] };
    }
    // Find parent
    const parent = currentNode.parentId ? nodeMap.get(currentNode.parentId) : undefined;
    // Find children (nodes with this node as parent)
    const children = nodes.filter(n => n.parentId === nodeId);
    // Find siblings (nodes with same parent)
    const siblings = currentNode.parentId
        ? nodes.filter(n => n.parentId === currentNode.parentId && n.id !== nodeId)
        : [];
    // Find ancestors (walk up parent chain)
    const ancestors = [];
    let currentParentId = currentNode.parentId;
    while (currentParentId) {
        const ancestorNode = nodeMap.get(currentParentId);
        if (!ancestorNode)
            break;
        ancestors.push(ancestorNode);
        currentParentId = ancestorNode.parentId;
    }
    // Find descendants (walk down children)
    const descendants = [];
    const visited = new Set();
    const findDescendants = (parentId) => {
        const childNodes = nodes.filter(n => n.parentId === parentId);
        childNodes.forEach(child => {
            if (!visited.has(child.id)) {
                visited.add(child.id);
                descendants.push(child);
                findDescendants(child.id);
            }
        });
    };
    findDescendants(nodeId);
    return {
        parent,
        children,
        siblings,
        ancestors,
        descendants,
    };
}
/**
 * Get icon for node type
 */
function getNodeIcon(type) {
    const icons = {
        file: '📄',
        directory: '📁',
        function: 'ƒ',
        class: '◆',
        module: '📦',
    };
    return icons[type] || '•';
}
/**
 * Relationship strength based on connection count
 */
function getRelationshipStrength(count) {
    if (count >= 5)
        return 'strong';
    if (count >= 2)
        return 'medium';
    return 'weak';
}
const RelationshipVisualizer = ({ selectedNodeId, nodes, edges, onNodeClick, onClose, }) => {
    const relationships = (0, react_1.useMemo)(() => {
        if (!selectedNodeId)
            return null;
        return calculateRelationships(selectedNodeId, nodes, edges);
    }, [selectedNodeId, nodes, edges]);
    const selectedNode = (0, react_1.useMemo)(() => {
        return nodes.find(n => n.id === selectedNodeId);
    }, [selectedNodeId, nodes]);
    if (!selectedNodeId || !relationships || !selectedNode) {
        return null;
    }
    const { parent, children, siblings, ancestors, descendants } = relationships;
    const totalRelationships = (parent ? 1 : 0) +
        children.length +
        siblings.length +
        ancestors.length +
        descendants.length;
    return (react_1.default.createElement("div", { className: "relationship-visualizer" },
        react_1.default.createElement("div", { className: "relationship-header" },
            react_1.default.createElement("div", { className: "relationship-title" },
                react_1.default.createElement("span", { className: "relationship-icon" }, "\uD83D\uDD17"),
                react_1.default.createElement("span", null, "Relationships")),
            react_1.default.createElement("button", { className: "relationship-close-btn", onClick: onClose, title: "Close" }, "\u2715")),
        react_1.default.createElement("div", { className: "relationship-summary" },
            react_1.default.createElement("div", { className: "selected-node-info" },
                react_1.default.createElement("span", { className: "node-type-icon" }, getNodeIcon(selectedNode.type)),
                react_1.default.createElement("div", { className: "node-details" },
                    react_1.default.createElement("div", { className: "node-name" }, selectedNode.id),
                    react_1.default.createElement("div", { className: "node-type-label" }, selectedNode.type))),
            react_1.default.createElement("div", { className: "relationship-count" },
                totalRelationships,
                " relationship",
                totalRelationships !== 1 ? 's' : '')),
        react_1.default.createElement("div", { className: "relationship-sections" },
            parent && (react_1.default.createElement("div", { className: "relationship-section" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("span", { className: "section-icon" }, "\u2B06\uFE0F"),
                    react_1.default.createElement("span", { className: "section-title" }, "Parent"),
                    react_1.default.createElement("span", { className: "section-badge" }, "1")),
                react_1.default.createElement("div", { className: "relationship-items" },
                    react_1.default.createElement(RelationshipNode, { node: parent, relationshipType: "parent", onClick: onNodeClick })))),
            children.length > 0 && (react_1.default.createElement("div", { className: "relationship-section" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("span", { className: "section-icon" }, "\u2B07\uFE0F"),
                    react_1.default.createElement("span", { className: "section-title" }, "Children"),
                    react_1.default.createElement("span", { className: "section-badge" }, children.length),
                    react_1.default.createElement("span", { className: `strength-indicator strength-${getRelationshipStrength(children.length)}` }, getRelationshipStrength(children.length))),
                react_1.default.createElement("div", { className: "relationship-items" }, children.map(node => (react_1.default.createElement(RelationshipNode, { key: node.id, node: node, relationshipType: "child", onClick: onNodeClick })))))),
            siblings.length > 0 && (react_1.default.createElement("div", { className: "relationship-section" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("span", { className: "section-icon" }, "\u2194\uFE0F"),
                    react_1.default.createElement("span", { className: "section-title" }, "Siblings"),
                    react_1.default.createElement("span", { className: "section-badge" }, siblings.length)),
                react_1.default.createElement("div", { className: "relationship-items" }, siblings.map(node => (react_1.default.createElement(RelationshipNode, { key: node.id, node: node, relationshipType: "sibling", onClick: onNodeClick })))))),
            ancestors.length > 0 && (react_1.default.createElement("div", { className: "relationship-section" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("span", { className: "section-icon" }, "\u23EB"),
                    react_1.default.createElement("span", { className: "section-title" }, "Ancestors"),
                    react_1.default.createElement("span", { className: "section-badge" }, ancestors.length)),
                react_1.default.createElement("div", { className: "relationship-items" }, ancestors.map((node, index) => (react_1.default.createElement(RelationshipNode, { key: node.id, node: node, relationshipType: "ancestor", depth: index + 1, onClick: onNodeClick })))))),
            descendants.length > 0 && (react_1.default.createElement("div", { className: "relationship-section" },
                react_1.default.createElement("div", { className: "section-header" },
                    react_1.default.createElement("span", { className: "section-icon" }, "\u23EC"),
                    react_1.default.createElement("span", { className: "section-title" }, "Descendants"),
                    react_1.default.createElement("span", { className: "section-badge" }, descendants.length),
                    react_1.default.createElement("span", { className: `strength-indicator strength-${getRelationshipStrength(descendants.length)}` }, getRelationshipStrength(descendants.length))),
                react_1.default.createElement("div", { className: "relationship-items" },
                    descendants.slice(0, 10).map(node => (react_1.default.createElement(RelationshipNode, { key: node.id, node: node, relationshipType: "descendant", onClick: onNodeClick }))),
                    descendants.length > 10 && (react_1.default.createElement("div", { className: "more-items" },
                        "+",
                        descendants.length - 10,
                        " more..."))))),
            totalRelationships === 0 && (react_1.default.createElement("div", { className: "no-relationships" },
                react_1.default.createElement("span", { className: "no-rel-icon" }, "\uD83D\uDD0D"),
                react_1.default.createElement("span", { className: "no-rel-text" }, "No relationships found"))))));
};
exports.RelationshipVisualizer = RelationshipVisualizer;
const RelationshipNode = ({ node, relationshipType, depth, onClick, }) => {
    const handleClick = () => {
        onClick?.(node.id);
    };
    const indent = depth ? depth * 12 : 0;
    return (react_1.default.createElement("div", { className: `relationship-node relationship-${relationshipType}`, style: { marginLeft: `${indent}px` }, onClick: handleClick },
        react_1.default.createElement("div", { className: "rel-node-connector" }),
        react_1.default.createElement("span", { className: "rel-node-icon" }, getNodeIcon(node.type)),
        react_1.default.createElement("div", { className: "rel-node-content" },
            react_1.default.createElement("div", { className: "rel-node-name" }, node.id),
            react_1.default.createElement("div", { className: "rel-node-type" }, node.type)),
        depth && react_1.default.createElement("span", { className: "rel-node-depth" },
            "Level ",
            depth)));
};
//# sourceMappingURL=RelationshipVisualizer.js.map