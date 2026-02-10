import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
    BackgroundVariant,
    NodeMouseHandler,
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';

import 'reactflow/dist/style.css';

// Import WebSocket client
import { ArchMindWebSocketClient, JobUpdate } from '../api/webviewSocket';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { ContributionsResponse } from '../api/types';

// Layout algorithm imports
import {
    LayoutType,
    LAYOUT_OPTIONS,
    dagreLayout,
    elkLayout,
    LayoutNode,
    LayoutEdge,
} from './layoutAlgorithms';

// Clustering imports (#11)
import {
    clusterNodesByDirectory,
    filterByClusterState,
    ClusterState,
    toggleCluster,
    expandAllClusters,
    collapseAllClusters,
    Cluster,
} from './clustering';
import { ClusterNode, ClusterNodeData } from './ClusterNode';

// Impact Analysis imports (#15)
import { ImpactAnalysisPanel, ImpactAnalysisData, useImpactAnalysis } from './ImpactAnalysis';
import { LocalOutline, LocalSymbol } from './LocalOutline';

// Keyboard Navigation imports (#18)
import { useKeyboardNavigation, KeyboardHelp } from './KeyboardNavigation';

// Enhanced MiniMap imports (#19)
import { EnhancedMiniMap, useMiniMapNavigation } from './EnhancedMiniMap';

// Zoom & Pan imports (#20)
import { useZoomPan, useZoomPanKeyboard } from './useZoomPan';
import { ZoomControls } from './ZoomControls';

// Relationship Visualizer imports (#21)
import { RelationshipVisualizer } from './RelationshipVisualizer';

// Export Modal imports
import { ExportModal } from '../components/ExportModal';
import { HeatmapLegend } from './HeatmapLegend';
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath } from './heatmapUtils';

// Custom node types for ReactFlow
const nodeTypes = {
    clusterNode: ClusterNode,
};

// Debounce hook for performant search on large graphs
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Types matching the backend analyzer
// Types matching the backend analyzer
interface RawNode {
    id: string;
    label: string;
    type: 'file' | 'directory' | 'function' | 'class' | 'module';
    parentId?: string;
    extension?: string;
    language?: string;
    depth: number;
    filePath?: string;
    lineNumber?: number;
    endLineNumber?: number;
    status?: 'unchanged' | 'modified' | 'added' | 'deleted';
}

interface RawEdge {
    id: string;
    source: string;
    target: string;
    type: string;
}

interface GraphPatch {
    changed_files: string[];
    removed_files: string[];
    nodes: RawNode[];
    edges: RawEdge[];
}

interface GraphStats {
    totalFiles: number;
    totalDirectories: number;
    totalFunctions?: number;
    totalClasses?: number;
    filesByLanguage: Record<string, number>;
}

interface ArchitectureData {
    nodes: RawNode[];
    edges: RawEdge[];
    stats: GraphStats;
    source?: 'local' | 'backend';
    repoId?: string;
    repo_id?: string; // Support both naming conventions
}

// Color scheme for different node types
export const NODE_COLORS: Record<string, string> = {
    directory: '#4a9eff',
    typescript: '#3178c6',
    javascript: '#f7df1e',
    json: '#292929',
    markdown: '#083fa1',
    css: '#264de4',
    python: '#3776ab',
    rust: '#dea584',
    go: '#00add8',
    function: '#9b59b6',
    class: '#e74c3c',
    module: '#27ae60',
    default: '#6b7280',
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
    modified: '#e67e22', // Orange for modified
    added: '#2ecc71',    // Green for added
    deleted: '#e74c3c',  // Red for deleted
};

// Get color based on node type/language
function getNodeColor(node: RawNode): string {
    if (node.status && node.status !== 'unchanged' && STATUS_COLORS[node.status]) {
        return STATUS_COLORS[node.status];
    }
    if (node.type === 'directory') return NODE_COLORS.directory;
    if (node.type === 'function') return NODE_COLORS.function;
    if (node.type === 'class') return NODE_COLORS.class;
    if (node.type === 'module') return NODE_COLORS.module;
    if (node.language) return NODE_COLORS[node.language] || NODE_COLORS.default;
    return NODE_COLORS.default;
}

// Search filter types
type NodeTypeFilter = 'file' | 'directory' | 'function' | 'class' | 'module';

interface SearchFilters {
    searchTerm: string;
    nodeTypes: NodeTypeFilter[]; // Multi-select
    languages: string[];         // Multi-select
    pathPattern: string;
    showNeighbors: boolean;      // Show connected nodes
}

// Check if a node matches the search filters
function matchesFilters(node: RawNode, filters: SearchFilters): boolean {
    const { searchTerm, nodeTypes, languages, pathPattern } = filters;

    // Filter by node type (if any selected)
    if (nodeTypes.length > 0 && !nodeTypes.includes(node.type)) {
        return false;
    }

    // Filter by language (if any selected)
    // Only applies to nodes that have a language property (files, functions, classes)
    if (languages.length > 0) {
        if (!node.language || !languages.includes(node.language)) {
            // If it's a directory, we might want to show it if it contains matching files?
            // For now, strict filtering: if language filter is active, only show nodes of that language.
            // Directories usually don't have a specific language, so they might be hidden unless we handle them.
            // Let's say directories match if their children match? No, that's complex path filtering.
            // Simple rule: If language filter is on, hide anything that isn't that language.
            // BUT: Directories don't have language. Maybe we should always show directories? 
            // Or only if node.language is present.
            if (node.type !== 'directory') {
                return false;
            }
            // For directories, we default to hidden if we are strictly filtering by language?
            // Actually, usually users want to see the structure. 
            // Let's decide: strict filtering hides directories.
            return false;
        }
    }

    // Filter by path pattern (glob-like matching)
    if (pathPattern) {
        // Normalize paths: convert backslashes to forward slashes for consistent matching
        const normalizedNodePath = node.id.replace(/\\/g, '/').toLowerCase();
        const normalizedPattern = pathPattern.replace(/\\/g, '/').toLowerCase();

        // Convert glob pattern to regex
        const regexPattern = normalizedPattern
            .replace(/[.+^${}()|[\]]/g, '\\$&')  // Escape special regex chars except * and ?
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');

        // Match anywhere in the path (not just from start)
        const regex = new RegExp(regexPattern, 'i');
        if (!regex.test(normalizedNodePath)) {
            return false;
        }
    }

    // Filter by search term (matches label or id)
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesLabel = node.label.toLowerCase().includes(term);
        const matchesId = node.id.toLowerCase().includes(term);
        if (!matchesLabel && !matchesId) {
            return false;
        }
    }

    return true;
}

// Node dimensions for layout
const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;

// Calculate matching node IDs based on filters
function calculateMatchingNodeIds(
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters
): Set<string> {
    const matchingNodeIds = new Set<string>();
    const { searchTerm, nodeTypes, languages, pathPattern, showNeighbors } = filters;
    const hasActiveFilter = searchTerm || nodeTypes.length > 0 || languages.length > 0 || pathPattern;

    if (!hasActiveFilter) {
        return matchingNodeIds; // Empty set means everything matches (or is handled by caller)
    }

    // Pass 1: Direct matches
    nodes.forEach(node => {
        if (matchesFilters(node, filters)) {
            matchingNodeIds.add(node.id);
        }
    });

    // Pass 2: Neighbors (if enabled)
    if (showNeighbors && matchingNodeIds.size > 0) {
        // Find all edges connected to matching nodes
        // We iterate edges to find neighbors
        // This acts as "bfs" of depth 1
        const neighborIds = new Set<string>();

        edges.forEach(edge => {
            if (matchingNodeIds.has(edge.source)) {
                neighborIds.add(edge.target);
            }
            if (matchingNodeIds.has(edge.target)) {
                neighborIds.add(edge.source);
            }
        });

        // Add neighbors to matching set
        neighborIds.forEach(id => matchingNodeIds.add(id));
    }

    return matchingNodeIds;
}

