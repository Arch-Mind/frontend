import { Node, Edge } from 'reactflow'; // ReactFlow types
import { isVSCodeWebview, saveFileInVSCode } from './vscodeExportHelper'; // VS Code helper

// Structure of the exported JSON file
export interface ExportData {
    version: string;             // File format version
    exportDate: string;          // ISO timestamp of export
    metadata: {                  // Summary info
        totalNodes: number;
        totalEdges: number;
        source: 'local' | 'backend'; // Where the data originated
    };
    nodes: ExportNode[];         // List of graph nodes
    edges: ExportEdge[];         // List of graph connections
    rawData?: any;               // Original raw data (optional backup)
}

// Simplified node structure for export
export interface ExportNode {
    id: string;
    label: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, any>;
    style?: Record<string, any>;
}

// Simplified edge structure for export
export interface ExportEdge {
    id: string;
    source: string; // ID of start node
    target: string; // ID of end node
    type?: string;
    label?: string;
}

/**
 * Creates the JSON string representation of the graph.
 * Maps ReactFlow objects to a stable export format.
 */
export function exportAsJSON(
    nodes: Node[],            // Current nodes
    edges: Edge[],            // Current edges
    rawData?: any,            // Optional original data
    source: 'local' | 'backend' = 'local' // Origin
): string {
    const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        metadata: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            source,
        },
        // Map nodes to export format
        nodes: nodes.map(node => ({
            id: node.id,
            label: node.data?.label || node.id,
            type: node.data?.type || 'default',
            position: node.position,
            data: node.data,
            style: node.style,
        })),
        // Map edges to export format
        edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: typeof edge.label === 'string' ? edge.label : undefined,
        })),
        rawData,
    };

    return JSON.stringify(exportData, null, 2); // Pretty print
}

/**
 * Triggers the download of the JSON file.
 * Handles both VS Code extension environment (via postMessage) and standard browser download.
 */
export function downloadJSON(
    nodes: Node[],
    edges: Edge[],
    filename: string = 'graph-export.json',
    rawData?: any,
    source: 'local' | 'backend' = 'local'
): void {
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
    } else {
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
 * Validates and parses a JSON string into the ExportData structure.
 * Throws errors for invalid formats.
 */
export function parseImportedJSON(jsonString: string): ExportData {
    try {
        const data = JSON.parse(jsonString);

        // Simple validation of required fields
        if (!data.version || !data.nodes || !data.edges) {
            throw new Error('Invalid export file format');
        }

        return data as ExportData;
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Converts the exported JSON data back into ReactFlow-compatible Nodes and Edges.
 * Used when importing a file.
 */
export function convertToReactFlowFormat(exportData: ExportData): {
    nodes: Node[];
    edges: Edge[];
} {
    const nodes: Node[] = exportData.nodes.map(node => ({
        id: node.id,
        position: node.position,
        data: node.data,
        type: node.type === 'default' ? undefined : node.type,
        style: node.style,
    }));

    const edges: Edge[] = exportData.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
    }));

    return { nodes, edges };
}

/**
 * Wraps the size calculation to be reusable.
 */
export function getJSONSize(nodes: Node[], edges: Edge[], rawData?: any): number {
    const jsonString = exportAsJSON(nodes, edges, rawData);
    return new Blob([jsonString]).size;
}

/**
 * Utility to format bytes into human-readable strings (KB, MB).
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
