"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAYOUT_OPTIONS = void 0;
exports.dagreLayout = dagreLayout;
exports.elkLayout = elkLayout;
exports.byFileLayout = byFileLayout;
exports.byModuleLayout = byModuleLayout;
exports.dependencyOnlyLayout = dependencyOnlyLayout;
exports.forceDirectedLayout = forceDirectedLayout;
/**
 * layoutAlgorithms.ts
 * -------------------
 * Provides multiple layout algorithms for the architecture graph visualization.
 * Supports: Hierarchical, Dagre, ELK, by-file, by-module, dependency-only, and force-directed layouts.
 * Enhanced for Issue #12.
 */
const dagre_1 = __importDefault(require("dagre"));
const elk_bundled_js_1 = __importDefault(require("elkjs/lib/elk.bundled.js"));
// Default node dimensions
const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;
/**
 * dagreLayout
 * -----------
 * Uses dagre.js to compute node positions for directed graphs.
 * Supports top-bottom (TB) and left-right (LR) directions.
 *
 * @param nodes - Array of nodes
 * @param edges - Array of edges
 * @param direction - 'TB' (top-bottom) or 'LR' (left-right)
 * @returns LayoutResult with node positions
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
 * elkLayout
 * ---------
 * Uses ELK.js for advanced graph layouts (layered or force-directed).
 * Returns a promise with node positions.
 *
 * @param nodes - Array of nodes
 * @param edges - Array of edges
 * @param algorithm - 'layered' or 'force'
 * @returns Promise<LayoutResult>
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
 * LAYOUT_OPTIONS
 * --------------
 * List of available layout algorithms for UI selection.
 * Each option includes value, label, and description.
 */
exports.LAYOUT_OPTIONS = [
    {
        value: 'hierarchical',
        label: '📊 Hierarchical',
        description: 'Tree-like layout based on file depth',
    },
    {
        value: 'by-file',
        label: '📄 By File',
        description: 'Functions grouped under their files',
    },
    {
        value: 'by-module',
        label: '📦 By Module',
        description: 'Files grouped under modules/directories',
    },
    {
        value: 'dependency-only',
        label: '🔗 Dependencies Only',
        description: 'Show only CALLS/IMPORTS edges',
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
        value: 'force-directed',
        label: '🌀 Force-Directed',
        description: 'Physics-based clustering layout',
    },
];
/**
 * byFileLayout
 * ------------
 * Groups functions/classes under their parent files for a tree-like layout.
 * Used for visualizing file/function hierarchy.
 *
 * @param nodes - Array of nodes
 * @param edges - Array of edges
 * @returns LayoutResult
 */
function byFileLayout(nodes, edges) {
    const result = new Map();
    // Group nodes by file
    const fileGroups = new Map();
    const fileNodes = [];
    nodes.forEach(node => {
        if (node.type === 'file' || node.type === 'directory') {
            fileNodes.push(node);
        }
        else {
            // Function/class - group under file
            const fileId = node.parentId || node.filePath || 'orphan';
            const group = fileGroups.get(fileId) || [];
            group.push(node);
            fileGroups.set(fileId, group);
        }
    });
    let currentY = 0;
    const FILE_SPACING = 150;
    const CHILD_SPACING = 50;
    const CHILD_INDENT = 40;
    // Layout files and their children
    fileNodes.forEach(fileNode => {
        // Position file
        result.set(fileNode.id, { x: 0, y: currentY });
        currentY += NODE_HEIGHT + 20;
        // Position children
        const children = fileGroups.get(fileNode.id) || [];
        children.forEach(child => {
            result.set(child.id, { x: CHILD_INDENT, y: currentY });
            currentY += CHILD_SPACING;
        });
        currentY += FILE_SPACING - CHILD_SPACING;
    });
    return { nodes: result };
}
/**
 * byModuleLayout
 * --------------
 * Groups files under modules/directories for a modular hierarchy view.
 *
 * @param nodes - Array of nodes
 * @param edges - Array of edges
 * @returns LayoutResult
 */
