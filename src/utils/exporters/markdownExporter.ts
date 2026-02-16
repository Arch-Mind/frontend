import { Node, Edge } from 'reactflow';
import { getVsCodeApi } from '../vscodeApi';

declare const acquireVsCodeApi: any;
// Types from ReactFlow
import { isVSCodeWebview, saveFileInVSCode } from './vscodeExportHelper'; // Helper for VS Code environments

// Options for tailoring the Markdown output
export interface MarkdownExportOptions {
    format: 'standard' | 'github' | 'mermaid'; // Style of the diagram/content
    includeMetadata: boolean; // Whether to include timestamp and counts
    includeStats: boolean; // Whether to include thorough statistics
    includeNodeList: boolean; // Detailed table of nodes
    includeEdgeList: boolean; // Detailed table of edges
    mermaidDirection: 'TB' | 'LR' | 'RL' | 'BT'; // Direction for Mermaid diagrams
}

// Default settings if no options are provided
export const DEFAULT_MARKDOWN_OPTIONS: MarkdownExportOptions = {
    format: 'mermaid',
    includeMetadata: true,
    includeStats: true,
    includeNodeList: false,
    includeEdgeList: false,
    mermaidDirection: 'TB',
};

/**
 * Main function to export variables graph as a Markdown file.
 * It builds a string based on selected options and triggers a download.
 */
export function exportAsMarkdown(
    nodes: Node[],            // Array of nodes
    edges: Edge[],            // Array of edges
    filename: string = 'graph.md', // Output filename
    options: Partial<MarkdownExportOptions> = {} // Optional overrides
): void {
    const opts = { ...DEFAULT_MARKDOWN_OPTIONS, ...options };

    let markdown = '';

    // 1. Add Header
    markdown += '# Architecture Graph\n\n';

    // 2. Add Metadata (if requested)
    if (opts.includeMetadata) {
        markdown += generateMetadata(nodes, edges);
    }

    // 3. Add Statistics (if requested)
    if (opts.includeStats) {
        markdown += generateStatistics(nodes, edges);
    }

    // 4. Add Diagram Section based on format
    switch (opts.format) {
        case 'mermaid':
            markdown += generateMermaidDiagram(nodes, edges, opts.mermaidDirection);
            break;
        case 'github':
            markdown += generateGitHubMarkdown(nodes, edges);
            break;
        case 'standard':
            markdown += generateStandardMarkdown(nodes, edges);
            break;
    }

    // 5. Add Detailed Node List (if requested)
    if (opts.includeNodeList) {
        markdown += generateNodeList(nodes);
    }

    // 6. Add Detailed Edge List (if requested)
    if (opts.includeEdgeList) {
        markdown += generateEdgeList(edges, nodes);
    }

    // 7. Trigger Download
    downloadMarkdown(markdown, filename);
}

/**
 * Generates technical text representation of the graph using Mermaid syntax.
 * This renders as a diagram in compatible viewers (GitHub, Notion, etc.).
 */
export function generateMermaidDiagram(
    nodes: Node[],
    edges: Edge[],
    direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB'
): string {
    let mermaid = '\n## Graph Diagram\n\n```mermaid\n';
    mermaid += `graph ${direction}\n`;

    // 1. Define Nodes with specific styles per type
    nodes.forEach(node => {
        const id = sanitizeMermaidId(node.id);
        const label = escapeMarkdown(node.data?.label || node.id);
        const type = node.data?.type || 'default';

        let nodeDefinition = '';
        switch (type) {
            case 'directory':
            case 'folder':
                nodeDefinition = `${id}[${label}]`; // Rectangle
                break;
            case 'function':
                nodeDefinition = `${id}([${label}])`; // Stadium
                break;
            case 'class':
                nodeDefinition = `${id}[${label}]`; // Rectangle
                break;
            case 'file':
                nodeDefinition = `${id}(${label})`; // Rounded rectangle
                break;
            default:
                nodeDefinition = `${id}{{${label}}}`; // Hexagon
        }

        mermaid += `  ${nodeDefinition}\n`;
    });

    mermaid += '\n';

    // 2. Define Edges (Connections)
    edges.forEach(edge => {
        const sourceId = sanitizeMermaidId(edge.source);
        const targetId = sanitizeMermaidId(edge.target);
        const label = edge.label ? `|${escapeMarkdown(String(edge.label))}|` : '';
        mermaid += `  ${sourceId} -->${label} ${targetId}\n`;
    });

    mermaid += '```\n\n';

    return mermaid;
}

