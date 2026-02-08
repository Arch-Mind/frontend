"use strict";
/**
 * Enhanced MiniMap Component (Issue #19)
 * Improved mini-map with colors, highlights, and click navigation
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
exports.EnhancedMiniMap = void 0;
exports.useMiniMapNavigation = useMiniMapNavigation;
const react_1 = __importStar(require("react"));
const reactflow_1 = require("reactflow");
// Default colors for node types
const DEFAULT_NODE_COLORS = {
    file: '#3498db', // Blue
    directory: '#9b59b6', // Purple
    function: '#2ecc71', // Green
    class: '#e67e22', // Orange
    module: '#1abc9c', // Teal
    default: '#95a5a6', // Gray
};
const EnhancedMiniMap = ({ selectedNodeId, hoveredNodeId, nodeColors, position = 'bottom-right', }) => {
    // Merge custom node colors with defaults
    const colorMap = (0, react_1.useMemo)(() => {
        return { ...DEFAULT_NODE_COLORS, ...nodeColors };
    }, [nodeColors]);
    // Node color function with selection and hover support
    const nodeColor = (0, react_1.useMemo)(() => {
        return (node) => {
            // Selected node - bright highlight
            if (node.id === selectedNodeId) {
                return '#f39c12'; // Bright yellow/orange
            }
            // Hovered node - lighter highlight
            if (node.id === hoveredNodeId) {
                return '#e74c3c'; // Red
            }
            // Color by type
            const nodeType = node.type || 'default';
            const nodeData = node.data;
            const dataType = nodeData?.type || nodeType;
            return colorMap[dataType] || colorMap.default;
        };
    }, [selectedNodeId, hoveredNodeId, colorMap]);
    // Node class name for additional styling
    const nodeClassName = (0, react_1.useMemo)(() => {
        return (node) => {
            const classes = ['minimap-node'];
            if (node.id === selectedNodeId) {
                classes.push('minimap-node-selected');
            }
            if (node.id === hoveredNodeId) {
                classes.push('minimap-node-hovered');
            }
            const nodeData = node.data;
            const nodeType = nodeData?.type || node.type || 'default';
            classes.push(`minimap-node-${nodeType}`);
            return classes.join(' ');
        };
    }, [selectedNodeId, hoveredNodeId]);
    // Position mapping for ReactFlow
    const minimapPosition = (0, react_1.useMemo)(() => {
        switch (position) {
            case 'top-left': return { top: 10, left: 10 };
            case 'top-right': return { top: 10, right: 10 };
            case 'bottom-left': return { bottom: 10, left: 10 };
            case 'bottom-right': return { bottom: 10, right: 10 };
            default: return { bottom: 10, right: 10 };
        }
    }, [position]);
    return (react_1.default.createElement(reactflow_1.MiniMap, { nodeColor: nodeColor, nodeClassName: nodeClassName, nodeBorderRadius: 3, nodeStrokeWidth: 2, maskColor: "rgba(0, 0, 0, 0.15)", style: {
            backgroundColor: 'var(--am-panel-bg)',
            border: '1px solid var(--am-border)',
            borderRadius: '6px',
            ...minimapPosition,
        }, pannable: true, zoomable: true }));
};
exports.EnhancedMiniMap = EnhancedMiniMap;
/**
 * Hook for mini-map navigation
 */
function useMiniMapNavigation(onNodeClick) {
    const handleMiniMapNodeClick = react_1.default.useCallback((event, node) => {
        event.preventDefault();
        onNodeClick?.(node.id);
    }, [onNodeClick]);
    return {
        handleMiniMapNodeClick,
    };
}
//# sourceMappingURL=EnhancedMiniMap.js.map