// Create styled ReactFlow node from RawNode and position
function createStyledNode(
    node: RawNode,
    position: { x: number; y: number },
    isMatching: boolean,
    isSelected: boolean
): Node {
    const color = getNodeColor(node);
    const isChanged = node.status && node.status !== 'unchanged';

    return {
        id: node.id,
        data: {
            label: node.label + (isChanged ? ` (${node.status})` : ''),
            type: node.type,
            language: node.language,
            extension: node.extension,
            filePath: node.filePath || node.id,
            lineNumber: node.lineNumber,
            endLineNumber: node.endLineNumber,
            status: node.status, // Pass status to data
        },
        position,
        style: {
            background: node.type === 'directory'
                ? `${color}20`
                : 'var(--am-panel-bg)',
            color: 'var(--am-panel-fg)',
            borderColor: isSelected ? 'var(--am-accent)' : color,
            borderWidth: isSelected ? 3 : (node.type === 'directory' ? 2 : 1),
            borderRadius: node.type === 'directory' ? 8 : 4,
            opacity: isMatching ? 1 : 0.3,
            boxShadow: isSelected ? '0 0 10px var(--am-accent)' : undefined,
            borderStyle: isChanged ? 'dashed' : 'solid', // Dashed border for changed files
        },
        className: isMatching ? 'matching-node' : 'dimmed-node',
    };
}

function getNodeColorFromData(data?: { type?: string; language?: string; status?: string }): string {
    if (data?.status && data.status !== 'unchanged' && STATUS_COLORS[data.status]) {
        return STATUS_COLORS[data.status];
    }
    if (data?.type === 'directory') return NODE_COLORS.directory;
    if (data?.type === 'function') return NODE_COLORS.function;
    if (data?.type === 'class') return NODE_COLORS.class;
    if (data?.type === 'module') return NODE_COLORS.module;
    if (data?.language) return NODE_COLORS[data.language] || NODE_COLORS.default;
    return NODE_COLORS.default;
}

function getBaseNodeBackground(node: Node): string {
    const color = getNodeColorFromData(node.data);
    const type = node.data?.type;
    return type === 'directory' ? `${color}20` : 'var(--am-panel-bg)';
}

function applyHeatmapToNode(node: Node, heatmap: HeatmapState, mode: HeatmapMode): Node {
    if (node.type === 'clusterNode') {
        return node;
    }
    if (!node.data) return node;

    const filePath = node.data.filePath || node.id;
    const entry = mode === 'off' ? undefined : heatmap.entries.get(normalizePath(filePath));
    const background = entry ? entry.color : getBaseNodeBackground(node);

    return {
        ...node,
        data: {
            ...node.data,
            heatmapTooltip: entry ? entry.tooltip : undefined,
        },
        style: {
            ...node.style,
            background,
        },
    };
}

function applyGraphPatch(current: ArchitectureData, patch: GraphPatch): ArchitectureData {
    const removedFiles = new Set(
        [...(patch.changed_files || []), ...(patch.removed_files || [])].map(normalizePath)
    );

    const nodesById = new Map(current.nodes.map((node) => [node.id, node]));
    const edgesById = new Map(current.edges.map((edge) => [edge.id, edge]));

    nodesById.forEach((node, id) => {
        const fileKey = getNodeFileKey(node);
        if (fileKey && removedFiles.has(fileKey)) {
            nodesById.delete(id);
        }
    });

    edgesById.forEach((edge, id) => {
        if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) {
            edgesById.delete(id);
        }
    });

    patch.nodes?.forEach((node) => {
        nodesById.set(node.id, node);
    });

    patch.edges?.forEach((edge) => {
        edgesById.set(edge.id, edge);
    });

    const nodes = Array.from(nodesById.values());
    const edges = Array.from(edgesById.values());

    return {
        ...current,
        nodes,
        edges,
        stats: recalculateStats(nodes),
    };
}

function getNodeFileKey(node: RawNode): string | null {
    if (node.filePath) {
        return normalizePath(node.filePath);
    }
    if (node.type === 'file') {
        return normalizePath(node.id);
    }
    if (node.id.includes('::')) {
        return normalizePath(node.id.split('::')[0]);
    }
    return null;
}

function recalculateStats(nodes: RawNode[]): GraphStats {
    const files = nodes.filter((node) => node.type === 'file');
    const directories = nodes.filter((node) => node.type === 'directory');
    const functions = nodes.filter((node) => node.type === 'function');
    const classes = nodes.filter((node) => node.type === 'class');

    const filesByLanguage: Record<string, number> = {};
    files.forEach((node) => {
        if (!node.language) return;
        filesByLanguage[node.language] = (filesByLanguage[node.language] || 0) + 1;
    });

    return {
        totalFiles: files.length,
        totalDirectories: directories.length,
        totalFunctions: functions.length,
        totalClasses: classes.length,
        filesByLanguage,
    };
}

// Hierarchical layout algorithm (original built-in)
function calculateHierarchicalLayout(
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null
): { layoutedNodes: Node[]; matchingNodeIds: Set<string> } {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;

    // Group nodes by depth
    const nodesByDepth: Map<number, RawNode[]> = new Map();
    nodes.forEach(node => {
        const depthNodes = nodesByDepth.get(node.depth) || [];
        depthNodes.push(node);
        nodesByDepth.set(node.depth, depthNodes);
    });

    const layoutedNodes: Node[] = [];
    const horizontalSpacing = 280; // Increased from 220 for better spacing
    const verticalSpacing = 120;   // Increased from 80 for better vertical spacing

    nodesByDepth.forEach((depthNodes, depth) => {
        const totalWidth = depthNodes.length * horizontalSpacing;
        const startX = -totalWidth / 2;

        depthNodes.forEach((node, index) => {
            const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
            const isSelected = selectedNodeId === node.id;

            layoutedNodes.push(createStyledNode(
                node,
                { x: startX + index * horizontalSpacing, y: depth * verticalSpacing },
                isMatching,
                isSelected
            ));
        });
    });

    return { layoutedNodes, matchingNodeIds };
}

