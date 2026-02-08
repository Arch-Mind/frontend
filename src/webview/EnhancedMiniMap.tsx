/**
 * Enhanced MiniMap Component (Issue #19)
 * Improved mini-map with colors, highlights, and click navigation
 */

import React, { useMemo } from 'react';
import { MiniMap as ReactFlowMiniMap } from 'reactflow';
import { Node } from 'reactflow';

export interface EnhancedMiniMapProps {
    selectedNodeId?: string | null;
    hoveredNodeId?: string | null;
    nodeColors?: Record<string, string>;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Default colors for node types
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

            // Color by type
            const nodeType = node.type || 'default';
            const nodeData = node.data as any;
            const dataType = nodeData?.type || nodeType;

            return colorMap[dataType] || colorMap.default;
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
                backgroundColor: 'var(--vscode-sideBar-background)',
                border: '1px solid var(--vscode-widget-border)',
                borderRadius: '6px',
                ...minimapPosition,
            }}
            pannable
            zoomable
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
