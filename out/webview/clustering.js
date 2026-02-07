"use strict";
/**
 * Node Clustering Algorithm for Large Graphs (Issue #11)
 * Groups nodes by directory/module to reduce visual complexity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterNodesByDirectory = clusterNodesByDirectory;
exports.filterByClusterState = filterByClusterState;
exports.loadClusterState = loadClusterState;
exports.saveClusterState = saveClusterState;
exports.toggleCluster = toggleCluster;
exports.expandAllClusters = expandAllClusters;
exports.collapseAllClusters = collapseAllClusters;
/**
 * Extract directory path from node
 */
function getDirectoryPath(node) {
    if (node.type === 'directory') {
        return node.id;
    }
    // For files, get parent directory
    if (node.filePath) {
        const parts = node.filePath.replace(/\\/g, '/').split('/');
        parts.pop(); // Remove filename
        return parts.join('/') || '/';
    }
    // For functions/classes, extract from ID (format: "file.ts::functionName")
    if (node.id.includes('::')) {
        const filePath = node.id.split('::')[0];
        const parts = filePath.replace(/\\/g, '/').split('/');
        parts.pop();
        return parts.join('/') || '/';
    }
    // Fallback: use ID path
    const parts = node.id.replace(/\\/g, '/').split('/');
    parts.pop();
    return parts.join('/') || '/';
}
/**
 * Calculate metrics for a cluster
 */
function calculateMetrics(nodes) {
    return {
        nodeCount: nodes.length,
        fileCount: nodes.filter(n => n.type === 'file').length,
        functionCount: nodes.filter(n => n.type === 'function').length,
        classCount: nodes.filter(n => n.type === 'class').length,
    };
}
/**
 * Get cluster depth based on path nesting
 */
function getClusterDepth(path) {
    if (path === '/' || path === '')
        return 0;
    return path.split('/').filter(p => p.length > 0).length;
}
/**
 * Group nodes into clusters by directory path
 * @param nodes - All nodes in the graph
 * @param minClusterSize - Minimum nodes required to form a cluster (default: 5)
 * @param maxDepth - Maximum directory depth to cluster (default: 3)
 */
function clusterNodesByDirectory(nodes, minClusterSize = 5, maxDepth = 3) {
    // Group nodes by directory path
    const pathGroups = new Map();
    nodes.forEach(node => {
        const dirPath = getDirectoryPath(node);
        // Only cluster up to maxDepth
        const depth = getClusterDepth(dirPath);
        if (depth > maxDepth) {
            return; // Skip deep nested paths
        }
        const existing = pathGroups.get(dirPath) || [];
        existing.push(node);
        pathGroups.set(dirPath, existing);
    });
    // Create clusters from groups that meet minimum size
    const clusters = [];
    pathGroups.forEach((groupNodes, path) => {
        if (groupNodes.length >= minClusterSize) {
            const pathParts = path.split('/').filter(p => p.length > 0);
            const label = pathParts[pathParts.length - 1] || 'root';
            clusters.push({
                id: `cluster-${path}`,
                label: label,
                path: path,
                nodes: groupNodes,
                metrics: calculateMetrics(groupNodes),
                depth: getClusterDepth(path),
            });
        }
    });
    // Sort by depth (shallower first) and path
    clusters.sort((a, b) => {
        if (a.depth !== b.depth)
            return a.depth - b.depth;
        return a.path.localeCompare(b.path);
    });
    return clusters;
}
/**
 * Filter nodes and edges based on cluster state
 * Returns only visible nodes/edges based on which clusters are expanded
 */
function filterByClusterState(nodes, edges, clusters, clusterState) {
    const visibleNodeIds = new Set();
    const collapsedClusters = [];
    const clusterMap = new Map();
    // Build cluster map for quick lookup
    clusters.forEach(cluster => {
        clusterMap.set(cluster.id, cluster);
    });
    // Identify visible nodes
    nodes.forEach(node => {
        const dirPath = getDirectoryPath(node);
        const clusterId = `cluster-${dirPath}`;
        const cluster = clusterMap.get(clusterId);
        if (cluster) {
            // Node belongs to a cluster
            if (clusterState[clusterId] === true) {
                // Cluster is expanded, show node
                visibleNodeIds.add(node.id);
            }
            else if (clusterState[clusterId] === false) {
                // Cluster is collapsed, hide node
                // Add cluster to collapsed list if not already there
                if (!collapsedClusters.find(c => c.id === clusterId)) {
                    collapsedClusters.push(cluster);
                }
            }
            else {
                // No state set (undefined), default to expanded
                visibleNodeIds.add(node.id);
            }
        }
        else {
            // Node doesn't belong to any cluster, always show
            visibleNodeIds.add(node.id);
        }
    });
    // Filter nodes
    const visibleNodes = nodes.filter(n => visibleNodeIds.has(n.id));
    // Filter edges - only show edges where both source and target are visible
    const visibleEdges = edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    return {
        nodes: visibleNodes,
        edges: visibleEdges,
        clusterNodes: collapsedClusters,
    };
}
/**
 * Create cluster state from localStorage or defaults
 */
function loadClusterState(repoId) {
    const key = `archmind-cluster-state-${repoId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            return JSON.parse(stored);
        }
        catch (e) {
            console.error('Failed to parse cluster state:', e);
        }
    }
    return {};
}
/**
 * Save cluster state to localStorage
 */
function saveClusterState(repoId, state) {
    const key = `archmind-cluster-state-${repoId}`;
    localStorage.setItem(key, JSON.stringify(state));
}
/**
 * Toggle cluster expanded/collapsed state
 */
function toggleCluster(clusterId, currentState) {
    const current = currentState[clusterId];
    return {
        ...currentState,
        [clusterId]: current === false ? true : false, // Toggle between expanded and collapsed
    };
}
/**
 * Expand all clusters
 */
function expandAllClusters(clusters) {
    const state = {};
    clusters.forEach(cluster => {
        state[cluster.id] = true;
    });
    return state;
}
/**
 * Collapse all clusters
 */
function collapseAllClusters(clusters) {
    const state = {};
    clusters.forEach(cluster => {
        state[cluster.id] = false;
    });
    return state;
}
//# sourceMappingURL=clustering.js.map