// By-File layout: Groups functions and classes under their parent files
function calculateByFileLayout(
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null
): { layoutedNodes: Node[]; matchingNodeIds: Set<string> } {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;

    // Group nodes by file
    const fileNodes = nodes.filter(n => n.type === 'file');
    const childNodesMap = new Map<string, RawNode[]>();
    
    // Find children (functions/classes) for each file
    nodes.forEach(node => {
        if (node.type === 'function' || node.type === 'class') {
            // Extract file path from node ID (format: "path/file.ext::FunctionName")
            const filePath = node.id.split('::')[0];
            const children = childNodesMap.get(filePath) || [];
            children.push(node);
            childNodesMap.set(filePath, children);
        }
    });

    const layoutedNodes: Node[] = [];
    const horizontalSpacing = 280;
    const verticalSpacing = 100;
    const childHorizontalSpacing = 200;
    const childVerticalSpacing = 80;

    let currentX = 0;
    let currentY = 0;
    const filesPerRow = 4;

    fileNodes.forEach((fileNode, fileIndex) => {
        const isMatching = !hasActiveFilter || matchingNodeIds.has(fileNode.id);
        const isSelected = selectedNodeId === fileNode.id;

        // Position file node
        const row = Math.floor(fileIndex / filesPerRow);
        const col = fileIndex % filesPerRow;
        const fileX = col * horizontalSpacing;
        const fileY = row * verticalSpacing * 3;

        layoutedNodes.push(createStyledNode(
            fileNode,
            { x: fileX, y: fileY },
            isMatching,
            isSelected
        ));

        // Position child nodes (functions/classes) below the file
        const children = childNodesMap.get(fileNode.id) || [];
        children.forEach((child, childIndex) => {
            const isChildMatching = !hasActiveFilter || matchingNodeIds.has(child.id);
            const isChildSelected = selectedNodeId === child.id;
            
            const childRow = Math.floor(childIndex / 2);
            const childCol = childIndex % 2;
            const childX = fileX - 100 + childCol * childHorizontalSpacing;
            const childY = fileY + verticalSpacing + childRow * childVerticalSpacing;

            layoutedNodes.push(createStyledNode(
                child,
                { x: childX, y: childY },
                isChildMatching,
                isChildSelected
            ));
        });
    });

    return { layoutedNodes, matchingNodeIds };
}

// By-Module layout: Groups files under their parent modules/directories
function calculateByModuleLayout(
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null
): { layoutedNodes: Node[]; matchingNodeIds: Set<string> } {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;

    // Group nodes by module (directory/module type)
    const moduleNodes = nodes.filter(n => n.type === 'module' || n.type === 'directory');
    const fileNodes = nodes.filter(n => n.type === 'file');
    
    // Build module -> files mapping
    const moduleFilesMap = new Map<string, RawNode[]>();
    fileNodes.forEach(file => {
        // Find parent module from file path
        const pathParts = file.id.split('/');
        const moduleName = pathParts.length > 1 ? pathParts[0] : 'root';
        const files = moduleFilesMap.get(moduleName) || [];
        files.push(file);
        moduleFilesMap.set(moduleName, files);
    });

    const layoutedNodes: Node[] = [];
    const moduleSpacing = 400;
    const fileSpacing = 220;
    const verticalSpacing = 100;

    let currentX = 0;
    
    // Layout modules and their files
    const allModules = [...new Set([...moduleNodes.map(m => m.id), ...Array.from(moduleFilesMap.keys())])];
    
    allModules.forEach((moduleName, moduleIndex) => {
        const moduleX = moduleIndex * moduleSpacing;
        
        // Find or create module node
        const moduleNode = moduleNodes.find(m => m.id === moduleName);
        if (moduleNode) {
            const isMatching = !hasActiveFilter || matchingNodeIds.has(moduleNode.id);
            const isSelected = selectedNodeId === moduleNode.id;
            layoutedNodes.push(createStyledNode(
                moduleNode,
                { x: moduleX, y: 0 },
                isMatching,
                isSelected
            ));
        }

        // Layout files under this module
        const files = moduleFilesMap.get(moduleName) || [];
        files.forEach((file, fileIndex) => {
            const isMatching = !hasActiveFilter || matchingNodeIds.has(file.id);
            const isSelected = selectedNodeId === file.id;
            
            const fileY = verticalSpacing + fileIndex * verticalSpacing;
            layoutedNodes.push(createStyledNode(
                file,
                { x: moduleX, y: fileY },
                isMatching,
                isSelected
            ));
        });
    });

    // Layout standalone functions/classes
    const standaloneNodes = nodes.filter(n => 
        (n.type === 'function' || n.type === 'class') && 
        !fileNodes.some(f => n.id.startsWith(f.id))
    );
    standaloneNodes.forEach((node, index) => {
        const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
        const isSelected = selectedNodeId === node.id;
        layoutedNodes.push(createStyledNode(
            node,
            { x: allModules.length * moduleSpacing, y: index * verticalSpacing },
            isMatching,
            isSelected
        ));
    });

    return { layoutedNodes, matchingNodeIds };
}

// Dependency-Only layout: Shows only nodes with CALLS/IMPORTS relationships
function calculateDependencyOnlyLayout(
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null
): { layoutedNodes: Node[]; matchingNodeIds: Set<string> } {
    // Filter to only show nodes that have CALLS or IMPORTS edges
    const dependencyEdges = edges.filter(e => e.type === 'calls' || e.type === 'imports');
    const connectedNodeIds = new Set<string>();
    dependencyEdges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
    });

    const filteredNodes = nodes.filter(n => connectedNodeIds.has(n.id));
    
    // Use dagre layout for dependency graph
    return calculateDagreLayout(filteredNodes, dependencyEdges, filters, selectedNodeId, 'TB');
}

// Dagre layout algorithm
function calculateDagreLayout(
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null,
    direction: 'TB' | 'LR'
): { layoutedNodes: Node[]; matchingNodeIds: Set<string> } {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;

    const layoutNodes: LayoutNode[] = nodes.map(n => ({
        id: n.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        depth: n.depth,
    }));

    const layoutEdges: LayoutEdge[] = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
    }));

    const result = dagreLayout(layoutNodes, layoutEdges, direction);

    const layoutedNodes: Node[] = nodes.map(node => {
        const position = result.nodes.get(node.id) || { x: 0, y: 0 };
        const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
        const isSelected = selectedNodeId === node.id;

        return createStyledNode(node, position, isMatching, isSelected);
    });

    return { layoutedNodes, matchingNodeIds };
}

// ELK layout algorithm (async)
async function calculateElkLayout(
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null,
    algorithm: 'layered' | 'force'
): Promise<{ layoutedNodes: Node[]; matchingNodeIds: Set<string> }> {
    const matchingNodeIds = calculateMatchingNodeIds(nodes, edges, filters);
    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;

    const layoutNodes: LayoutNode[] = nodes.map(n => ({
        id: n.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        depth: n.depth,
    }));

    const layoutEdges: LayoutEdge[] = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
    }));

    const result = await elkLayout(layoutNodes, layoutEdges, algorithm);

    const layoutedNodes: Node[] = nodes.map(node => {
        const position = result.nodes.get(node.id) || { x: 0, y: 0 };
        const isMatching = !hasActiveFilter || matchingNodeIds.has(node.id);
        const isSelected = selectedNodeId === node.id;

        return createStyledNode(node, position, isMatching, isSelected);
    });

    return { layoutedNodes, matchingNodeIds };
}

// Main layout calculation function
async function calculateLayout(
    layoutType: LayoutType,
    nodes: RawNode[],
    edges: RawEdge[],
    filters: SearchFilters,
    selectedNodeId: string | null
): Promise<{ layoutedNodes: Node[]; matchingNodeIds: Set<string> }> {
    switch (layoutType) {
        case 'dagre-tb':
            return calculateDagreLayout(nodes, edges, filters, selectedNodeId, 'TB');
        case 'dagre-lr':
            return calculateDagreLayout(nodes, edges, filters, selectedNodeId, 'LR');
        case 'elk-layered':
            return calculateElkLayout(nodes, edges, filters, selectedNodeId, 'layered');
        case 'elk-force':
            return calculateElkLayout(nodes, edges, filters, selectedNodeId, 'force');
        case 'force-directed':
            // Use ELK force layout for force-directed
            return calculateElkLayout(nodes, edges, filters, selectedNodeId, 'force');
        case 'by-file':
            return calculateByFileLayout(nodes, edges, filters, selectedNodeId);
        case 'by-module':
            return calculateByModuleLayout(nodes, edges, filters, selectedNodeId);
        case 'dependency-only':
            return calculateDependencyOnlyLayout(nodes, edges, filters, selectedNodeId);
        case 'hierarchical':
        default:
            return calculateHierarchicalLayout(nodes, edges, filters, selectedNodeId);
    }
}

