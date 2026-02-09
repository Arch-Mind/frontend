"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAsJSON = exportAsJSON;
exports.downloadJSON = downloadJSON;
exports.parseImportedJSON = parseImportedJSON;
exports.convertToReactFlowFormat = convertToReactFlowFormat;
exports.getJSONSize = getJSONSize;
exports.formatFileSize = formatFileSize;
/**
 * Export graph data as JSON
 */
function exportAsJSON(nodes, edges, rawData, source = 'local') {
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        metadata: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            source,
        },
        nodes: nodes.map(node => ({
            id: node.id,
            label: node.data?.label || node.id,
            type: node.data?.type || 'default',
            position: node.position,
            data: node.data,
            style: node.style,
        })),
        edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: typeof edge.label === 'string' ? edge.label : undefined,
        })),
        rawData,
    };
    return JSON.stringify(exportData, null, 2);
}
/**
 * Download JSON data as a file
 * In VS Code webview context, this sends a message to the extension to save the file
 */
function downloadJSON(nodes, edges, filename = 'graph-export.json', rawData, source = 'local') {
    const jsonString = exportAsJSON(nodes, edges, rawData, source);
    // Check if we're in VS Code webview context
    if (typeof acquireVsCodeApi === 'function') {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            command: 'saveFile',
            data: jsonString,
            filename: filename,
            mimeType: 'application/json'
        });
    }
    else {
        // Fallback for non-VS Code contexts (browser)
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
/**
 * Parse imported JSON data
 */
function parseImportedJSON(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        // Validate structure
        if (!data.version || !data.nodes || !data.edges) {
            throw new Error('Invalid export file format');
        }
        return data;
    }
    catch (error) {
        throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Convert imported data back to ReactFlow format
 */
function convertToReactFlowFormat(exportData) {
    const nodes = exportData.nodes.map(node => ({
        id: node.id,
        position: node.position,
        data: node.data,
        type: node.type === 'default' ? undefined : node.type,
        style: node.style,
    }));
    const edges = exportData.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
    }));
    return { nodes, edges };
}
/**
 * Get JSON file size estimate
 */
function getJSONSize(nodes, edges, rawData) {
    const jsonString = exportAsJSON(nodes, edges, rawData);
    return new Blob([jsonString]).size;
}
/**
 * Format JSON size for display
 */
function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
//# sourceMappingURL=jsonExporter.js.map