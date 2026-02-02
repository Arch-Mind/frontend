"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAYOUT_OPTIONS = void 0;
exports.dagreLayout = dagreLayout;
exports.elkLayout = elkLayout;
/**
 * Layout algorithms for the architecture graph
 * Supports: Hierarchical (built-in), Dagre, and ELK
 */
const dagre_1 = __importDefault(require("dagre"));
const elk_bundled_js_1 = __importDefault(require("elkjs/lib/elk.bundled.js"));
// Default node dimensions
const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;
/**
 * Dagre layout algorithm
 * Supports top-bottom (TB) and left-right (LR) directions
 */
function dagreLayout(nodes, edges, direction = 'TB') {
    const g = new dagre_1.default.graphlib.Graph();
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
    dagre_1.default.layout(g);
    // Extract positions
    const result = new Map();
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
const elk = new elk_bundled_js_1.default();
async function elkLayout(nodes, edges, algorithm = 'layered') {
    const elkNodes = nodes.map((node) => ({
        id: node.id,
        width: node.width || NODE_WIDTH,
        height: node.height || NODE_HEIGHT,
    }));
    const elkEdges = edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
    }));
    const graph = {
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
    const result = new Map();
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
exports.LAYOUT_OPTIONS = [
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
//# sourceMappingURL=layoutAlgorithms.js.map