/**
 * Creates a metadata section with timestamp and summary counts.
 */
function generateMetadata(nodes: Node[], edges: Edge[]): string {
    const now = new Date();
    let md = '## Metadata\n\n';
    md += `- **Generated**: ${now.toLocaleString()}\n`;
    md += `- **Total Nodes**: ${nodes.length}\n`;
    md += `- **Total Edges**: ${edges.length}\n`;
    md += `- **Export Format**: Markdown\n`;
    md += '\n';
    return md;
}

/**
 * Calculates and formats statistics about the graph structure.
 */
function generateStatistics(nodes: Node[], edges: Edge[]): string {
    let md = '## Statistics\n\n';

    // 1. Node type distribution table
    const typeCount = new Map<string, number>();
    nodes.forEach(node => {
        const type = node.data?.type || 'default';
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    md += '### Node Type Distribution\n\n';
    md += '| Type | Count | Percentage |\n';
    md += '|------|-------|------------|\n';

    Array.from(typeCount.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            const percentage = ((count / nodes.length) * 100).toFixed(1);
            md += `| ${type} | ${count} | ${percentage}% |\n`;
        });

    md += '\n';

    // 2. Connection statistics
    const avgConnections = nodes.length > 0 ? (edges.length / nodes.length).toFixed(2) : '0';
    md += '### Connection Statistics\n\n';
    md += `- **Average connections per node**: ${avgConnections}\n`;
    md += `- **Total connections**: ${edges.length}\n`;

    // 3. Find most connected nodes (Hubs)
    const connectionCount = new Map<string, number>();
    edges.forEach(edge => {
        // Count for both source and target to see total degree
        connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
        connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
    });

    const topConnected = Array.from(connectionCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topConnected.length > 0) {
        md += '\n### Most Connected Nodes\n\n';
        topConnected.forEach(([nodeId, count]) => {
            const node = nodes.find(n => n.id === nodeId);
            const label = node?.data?.label || nodeId;
            md += `- **${label}**: ${count} connections\n`;
        });
    }

    md += '\n';
    return md;
}

/**
 * Generate GitHub-flavored markdown
 */
function generateGitHubMarkdown(nodes: Node[], edges: Edge[]): string {
    let md = '## Graph Structure\n\n';
    md += '### Nodes\n\n';

    // Group nodes by type
    const nodesByType = new Map<string, Node[]>();
    nodes.forEach(node => {
        const type = node.data?.type || 'default';
        if (!nodesByType.has(type)) {
            nodesByType.set(type, []);
        }
        nodesByType.get(type)!.push(node);
    });

    nodesByType.forEach((typeNodes, type) => {
        md += `#### ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`;
        typeNodes.forEach(node => {
            const label = node.data?.label || node.id;
            md += `- ${label}\n`;
        });
        md += '\n';
    });

    md += '### Connections\n\n';
    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const sourceLabel = sourceNode?.data?.label || edge.source;
        const targetLabel = targetNode?.data?.label || edge.target;
        md += `- ${sourceLabel} → ${targetLabel}\n`;
    });

    md += '\n';
    return md;
}

/**
 * Generate standard markdown
 */