// Format edges with proper styling
function formatEdges(rawEdges: RawEdge[], selectedNodeId: string | null, matchingNodeIds: Set<string>): Edge[] {
    return rawEdges.map(edge => {
        const isConnectedToSelected = selectedNodeId !== null &&
            (edge.source === selectedNodeId || edge.target === selectedNodeId);
        const isMatching = matchingNodeIds.size === 0 ||
            (matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target));

        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            animated: isConnectedToSelected ? true : false,
            style: {
                stroke: isConnectedToSelected
                    ? 'var(--am-accent)'
                    : 'var(--am-fg)',
                strokeWidth: isConnectedToSelected ? 2 : 1,
                opacity: isMatching ? (isConnectedToSelected ? 0.9 : 0.5) : 0.15,
            },
        };
    });
}

// Declare VS Code API type
declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

interface StatsDisplayProps {
    stats: GraphStats | null;
    source?: 'local' | 'backend';
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, source = 'local' }) => {
    if (!stats) return null;

    return (
        <div className="stats-panel">
            <div className="source-badge" style={{
                backgroundColor: source === 'backend' ? '#27ae60' : '#3498db',
            }}>
                {source === 'backend' ? '🌐 Backend (Neo4j)' : '📁 Local'}
            </div>
            <div className="stat-item">
                <span className="stat-label">Files:</span>
                <span className="stat-value">{stats.totalFiles}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">Directories:</span>
                <span className="stat-value">{stats.totalDirectories}</span>
            </div>
            {stats.totalFunctions !== undefined && stats.totalFunctions > 0 && (
                <div className="stat-item">
                    <span className="stat-label">Functions:</span>
                    <span className="stat-value">{stats.totalFunctions}</span>
                </div>
            )}
            {stats.totalClasses !== undefined && stats.totalClasses > 0 && (
                <div className="stat-item">
                    <span className="stat-label">Classes:</span>
                    <span className="stat-value">{stats.totalClasses}</span>
                </div>
            )}
            {Object.entries(stats.filesByLanguage).length > 0 && (
                <div className="stat-languages">
                    {Object.entries(stats.filesByLanguage)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([lang, count]) => (
                            <span key={lang} className="language-badge" style={{
                                backgroundColor: NODE_COLORS[lang] || NODE_COLORS.default,
                            }}>
                                {lang}: {count}
                            </span>
                        ))}
                </div>
            )}
        </div>
    );
};

// Search Panel Component
interface SearchPanelProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    matchCount: number;
    totalCount: number;
    onFocusSelection: () => void;
    isVisible: boolean;
    onClose: () => void;
}

const SearchPanel: React.FC<SearchPanelProps & { availableLanguages: string[] }> = ({
    filters,
    onFiltersChange,
    matchCount,
    totalCount,
    onFocusSelection,
    isVisible,
    onClose,
    availableLanguages
}) => {
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isVisible && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const hasActiveFilter = filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern;

    const toggleNodeType = (type: NodeTypeFilter) => {
        const current = filters.nodeTypes;
        if (current.includes(type)) {
            onFiltersChange({ ...filters, nodeTypes: current.filter(t => t !== type) });
        } else {
            onFiltersChange({ ...filters, nodeTypes: [...current, type] });
        }
    };

    const toggleLanguage = (lang: string) => {
        const current = filters.languages;
        if (current.includes(lang)) {
            onFiltersChange({ ...filters, languages: current.filter(l => l !== lang) });
        } else {
            onFiltersChange({ ...filters, languages: [...current, lang] });
        }
    };

    return (
        <div className="search-panel">
            <div className="search-header">
                <span className="search-title">🔍 Search & Filter</span>
                <button className="search-close" onClick={onClose} title="Close (Esc)">×</button>
            </div>

            <div className="search-field">
                <label>Search by name:</label>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Enter file/function name..."
                    value={filters.searchTerm}
                    onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
                    className="search-input"
                />
            </div>

            <div className="search-field">
                <label>Path pattern:</label>
                <input
                    type="text"
                    placeholder="e.g., src/*.ts, **/utils/*"
                    value={filters.pathPattern}
                    onChange={(e) => onFiltersChange({ ...filters, pathPattern: e.target.value })}
                    className="search-input"
                />
            </div>

            <div className="search-section">
                <label>Filter by Type:</label>
                <div className="checkbox-group">
                    {['file', 'directory', 'function', 'class', 'module'].map(type => (
                        <label key={type} className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={filters.nodeTypes.includes(type as NodeTypeFilter)}
                                onChange={() => toggleNodeType(type as NodeTypeFilter)}
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                    ))}
                </div>
            </div>

            {availableLanguages.length > 0 && (
                <div className="search-section">
                    <label>Filter by Language:</label>
                    <div className="checkbox-group">
                        {availableLanguages.map(lang => (
                            <label key={lang} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={filters.languages.includes(lang)}
                                    onChange={() => toggleLanguage(lang)}
                                />
                                {lang}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="search-field toggle-field">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={filters.showNeighbors}
                        onChange={(e) => onFiltersChange({ ...filters, showNeighbors: e.target.checked })}
                    />
                    Show Reachable Neighbors
                </label>
            </div>

            <div className="search-results">
                {hasActiveFilter ? (
                    <span className="result-count">
                        Found <strong>{matchCount}</strong> of {totalCount} nodes
                    </span>
                ) : (
                    <span className="result-count">Showing all {totalCount} nodes</span>
                )}
            </div>

            <div className="search-actions">
                <button
                    className="search-btn"
                    onClick={onFocusSelection}
                    disabled={matchCount === 0}
                    title="Zoom to show all matching nodes"
                >
                    📍 Focus on Results
                </button>
                <button
                    className="search-btn secondary"
                    onClick={() => onFiltersChange({
                        searchTerm: '',
                        nodeTypes: [],
                        languages: [],
                        pathPattern: '',
                        showNeighbors: false
                    })}
                    disabled={!hasActiveFilter}
                >
                    Clear Filters
                </button>
            </div>

            <div className="search-hint">
                <kbd>Ctrl</kbd>+<kbd>F</kbd> to toggle search
            </div>

            <style>{`
                .search-section { margin-bottom: 12px; }
                .checkbox-group { 
                    display: flex; 
                    flex-wrap: wrap; 
                    gap: 8px; 
                    margin-top: 4px;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    background: var(--am-bg-lighter);
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid var(--am-border);
                }
                .checkbox-label:hover { background: var(--am-bg-hover); }
                .toggle-field { margin-top: 8px; }
            `}</style>
        </div>
    );
};

// Tooltip Component for Node Hover
interface TooltipProps {
    node: Node | null;
    position: { x: number; y: number };
}

const NodeTooltip: React.FC<TooltipProps> = ({ node, position }) => {
    if (!node) return null;

    const data = node.data;
    return (
        <div
            className="node-tooltip"
            style={{
                left: position.x + 10,
                top: position.y + 10,
            }}
        >
            <div className="tooltip-header">
                <span className="tooltip-icon">
                    {data.type === 'directory' ? '📁' :
                        data.type === 'function' ? '⚡' :
                            data.type === 'class' ? '🏷️' : '📄'}
                </span>
                <span className="tooltip-label">{data.label}</span>
            </div>
            <div className="tooltip-details">
                <div className="tooltip-row">
                    <span className="tooltip-key">Path:</span>
                    <span className="tooltip-value">{data.filePath || node.id}</span>
                </div>
                {data.lineNumber && (
                    <div className="tooltip-row">
                        <span className="tooltip-key">Line:</span>
                        <span className="tooltip-value">
                            {data.lineNumber}{data.endLineNumber ? ` - ${data.endLineNumber}` : ''}
                        </span>
                    </div>
                )}
                {data.language && (
                    <div className="tooltip-row">
                        <span className="tooltip-key">Language:</span>
                        <span className="tooltip-value">{data.language}</span>
                    </div>
                )}
                <div className="tooltip-row">
                    <span className="tooltip-key">Type:</span>
                    <span className="tooltip-value">{data.type}</span>
                </div>
                {data.heatmapTooltip && (
                    <div className="tooltip-row">
                        <span className="tooltip-key">Heatmap:</span>
                        <span className="tooltip-value">{data.heatmapTooltip}</span>
                    </div>
                )}
            </div>
            <div className="tooltip-hint">
                Click to open • Right-click for actions
            </div>
        </div>
    );
};

// Context Menu Component
interface ContextMenuProps {
    node: Node | null;
    position: { x: number; y: number };
    onAction: (action: string) => void;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ node, position, onAction, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!node) return null;

    const isFile = node.data.type === 'file' || node.data.type === 'function' || node.data.type === 'class';

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ left: position.x, top: position.y }}
        >
            <div className="context-menu-header">{node.data.label}</div>
            <div className="context-menu-divider" />
            {isFile && (
                <>
                    <button className="context-menu-item" onClick={() => onAction('open')}>
                        📄 Open File
                    </button>
                    <button className="context-menu-item" onClick={() => onAction('goToDefinition')}>
                        🎯 Go to Definition
                    </button>
                    <button className="context-menu-item" onClick={() => onAction('findReferences')}>
                        🔗 Find References
                    </button>
                    <div className="context-menu-divider" />
                </>
            )}
            <button className="context-menu-item" onClick={() => onAction('revealInExplorer')}>
                📂 Reveal in Explorer
            </button>
            <button className="context-menu-item" onClick={() => onAction('copyPath')}>
                📋 Copy Path
            </button>
            <div className="context-menu-divider" />
            <button className="context-menu-item" onClick={() => onAction('analyzeImpact')}>
                💥 Analyze Impact
            </button>
            <button className="context-menu-item" onClick={() => onAction('showRelationships')}>
                🔗 Show Relationships
            </button>
        </div>
    );
};

// Layout Panel Component
interface LayoutPanelProps {
    currentLayout: LayoutType;
    onLayoutChange: (layout: LayoutType) => void;
    isLayouting: boolean;
    isVisible: boolean;
    onClose: () => void;
}

const LayoutPanel: React.FC<LayoutPanelProps> = ({
    currentLayout,
    onLayoutChange,
    isLayouting,
    isVisible,
    onClose,
}) => {
    if (!isVisible) return null;

    return (
        <div className="layout-panel">
            <div className="layout-header">
                <span className="layout-title">📐 Layout Algorithm</span>
                <button className="layout-close" onClick={onClose} title="Close">×</button>
            </div>

            <div className="layout-options">
                {LAYOUT_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        className={`layout-option ${currentLayout === option.value ? 'active' : ''}`}
                        onClick={() => onLayoutChange(option.value)}
                        disabled={isLayouting}
                        title={option.description}
                    >
                        <span className="layout-option-label">{option.label}</span>
                        {currentLayout === option.value && <span className="layout-check">✓</span>}
                    </button>
                ))}
            </div>

            {isLayouting && (
                <div className="layout-loading">
                    <div className="loading-spinner-small" />
                    <span>Calculating layout...</span>
                </div>
            )}

            <div className="layout-hint">
                <kbd>Ctrl</kbd>+<kbd>L</kbd> to toggle layout panel
            </div>
        </div>
    );
};

