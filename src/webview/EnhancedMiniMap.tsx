/**
 * Enhanced MiniMap Component (Issue #19)
 * Improved mini-map with colors, highlights, and click navigation
 */

import React, { useMemo } from 'react';
import { MiniMap as ReactFlowMiniMap } from 'reactflow';
import { Node } from 'reactflow';

/**
 * Props for the EnhancedMiniMap component.
 */
export interface EnhancedMiniMapProps {
    selectedNodeId?: string | null;  /** ID of the currently selected node to highlight */
    hoveredNodeId?: string | null;   /** ID of the node currently under the mouse cursor */
    nodeColors?: Record<string, string>; /** Custom color mapping for node types/languages */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; /** UI position of the minimap */
    onNodeClick?: (event: React.MouseEvent, node: Node) => void; /** Callback when a minimap node is clicked */
}

// Default colors for node types (fallback)
const DEFAULT_NODE_COLORS: Record<string, string> = {
    file: '#3498db',        // Blue
    directory: '#9b59b6',   // Purple
    function: '#2ecc71',    // Green
    class: '#e67e22',       // Orange
    module: '#1abc9c',      // Teal
    default: '#95a5a6',     // Gray
};

export const EnhancedMiniMap: React.FC<EnhancedMiniMapProps> = ({
    selectedNodeId,
    hoveredNodeId,
    nodeColors,
    position = 'bottom-right',
    onNodeClick,
}) => {
    // Merge custom node colors with defaults
    const colorMap = useMemo(() => {
        return { ...DEFAULT_NODE_COLORS, ...nodeColors };
    }, [nodeColors]);

    // Node color function with selection and hover support
    const nodeColor = useMemo(() => {
        return (node: Node): string => {
            // Selected node - bright highlight
            if (node.id === selectedNodeId) {
                return '#f39c12'; // Bright yellow/orange
            }

            // Hovered node - lighter highlight
            if (node.id === hoveredNodeId) {
                return '#e74c3c'; // Red
            }

            // Color by type or language
            const nodeData = node.data as any;

            // Explicit type check
            if (nodeData?.type === 'directory') return colorMap.directory || DEFAULT_NODE_COLORS.directory;
            if (nodeData?.type === 'function') return colorMap.function || DEFAULT_NODE_COLORS.function;
            if (nodeData?.type === 'class') return colorMap.class || DEFAULT_NODE_COLORS.class;
            if (nodeData?.type === 'module') return colorMap.module || DEFAULT_NODE_COLORS.module;

            // Check language
            if (nodeData?.language && colorMap[nodeData.language]) {
                return colorMap[nodeData.language];
            }

            // Fallback to type or default
            const fallbackType = nodeData?.type || node.type || 'default';
            return colorMap[fallbackType] || colorMap.default;
        };
    }, [selectedNodeId, hoveredNodeId, colorMap]);

    // Node class name for additional styling
    const nodeClassName = useMemo(() => {
        return (node: Node): string => {
            const classes: string[] = ['minimap-node'];

            if (node.id === selectedNodeId) {
                classes.push('minimap-node-selected');
            }

            if (node.id === hoveredNodeId) {
                classes.push('minimap-node-hovered');
            }

            const nodeData = node.data as any;
            const nodeType = nodeData?.type || node.type || 'default';
            classes.push(`minimap-node-${nodeType}`);

            return classes.join(' ');
        };
    }, [selectedNodeId, hoveredNodeId]);

    // Position mapping for ReactFlow
    const minimapPosition = useMemo(() => {
        switch (position) {
            case 'top-left': return { top: 10, left: 10 };
            case 'top-right': return { top: 10, right: 10 };
            case 'bottom-left': return { bottom: 10, left: 10 };
            case 'bottom-right': return { bottom: 10, right: 10 };
            default: return { bottom: 10, right: 10 };
        }
    }, [position]);

    return (
        <ReactFlowMiniMap
            nodeColor={nodeColor}
            nodeClassName={nodeClassName}
            nodeBorderRadius={3}
            nodeStrokeWidth={2}
            maskColor="rgba(0, 0, 0, 0.15)"
            style={{
                backgroundColor: 'var(--am-panel-bg)',
                border: '1px solid var(--am-border)',
                borderRadius: '6px',
                ...minimapPosition,
            }}
            pannable
            zoomable
            onNodeClick={onNodeClick}
        />
    );
};

/**
 * Hook for mini-map navigation
 */
export function useMiniMapNavigation(
    onNodeClick?: (nodeId: string) => void
) {
    const handleMiniMapNodeClick = React.useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        onNodeClick?.(node.id);
    }, [onNodeClick]);

    return {
        handleMiniMapNodeClick,
    };
}
