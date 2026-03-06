"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconstructHierarchy = reconstructHierarchy;
const heatmapUtils_1 = require("./heatmapUtils");
// Reconstruct hierarchy from file paths (for backend data that might be flat)
function reconstructHierarchy(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const createdDirs = new Set();
    const getOrCreateDirectory = (pathStr) => {
        if (!pathStr || pathStr === '.' || pathStr === '/')
            return '';
        const normalized = (0, heatmapUtils_1.normalizePath)(pathStr);
        // If directory node already exists, return it
        if (nodeMap.has(normalized))
            return normalized;
        if (createdDirs.has(normalized))
            return normalized;
        const parts = normalized.split('/');
        const label = parts[parts.length - 1];
        // Ensure parent exists first
        let parentId;
        if (parts.length > 1) {
            const parentPath = parts.slice(0, -1).join('/');
            parentId = getOrCreateDirectory(parentPath);
        }
        const dirNode = {
            id: normalized,
            label: label,
            type: 'directory',
            depth: parts.length - 1, // 0-indexed depth
            filePath: normalized,
            status: 'unchanged' // Default status
        };
        if (parentId) {
            dirNode.parentId = parentId;
            newEdges.push({
                id: `e-${parentId}-${normalized}`,
                source: parentId,
                target: normalized,
                type: 'contains'
            });
        }
        newNodes.push(dirNode);
        nodeMap.set(normalized, dirNode);
        createdDirs.add(normalized);
        return normalized;
    };
    // Iterate over file nodes to ensure their parent directories exist
    nodes.forEach(node => {
        if (node.type === 'file') {
            const pathStr = node.filePath || node.id;
            const normalizedPath = (0, heatmapUtils_1.normalizePath)(pathStr);
            const parts = normalizedPath.split('/');
            // Fix depth if missing
            if (node.depth === undefined || node.depth === 0) {
                node.depth = parts.length;
            }
            if (!node.filePath) {
                node.filePath = normalizedPath;
            }
            if (parts.length > 1) {
                const parentPath = parts.slice(0, -1).join('/');
                const parentId = getOrCreateDirectory(parentPath);
                if (parentId && !node.parentId) {
                    node.parentId = parentId;
                    // Check if edge already exists
                    const edgeExists = newEdges.some(e => e.source === parentId && e.target === node.id);
                    if (!edgeExists) {
                        newEdges.push({
                            id: `e-${parentId}-${node.id}`,
                            source: parentId,
                            target: node.id,
                            type: 'contains' // or 'part_of', consistent with local parser
                        });
                    }
                }
            }
        }
    });
    return { nodes: newNodes, edges: newEdges };
}
//# sourceMappingURL=hierarchyUtils.js.map