// Inner component that uses ReactFlow hooks
interface ArchitectureGraphProps {
    heatmapMode: HeatmapMode;
}

const ArchitectureGraphInner: React.FC<ArchitectureGraphProps> = ({ heatmapMode }) => {
    // VS Code API reference - memoized to call only once
    const vscode = useMemo(() => acquireVsCodeApi(), []);
    const vscodeRef = useRef(vscode); // Keep ref for backward compatibility in callbacks

    const apiClient = useMemo(() => new ArchMindWebviewApiClient(), []);

    const state = vscode.getState() as { filters?: SearchFilters; layoutType?: LayoutType } || {};

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [stats, setStats] = useState<GraphStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState<string>('Analyzing workspace structure...');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'local' | 'backend'>('local');
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);

    const heatmapState = useMemo(
        () => buildHeatmap(contributions?.contributions || [], heatmapMode),
        [contributions, heatmapMode]
    );

    // Search and filter state - initialized from persistence
    const [searchVisible, setSearchVisible] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>(state.filters || {
        searchTerm: '',
        nodeTypes: [],
        languages: [],
        pathPattern: '',
        showNeighbors: false,
    });

    // Debounce filters for performance on large graphs (200ms delay)
    const debouncedFilters = useDebounce(filters, 200);

    // Tooltip state
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // Context menu state
    const [contextMenuNode, setContextMenuNode] = useState<Node | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

    // Store raw data for re-filtering
    const [rawData, setRawData] = useState<ArchitectureData | null>(null);
    const [matchingNodeIds, setMatchingNodeIds] = useState<Set<string>>(new Set());

    // Local Outline State
    const [localSymbols, setLocalSymbols] = useState<LocalSymbol[]>([]);
    const [localFileName, setLocalFileName] = useState<string>('');
    const [localOutlineVisible, setLocalOutlineVisible] = useState<boolean>(true);

    // Layout state - initialized from persistence
    const [layoutType, setLayoutType] = useState<LayoutType>(state.layoutType || 'hierarchical');
    const [layoutPanelVisible, setLayoutPanelVisible] = useState(false);
    const [isLayouting, setIsLayouting] = useState(false);

    // Persist state when filters or layout change
    useEffect(() => {
        vscode.setState({ filters, layoutType });
    }, [filters, layoutType, vscode]);

    // Clustering state (#11)
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [clusterState, setClusterState] = useState<ClusterState>({});
    const [clusteringEnabled, setClusteringEnabled] = useState(false);

    // Impact Analysis state (#15)
    const [impactData, setImpactData] = useState<ImpactAnalysisData | null>(null);
    const [impactVisible, setImpactVisible] = useState(false);

    // Keyboard Navigation state (#18)
    const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);

    // Relationship Visualizer state (#21)
    const [relationshipVisible, setRelationshipVisible] = useState(false);

    // Export Menu state
    const [exportMenuVisible, setExportMenuVisible] = useState(false);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const graphContainerRef = useRef<HTMLDivElement>(null);
    const reactFlowWrapperRef = useRef<HTMLDivElement>(null);

    // WebSocket state
    const wsClientRef = useRef<ArchMindWebSocketClient | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [repoId, setRepoId] = useState<string | null>(null);

    // ReactFlow instance for programmatic control
    const reactFlowInstance = useReactFlow();

    // Zoom & Pan controls (#20)
    const zoomPan = useZoomPan({ minZoom: 0.1, maxZoom: 4.0 });
    useZoomPanKeyboard(zoomPan);

    // Mini-map click navigation (#19)
    const { handleMiniMapNodeClick } = useMiniMapNavigation((nodeId) => {
        setSelectedNode(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            reactFlowInstance.setCenter(
                node.position.x + (NODE_WIDTH / 2),
                node.position.y + (NODE_HEIGHT / 2),
                { zoom: 1, duration: 300 }
            );
        }
    });

    // (Removed duplicate vscodeRef init)

    // ... (onConnect, mouse handlers...)

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Handle node click - open file in VS Code
    const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
        setSelectedNode(node.id);
        setContextMenuNode(null);

        // Open file in VS Code
        if (vscodeRef.current && node.data.type !== 'directory') {
            vscodeRef.current.postMessage({
                command: 'openFile',
                filePath: node.data.filePath || node.id,
                lineNumber: node.data.lineNumber,
            });
        }
    }, []);

    // ... (rest of handlers)

    // Handle node right-click - show context menu
    const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
        event.preventDefault();
        setContextMenuNode(node);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
    }, []);

    // Handle node hover
    const onNodeMouseEnter: NodeMouseHandler = useCallback((event, node) => {
        setHoveredNode(node);
        setTooltipPosition({ x: event.clientX, y: event.clientY });
    }, []);

    const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
        setHoveredNode(null);
    }, []);

    // Handle context menu actions
    const handleContextMenuAction = useCallback((action: string) => {
        if (!contextMenuNode || !vscodeRef.current) return;

        // ... (implementation same as before)
        const filePath = contextMenuNode.data.filePath || contextMenuNode.id;
        const lineNumber = contextMenuNode.data.lineNumber;

        switch (action) {
            case 'open':
                vscodeRef.current.postMessage({
                    command: 'openFile',
                    filePath,
                    lineNumber,
                });
                break;
            case 'goToDefinition':
                vscodeRef.current.postMessage({
                    command: 'goToDefinition',
                    filePath,
                    lineNumber,
                });
                break;
            case 'findReferences':
                vscodeRef.current.postMessage({
                    command: 'findReferences',
                    filePath,
                    lineNumber,
                });
                break;
            case 'revealInExplorer':
                vscodeRef.current.postMessage({
                    command: 'revealInExplorer',
                    filePath,
                });
                break;
            case 'copyPath':
                vscodeRef.current.postMessage({
                    command: 'copyPath',
                    filePath,
                });
                break;
            case 'analyzeImpact':
                // Perform local impact analysis based on edges
                if (rawData) {
                    const affectedNodes: { nodeId: string; distance: number; impactType: 'direct' | 'indirect' }[] = [];
                    const visited = new Set<string>();
                    const queue: { id: string; distance: number }[] = [{ id: contextMenuNode.id, distance: 0 }];
                    visited.add(contextMenuNode.id);

                    while (queue.length > 0) {
                        const current = queue.shift()!;
                        if (current.distance > 0) {
                            affectedNodes.push({
                                nodeId: current.id,
                                distance: current.distance,
                                impactType: current.distance === 1 ? 'direct' : 'indirect',
                            });
                        }
                        if (current.distance < 3) {
                            rawData.edges.forEach(edge => {
                                const neighbor = edge.source === current.id ? edge.target :
                                    edge.target === current.id ? edge.source : null;
                                if (neighbor && !visited.has(neighbor)) {
                                    visited.add(neighbor);
                                    queue.push({ id: neighbor, distance: current.distance + 1 });
                                }
                            });
                        }
                    }

                    setImpactData({
                        sourceNodeId: contextMenuNode.id,
                        affectedNodes,
                        maxDepth: Math.max(0, ...affectedNodes.map(n => n.distance)),
                        totalImpact: affectedNodes.length,
                    });
                    setImpactVisible(true);
                }
                break;
            case 'showRelationships':
                setSelectedNode(contextMenuNode.id);
                setRelationshipVisible(true);
                break;
        }

        setContextMenuNode(null);
    }, [contextMenuNode, rawData]);

    // Focus on filtered/matching nodes
    const handleFocusSelection = useCallback(() => {
        if (matchingNodeIds.size === 0) return;

        const matchingNodes = nodes.filter(n => matchingNodeIds.has(n.id));
        if (matchingNodes.length > 0) {
            reactFlowInstance.fitView({
                nodes: matchingNodes,
                padding: 0.3,
                duration: 500,
            });
        }
    }, [matchingNodeIds, nodes, reactFlowInstance]);

    // Fullscreen toggle handler (CSS-based for VS Code webview)
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+F / Cmd+F to toggle search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setSearchVisible(prev => !prev);
            }
            // Ctrl+L / Cmd+L to toggle layout panel
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                setLayoutPanelVisible(prev => !prev);
            }
            // Ctrl+E / Cmd+E to toggle export menu
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setExportMenuVisible(prev => !prev);
            }
            // F11 to toggle fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            }
            // Escape to close search, context menu, layout panel, export menu, or exit fullscreen
            if (e.key === 'Escape') {
                if (isFullscreen) {
                    toggleFullscreen();
                } else {
                    setSearchVisible(false);
                    setContextMenuNode(null);
                    setLayoutPanelVisible(false);
                    setExportMenuVisible(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleFullscreen, isFullscreen]);

    // Update graph when debounced filters, layout type, or selection change
    // ... (same as before)

    useEffect(() => {
        // ... (runLayout implementation)
        if (!rawData) return;
        const { nodes: rawNodes, edges: rawEdges } = rawData;

        // Use async layout calculation
        const runLayout = async () => {
            setIsLayouting(true);
            try {
                const { layoutedNodes, matchingNodeIds: newMatchingIds } = await calculateLayout(
                    layoutType,
                    rawNodes,
                    rawEdges,
                    debouncedFilters,
                    selectedNode
                );
                const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);

                setNodes(layoutedNodes);
                setEdges(formattedEdges);
                setMatchingNodeIds(newMatchingIds);
            } catch (error) {
                console.error('Layout calculation failed:', error);
            } finally {
                setIsLayouting(false);
            }
        };

        runLayout();
    }, [debouncedFilters, selectedNode, rawData, layoutType, setNodes, setEdges]);


    // Message handling
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // ... (message handling logic same as before)
            const message = event.data;

            // Handle loading state
            if (message.command === 'loading') {
                setIsLoading(true);
                setLoadingMessage(message.message || 'Loading...');
                setErrorMessage(null);
                return;
            }

            // Handle error state
            if (message.command === 'error') {
                setIsLoading(false);
                setErrorMessage(message.message || 'An error occurred');
                return;
            }

            // Handle no data state
            if (message.command === 'noData') {
                setIsLoading(false);
                setErrorMessage(message.message || 'No data available');
                return;
            }

            if (message.command === 'architectureData') {
                setErrorMessage(null);
                const data: ArchitectureData = message.data;
                setRawData(data);
                setDataSource(data.source || 'local');

                // Extract and store repo_id for WebSocket connection (support both naming conventions)
                const extractedRepoId = data.repo_id || data.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
                }

                const { nodes: rawNodes, edges: rawEdges, stats: graphStats } = data;

                // Apply initial layout asynchronously
                const initLayout = async () => {
                    try {
                        const { layoutedNodes, matchingNodeIds: newMatchingIds } = await calculateLayout(
                            layoutType,
                            rawNodes,
                            rawEdges,
                            debouncedFilters,
                            selectedNode
                        );
                        const formattedEdges = formatEdges(rawEdges, selectedNode, newMatchingIds);

                        setNodes(layoutedNodes);
                        setEdges(formattedEdges);
                        setStats(graphStats);
                        setMatchingNodeIds(newMatchingIds);
                        setIsLoading(false);
                    } catch (error) {
                        console.error('Initial layout failed:', error);
                        setIsLoading(false);
                    }
                };

                initLayout();
            }

            // Handle impact analysis response
            if (message.command === 'impactAnalysis') {
                console.log('Impact analysis data:', message.data);
                // TODO: Highlight impacted nodes in the graph
            }

            // Handle local parsed data
            if (message.command === 'localData') {
                const { symbols, fileName } = message.data;
                setLocalSymbols(symbols);
                setLocalFileName(fileName);
                setLocalOutlineVisible(true);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request data (using stable vscode instance)
        vscode.postMessage({ command: 'requestArchitecture' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [setNodes, setEdges, vscode, debouncedFilters, layoutType, selectedNode]);

    useEffect(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }

        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) {
                    setContributions(response);
                }
            } catch (error) {
                if (active) {
                    setContributions(null);
                }
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId, heatmapMode]);

    useEffect(() => {
        if (!nodes.length) return;
        setNodes((prevNodes) => prevNodes.map((node) => applyHeatmapToNode(node, heatmapState, heatmapMode)));
    }, [heatmapMode, heatmapState, setNodes, nodes.length]);

    // WebSocket connection management
    useEffect(() => {
        if (!repoId) return;

        // Create WebSocket client for repo updates
        const wsClient = new ArchMindWebSocketClient('repo', repoId, 'http://localhost:8080');
        wsClientRef.current = wsClient;

        // Handle WebSocket updates
        const unsubscribe = wsClient.subscribeAll((update: JobUpdate) => {
            console.log('📡 WebSocket update received:', update);

            if (update.type === 'graph_update') {
                // Graph has been updated - refresh the data
                vscode.postMessage({ command: 'requestArchitecture' });
                
                // Show notification
                vscode.postMessage({
                    command: 'showNotification',
                    message: `Architecture updated: ${update.changed_nodes?.length || 0} nodes changed`,
                    type: 'info'
                });
            } else if (update.type === 'graph_patch') {
                const patch = update.result_summary?.graph_patch as GraphPatch | undefined;
                if (patch) {
                    setRawData((current) => (current ? applyGraphPatch(current, patch) : current));
                    vscode.postMessage({
                        command: 'showNotification',
                        message: `Graph patch applied: ${patch.changed_files?.length || 0} files updated`,
                        type: 'info',
                    });
                }
            } else if (update.type === 'graph_updated') {
                const patch = update.result_summary?.graph_patch as GraphPatch | undefined;
                if (patch) {
                    setRawData((current) => (current ? applyGraphPatch(current, patch) : current));
                }
                const fileCount = patch?.changed_files?.length || update.changed_nodes?.length || 0;
                vscode.postMessage({
                    command: 'showNotification',
                    message: `Architecture updated: ${fileCount} files changed`,
                    type: 'info',
                });
            } else if (update.type === 'progress') {
                // Show loading message with progress
                if (update.progress !== undefined) {
                    setLoadingMessage(`Analyzing repository... ${update.progress}%`);
                    if (update.progress > 0 && update.progress < 100) {
                        setIsLoading(true);
                    } else if (update.progress === 100) {
                        setIsLoading(false);
                    }
                }
            } else if (update.type === 'status') {
                if (update.status === 'COMPLETED') {
                    setIsLoading(false);
                    // Refresh graph data
                    vscode.postMessage({ command: 'requestArchitecture' });
                } else if (update.status === 'FAILED') {
                    setIsLoading(false);
                    setErrorMessage(update.error || 'Analysis failed');
                }
            } else if (update.type === 'error') {
                setErrorMessage(update.error || 'Unknown error occurred');
            }
        });

        // Connect WebSocket
        wsClient.connect();
        setWsConnected(true);

        // Cleanup on unmount
        return () => {
            unsubscribe();
            wsClient.disconnect();
            wsClientRef.current = null;
            setWsConnected(false);
        };
    }, [repoId, vscode]);

    // Memoize minimap node color function
    const minimapNodeColor = useCallback((node: Node) => {
        if (node.data?.type === 'directory') return NODE_COLORS.directory;
        if (node.data?.type === 'function') return NODE_COLORS.function;
        if (node.data?.type === 'class') return NODE_COLORS.class;
        if (node.data?.language) return NODE_COLORS[node.data.language] || NODE_COLORS.default;
        return NODE_COLORS.default;
    }, []);

    // Clustering logic (#11) - compute clusters when rawData changes
    useEffect(() => {
        if (!rawData || rawData.nodes.length < 20) {
            setClusters([]);
            setClusteringEnabled(false);
            return;
        }
        const computed = clusterNodesByDirectory(rawData.nodes, 5, 3);
        setClusters(computed);
        setClusteringEnabled(computed.length > 0);
    }, [rawData]);

    // Handle cluster toggle
    const handleClusterToggle = useCallback((clusterId: string) => {
        setClusterState(prev => toggleCluster(clusterId, prev));
    }, []);

    // Keyboard Navigation (#18)
    const getConnectedNodes = useCallback((nodeId: string): string[] => {
        if (!rawData) return [];
        const connected: string[] = [];
        rawData.edges.forEach(edge => {
            if (edge.source === nodeId) connected.push(edge.target);
            if (edge.target === nodeId) connected.push(edge.source);
        });
        return connected;
    }, [rawData]);

    const handleNodeActivate = useCallback((nodeId: string) => {
        if (vscodeRef.current) {
            const rawNode = rawData?.nodes.find(n => n.id === nodeId);
            if (rawNode && rawNode.type !== 'directory') {
                vscodeRef.current.postMessage({
                    command: 'openFile',
                    filePath: rawNode.filePath || rawNode.id,
                    lineNumber: rawNode.lineNumber,
                });
            }
        }
    }, [rawData]);

    useKeyboardNavigation({
        nodes: rawData?.nodes || [],
        onNodeSelect: (nodeId: string) => {
            setSelectedNode(nodeId);
            // Center on selected node
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                reactFlowInstance.setCenter(
                    node.position.x + (NODE_WIDTH / 2),
                    node.position.y + (NODE_HEIGHT / 2),
                    { zoom: 1, duration: 300 }
                );
            }
        },
        onNodeActivate: handleNodeActivate,
        getCurrentNodeId: () => selectedNode,
        getConnectedNodes,
        onFocusSearch: () => setSearchVisible(true),
        onShowHelp: () => setKeyboardHelpVisible(true),
    });

    // Relationship nodes for the visualizer (#21)
    const relationshipNodes = useMemo(() => {
        if (!rawData) return [];
        return rawData.nodes.map(n => ({
            id: n.id,
            type: n.type,
            parentId: n.parentId,
            filePath: n.filePath,
        }));
    }, [rawData]);

    const relationshipEdges = useMemo(() => {
        if (!rawData) return [];
        return rawData.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
        }));
    }, [rawData]);

    // Retry loading / trigger backend analysis
    const handleRetry = useCallback(() => {
        if (vscodeRef.current) {
            setErrorMessage(null);
            setIsLoading(true);
            setLoadingMessage('Retrying...');
            vscodeRef.current.postMessage({ command: 'requestArchitecture' });
        }
    }, []);

    const handleAnalyzeWithBackend = useCallback(() => {
        if (vscodeRef.current) {
            setErrorMessage(null);
            vscodeRef.current.postMessage({ command: 'analyzeRepository' });
        }
    }, []);

    // Calculate available languages from stats
    const availableLanguages = useMemo(() => {
        if (!stats || !stats.filesByLanguage) return [];
        return Object.keys(stats.filesByLanguage).sort();
    }, [stats]);

    // Show error state
    if (errorMessage) {
        return (
            <div className="error-container">
                <div className="error-icon">⚠️</div>
                <h3>Error</h3>
                <p className="error-message">{errorMessage}</p>
                <div className="error-actions">
                    <button className="retry-button" onClick={handleRetry}>
                        Retry Local Analysis
                    </button>
                    <button className="backend-button" onClick={handleAnalyzeWithBackend}>
                        Analyze with Backend
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p>{loadingMessage}</p>
            </div>
        );
    }

    return (
        <div 
            ref={(el) => {
                if (el) {
                    (reactFlowWrapperRef as any).current = el;
                    (graphContainerRef as any).current = el;
                }
            }} 
            style={{ width: '100%', height: '100%', position: 'relative' }}
            className={isFullscreen ? 'fullscreen-graph' : ''}
        >
            <StatsDisplay stats={stats} source={dataSource} />
            {heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (
                <div className="heatmap-legend-floating">
                    <HeatmapLegend
                        mode={heatmapMode}
                        minMetric={heatmapState.minMetric}
                        maxMetric={heatmapState.maxMetric}
                    />
                </div>
            )}

            {/* Search Panel */}
            <SearchPanel
                filters={filters}
                onFiltersChange={setFilters}
                matchCount={matchingNodeIds.size > 0 ? matchingNodeIds.size : (filters.searchTerm || filters.nodeTypes.length > 0 || filters.languages.length > 0 || filters.pathPattern ? 0 : rawData?.nodes.length || 0)}
                totalCount={rawData?.nodes.length || 0}
                onFocusSelection={handleFocusSelection}
                isVisible={searchVisible}
                onClose={() => setSearchVisible(false)}
                availableLanguages={availableLanguages}
            />

            {/* Search Toggle Button */}
            {!searchVisible && (
                <button
                    className="search-toggle-btn"
                    onClick={() => setSearchVisible(true)}
                    title="Search & Filter (Ctrl+F)"
                >
                    🔍
                </button>
            )}

            {/* Layout Panel */}
            <LayoutPanel
                currentLayout={layoutType}
                onLayoutChange={setLayoutType}
                isLayouting={isLayouting}
                isVisible={layoutPanelVisible}
                onClose={() => setLayoutPanelVisible(false)}
            />

            {/* Layout Toggle Button */}
            {!layoutPanelVisible && (
                <button
                    className="layout-toggle-btn"
                    onClick={() => setLayoutPanelVisible(true)}
                    title="Layout Algorithm (Ctrl+L)"
                >
                    📐
                </button>
            )}

            {/* Export Toggle Button */}
            {!exportMenuVisible && (
                <button
                    className="export-toggle-btn"
                    onClick={() => setExportMenuVisible(true)}
                    title="Export Graph (Ctrl+E)"
                >
                    📥
                </button>
            )}

            {/* Fullscreen Toggle Button */}
            <button
                className="fullscreen-toggle-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (F11 or Esc)" : "Enter Fullscreen (F11)"}
            >
                {isFullscreen ? '🗗' : '⛶'}
            </button>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                }}
                style={{ background: 'var(--am-bg)' }}
            >
                <EnhancedMiniMap
                    selectedNodeId={selectedNode}
                    hoveredNodeId={hoveredNode?.id || null}
                    nodeColors={NODE_COLORS}
                    onNodeClick={handleMiniMapNodeClick}
                />
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={16}
                    size={1}
                    color="var(--am-fg)"
                    style={{ opacity: 0.15 }}
                />
            </ReactFlow>

            {/* Zoom & Pan Controls (#20) */}
            <ZoomControls zoomPan={zoomPan} position="bottom-left" />

            {/* Clustering Controls (#11) */}
            {clusteringEnabled && clusters.length > 0 && (
                <div className="cluster-controls">
                    <span className="cluster-label">📦 Clusters ({clusters.length})</span>
                    <button className="cluster-btn" onClick={() => setClusterState(expandAllClusters(clusters))} title="Expand All">
                        ⊞
                    </button>
                    <button className="cluster-btn" onClick={() => setClusterState(collapseAllClusters(clusters))} title="Collapse All">
                        ⊟
                    </button>
                </div>
            )}

            {/* Hover Tooltip */}
            <NodeTooltip node={hoveredNode} position={tooltipPosition} />

            {/* Context Menu */}
            <ContextMenu
                node={contextMenuNode}
                position={contextMenuPosition}
                onAction={handleContextMenuAction}
                onClose={() => setContextMenuNode(null)}
            />

            {/* Impact Analysis Panel (#15) */}
            {impactVisible && (
                <ImpactAnalysisPanel
                    data={impactData}
                    onClose={() => { setImpactVisible(false); setImpactData(null); }}
                    onNodeClick={(nodeId) => {
                        setSelectedNode(nodeId);
                        const node = nodes.find(n => n.id === nodeId);
                        if (node) {
                            reactFlowInstance.setCenter(
                                node.position.x + (NODE_WIDTH / 2),
                                node.position.y + (NODE_HEIGHT / 2),
                                { zoom: 1, duration: 300 }
                            );
                        }
                    }}
                />
            )}

            {/* Relationship Visualizer (#21) */}
            {relationshipVisible && selectedNode && (
                <RelationshipVisualizer
                    selectedNodeId={selectedNode}
                    nodes={relationshipNodes}
                    edges={relationshipEdges}
                    onNodeClick={(nodeId) => {
                        setSelectedNode(nodeId);
                        const node = nodes.find(n => n.id === nodeId);
                        if (node) {
                            reactFlowInstance.setCenter(
                                node.position.x + (NODE_WIDTH / 2),
                                node.position.y + (NODE_HEIGHT / 2),
                                { zoom: 1, duration: 300 }
                            );
                        }
                    }}
                    onClose={() => setRelationshipVisible(false)}
                />
            )}

            {/* Keyboard Help (#18) */}
            {keyboardHelpVisible && (
                <KeyboardHelp onClose={() => setKeyboardHelpVisible(false)} />
            )}

            {/* Export Modal */}
            <ExportModal
                isOpen={exportMenuVisible}
                onClose={() => setExportMenuVisible(false)}
                nodes={nodes}
                edges={edges}
                rawData={rawData}
                reactFlowWrapper={reactFlowWrapperRef.current}
                source={rawData?.source || 'local'}
            />


            <LocalOutline
                fileName={localFileName}
                symbols={localSymbols}
                isVisible={localOutlineVisible}
                onClose={() => setLocalOutlineVisible(false)}
                onSymbolClick={(line) => console.log('Jump to line', line)}
            />
        </div>
    );
};

// Wrapper component with ReactFlowProvider
const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({ heatmapMode }) => {
    return (
        <ReactFlowProvider>
            <ArchitectureGraphInner heatmapMode={heatmapMode} />
        </ReactFlowProvider>
    );
};

export default ArchitectureGraph;