function generateStandardMarkdown(nodes: Node[], edges: Edge[]): string {
    let md = '## Graph Overview\n\n';
    md += `This graph contains ${nodes.length} nodes and ${edges.length} edges.\n\n`;
    md += '### Visual Representation\n\n';
    md += '```\n';

    // Simple ASCII art representation
    nodes.slice(0, 20).forEach(node => {
        const label = node.data?.label || node.id;
        md += `[${label}]\n`;

        // Show outgoing edges
        const outgoingEdges = edges.filter(e => e.source === node.id);
        outgoingEdges.forEach(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            const targetLabel = targetNode?.data?.label || edge.target;
            md += `  └─> ${targetLabel}\n`;
        });
    });

    if (nodes.length > 20) {
        md += `\n... and ${nodes.length - 20} more nodes\n`;
    }

    md += '```\n\n';
    return md;
}

/**
 * Generates a simple node list table.
 */
function generateNodeList(nodes: Node[]): string {
    let md = '## Node Details\n\n';
    md += '| ID | Label | Type | Position |\n';
    md += '|----|-------|------|----------|\n';

    nodes.forEach(node => {
        const id = escapeMarkdown(node.id);
        const label = escapeMarkdown(node.data?.label || node.id);
        const type = node.data?.type || 'default';
        const pos = `(${Math.round(node.position.x)}, ${Math.round(node.position.y)})`;
        md += `| ${id} | ${label} | ${type} | ${pos} |\n`;
    });

    md += '\n';
    return md;
}

/**
 * Generates a simple edge list table.
 */
function generateEdgeList(edges: Edge[], nodes: Node[]): string {
    let md = '## Edge Details\n\n';
    md += '| Source | Target | Type |\n';
    md += '|--------|--------|------|\n';

    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const source = escapeMarkdown(sourceNode?.data?.label || edge.source);
        const target = escapeMarkdown(targetNode?.data?.label || edge.target);
        const type = edge.type || 'default';
        md += `| ${source} | ${target} | ${type} |\n`;
    });

    md += '\n';
    return md;
}

/**
 * Handles the actual download process.
 * Detects if running in a VS Code extension context or a standard browser.
 */
function downloadMarkdown(content: string, filename: string): void {
    // Check if we're in VS Code webview context
    if (typeof acquireVsCodeApi === 'function') {
        const vscode = getVsCodeApi();
        vscode.postMessage({
            command: 'saveFile',
            data: content,
            filename: filename,
            mimeType: 'text/markdown;charset=utf-8'
        });
    } else {
        // Fallback for standard browser context
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
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
 * Helper: Sanitizes IDs to be compatible with Mermaid syntax (no special chars).
 */
function sanitizeMermaidId(id: string): string {
    const sanitized = id.replace(/[^a-zA-Z0-9_]/g, '_');
    // Mermaid IDs cannot start with numbers
    return sanitized.match(/^[0-9]/) ? `node_${sanitized}` : sanitized;
}

/**
 * Helper: Escapes characters that would break Markdown formatting.
 */
function escapeMarkdown(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\|/g, '\\|');
}

/**
 * Special exporter meant for project READMEs.
 * Creates a "ARCHITECTURE.md" style document.
 */
export function exportAsREADME(
    nodes: Node[],
    edges: Edge[],
    projectName: string = 'Project',
    filename: string = 'ARCHITECTURE.md'
): void {
    let md = `# ${projectName} - Architecture\n\n`;
    md += '## Overview\n\n';
    md += `This document describes the architecture of ${projectName}.\n\n`;
    md += generateMetadata(nodes, edges);
    md += generateStatistics(nodes, edges);
    md += generateMermaidDiagram(nodes, edges, 'TB');

    downloadMarkdown(md, filename);
}

/**
 * Get markdown size estimate
 */
export function getMarkdownSize(nodes: Node[], edges: Edge[]): number {
    const markdown = generateMermaidDiagram(nodes, edges);
    return new Blob([markdown]).size;
}
