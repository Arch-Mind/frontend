/**
 * Layout algorithms for the architecture graph
 * Supports: Hierarchical (built-in), Dagre, and ELK
 */
import dagre from 'dagre';
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';

// Types for layout
export type LayoutType = 'hierarchical' | 'dagre-tb' | 'dagre-lr' | 'elk-layered' | 'elk-force';

export interface LayoutNode {
    id: string;
    width: number;
    height: number;
    depth?: number;
}

export interface LayoutEdge {
    id: string;
    source: string;
    target: string;
}

export interface LayoutResult {
    nodes: Map<string, { x: number; y: number }>;
}

// Default node dimensions
const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;

/**
 * Dagre layout algorithm
 * Supports top-bottom (TB) and left-right (LR) directions
 */
export function dagreLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    direction: 'TB' | 'LR' = 'TB'
): LayoutResult {
    const g = new dagre.graphlib.Graph();

    // Set graph options
    g.setGraph({
        rankdir: direction,
        nodesep: 50,
        ranksep: 80,
        edgesep: 20,
        marginx: 20,
        marginy: 20,
    });

    // Default edge label (required by dagre)
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    nodes.forEach((node) => {
        g.setNode(node.id, {
            width: node.width || NODE_WIDTH,
            height: node.height || NODE_HEIGHT,
        });
    });

    // Add edges
    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
    });

    // Run layout
    dagre.layout(g);

    // Extract positions
    const result: Map<string, { x: number; y: number }> = new Map();

    g.nodes().forEach((nodeId) => {
        const nodeWithPosition = g.node(nodeId);
        if (nodeWithPosition) {
            result.set(nodeId, {
                // Dagre gives center position, we want top-left
                x: nodeWithPosition.x - (nodeWithPosition.width || NODE_WIDTH) / 2,
                y: nodeWithPosition.y - (nodeWithPosition.height || NODE_HEIGHT) / 2,
            });
        }
    });

    return { nodes: result };
}

/**
 * ELK layout algorithm
 * Supports layered and force-directed layouts
 */
const elk = new ELK();

export async function elkLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    algorithm: 'layered' | 'force' = 'layered'
): Promise<LayoutResult> {
    const elkNodes: ElkNode[] = nodes.map((node) => ({
        id: node.id,
        width: node.width || NODE_WIDTH,
        height: node.height || NODE_HEIGHT,
    }));

    const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
    }));

    const graph: ElkNode = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': algorithm === 'layered' ? 'layered' : 'force',
            'elk.direction': 'DOWN',
            'elk.spacing.nodeNode': '60',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.force.iterations': '300',
        },
        children: elkNodes,
        edges: elkEdges,
    };

    const layoutedGraph = await elk.layout(graph);

    // Extract positions
    const result: Map<string, { x: number; y: number }> = new Map();

    layoutedGraph.children?.forEach((node) => {
        result.set(node.id, {
            x: node.x || 0,
            y: node.y || 0,
        });
    });

    return { nodes: result };
}

/**
 * Get layout algorithm info for display
 */
export const LAYOUT_OPTIONS: { value: LayoutType; label: string; description: string }[] = [
    {
        value: 'hierarchical',
        label: '📊 Hierarchical',
        description: 'Tree-like layout based on file depth',
    },
    {
        value: 'dagre-tb',
        label: '⬇️ Dagre (Top-Bottom)',
        description: 'Directed graph layout, top to bottom',
    },
    {
        value: 'dagre-lr',
        label: '➡️ Dagre (Left-Right)',
        description: 'Directed graph layout, left to right',
    },
    {
        value: 'elk-layered',
        label: '📐 ELK Layered',
        description: 'Advanced layered layout with edge routing',
    },
    {
        value: 'elk-force',
        label: '🔮 ELK Force',
        description: 'Force-directed physics simulation',
    },
];
