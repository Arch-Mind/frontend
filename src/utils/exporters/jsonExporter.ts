import { Node, Edge } from 'reactflow';

export interface ExportData {
    version: string;
    exportDate: string;
    metadata: {
        totalNodes: number;
        totalEdges: number;
        source: 'local' | 'backend';
    };
    nodes: ExportNode[];
    edges: ExportEdge[];
    rawData?: any;
}

export interface ExportNode {
    id: string;
    label: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, any>;
    style?: Record<string, any>;
}

export interface ExportEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
}

/**
 * Export graph data as JSON
 */
export function exportAsJSON(
    nodes: Node[],
    edges: Edge[],
    rawData?: any,
    source: 'local' | 'backend' = 'local'
): string {
    const exportData: ExportData = {
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
 */
export function downloadJSON(
    nodes: Node[],
    edges: Edge[],
    filename: string = 'graph-export.json',
    rawData?: any,
    source: 'local' | 'backend' = 'local'
): void {
    const jsonString = exportAsJSON(nodes, edges, rawData, source);
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

/**
 * Parse imported JSON data
 */
export function parseImportedJSON(jsonString: string): ExportData {
    try {
        const data = JSON.parse(jsonString);

        // Validate structure
        if (!data.version || !data.nodes || !data.edges) {
            throw new Error('Invalid export file format');
        }

        return data as ExportData;
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Convert imported data back to ReactFlow format
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
 * Get JSON file size estimate
 */
export function getJSONSize(nodes: Node[], edges: Edge[], rawData?: any): number {
    const jsonString = exportAsJSON(nodes, edges, rawData);
    return new Blob([jsonString]).size;
}

/**
 * Format JSON size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