function byModuleLayout(nodes, edges) {
    const result = new Map();
    const rootModule = {
        name: 'root',
        files: [],
        subModules: new Map(),
    };
    // Build module tree
    nodes.forEach(node => {
        if (node.type === 'file' && node.filePath) {
            const parts = node.filePath.split('/');
            let currentModule = rootModule;
            // Navigate/create module hierarchy
            for (let i = 0; i < parts.length - 1; i++) {
                const moduleName = parts[i];
                if (!currentModule.subModules.has(moduleName)) {
                    currentModule.subModules.set(moduleName, {
                        name: moduleName,
                        files: [],
                        subModules: new Map(),
                    });
                }
                currentModule = currentModule.subModules.get(moduleName);
            }
            currentModule.files.push(node);
        }
    });
    // Layout modules recursively
    let currentY = 0;
    const MODULE_SPACING = 100;
    const FILE_SPACING = 60;
    function layoutModule(module, x) {
        // Layout files in this module
        module.files.forEach(file => {
            result.set(file.id, { x, y: currentY });
            currentY += FILE_SPACING;
        });
        // Layout sub-modules
        module.subModules.forEach(subModule => {
            layoutModule(subModule, x + 40);
        });
        if (module.files.length > 0 || module.subModules.size > 0) {
            currentY += MODULE_SPACING;
        }
    }
    layoutModule(rootModule, 0);
    return { nodes: result };
}
/**
 * dependencyOnlyLayout
 * --------------------
 * Shows only CALLS/IMPORTS edges, hides hierarchy. Useful for dependency analysis.
 *
 * @param nodes - Array of nodes
 * @param edges - Array of edges
 * @returns LayoutResult
 */
function dependencyOnlyLayout(nodes, edges) {
    // Filter to only dependency edges
    const dependencyEdges = edges.filter(edge => edge.type === 'calls' ||
        edge.type === 'imports' ||
        edge.type === 'CALLS' ||
        edge.type === 'IMPORTS');
    // Use dagre with only these edges
    return dagreLayout(nodes, dependencyEdges, 'LR');
}
/**
 * forceDirectedLayout
 * -------------------
 * Physics-based layout with node repulsion and edge attraction. Simulates a force-directed graph.
 *
 * @param nodes - Array of nodes
 * @param edges - Array of edges
 * @param iterations - Number of simulation steps
 * @returns LayoutResult
 */
function forceDirectedLayout(nodes, edges, iterations = 300) {
    const result = new Map();
    // Initialize random positions
    const positions = new Map();
    nodes.forEach(node => {
        positions.set(node.id, {
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            vx: 0,
            vy: 0,
        });
    });
    const REPULSION = 10000;
    const ATTRACTION = 0.01;
    const DAMPING = 0.85;
    const MIN_DISTANCE = 100;
    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
        // Calculate repulsion between all nodes
        nodes.forEach(node1 => {
            const pos1 = positions.get(node1.id);
            nodes.forEach(node2 => {
                if (node1.id === node2.id)
                    return;
                const pos2 = positions.get(node2.id);
                const dx = pos1.x - pos2.x;
                const dy = pos1.y - pos2.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                if (distance < MIN_DISTANCE * 3) {
                    const force = REPULSION / (distance * distance);
                    pos1.vx += (dx / distance) * force;
                    pos1.vy += (dy / distance) * force;
                }
            });
        });
        // Calculate attraction for connected nodes
        edges.forEach(edge => {
            const pos1 = positions.get(edge.source);
            const pos2 = positions.get(edge.target);
            if (!pos1 || !pos2)
                return;
            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = distance * ATTRACTION;
            pos1.vx += (dx / distance) * force;
            pos1.vy += (dy / distance) * force;
            pos2.vx -= (dx / distance) * force;
            pos2.vy -= (dy / distance) * force;
        });
        // Update positions
        nodes.forEach(node => {
            const pos = positions.get(node.id);
            pos.x += pos.vx;
            pos.y += pos.vy;
            pos.vx *= DAMPING;
            pos.vy *= DAMPING;
        });
    }
    // Convert to result format
    positions.forEach((pos, id) => {
        result.set(id, { x: pos.x, y: pos.y });
    });
    return { nodes: result };
}
//# sourceMappingURL=layoutAlgorithms.js.map