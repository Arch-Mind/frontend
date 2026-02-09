"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MARKDOWN_OPTIONS = void 0;
exports.exportAsMarkdown = exportAsMarkdown;
exports.generateMermaidDiagram = generateMermaidDiagram;
exports.exportAsREADME = exportAsREADME;
exports.getMarkdownSize = getMarkdownSize;
exports.DEFAULT_MARKDOWN_OPTIONS = {
    format: 'mermaid',
    includeMetadata: true,
    includeStats: true,
    includeNodeList: false,
    includeEdgeList: false,
    mermaidDirection: 'TB',
};
/**
 * Export as Markdown
 */
function exportAsMarkdown(nodes, edges, filename = 'graph.md', options = {}) {
    const opts = { ...exports.DEFAULT_MARKDOWN_OPTIONS, ...options };
    let markdown = '';
    // Add header
    markdown += '# Architecture Graph\n\n';
    // Add metadata
    if (opts.includeMetadata) {
        markdown += generateMetadata(nodes, edges);
    }
    // Add statistics
    if (opts.includeStats) {
        markdown += generateStatistics(nodes, edges);
    }
    // Add diagram based on format
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
    // Add node list
    if (opts.includeNodeList) {
        markdown += generateNodeList(nodes);
    }
    // Add edge list
    if (opts.includeEdgeList) {
        markdown += generateEdgeList(edges, nodes);
    }
    // Download
    downloadMarkdown(markdown, filename);
}
/**
 * Generate Mermaid diagram
 */
function generateMermaidDiagram(nodes, edges, direction = 'TB') {
    let mermaid = '\n## Graph Diagram\n\n```mermaid\n';
    mermaid += `graph ${direction}\n`;
    // Add nodes with shapes based on type
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
    // Add edges
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
 * Generate metadata section
 */
function generateMetadata(nodes, edges) {
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
 * Generate statistics section
 */
function generateStatistics(nodes, edges) {
    let md = '## Statistics\n\n';
    // Node type distribution
    const typeCount = new Map();
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
    // Connection statistics
    const avgConnections = nodes.length > 0 ? (edges.length / nodes.length).toFixed(2) : '0';
    md += '### Connection Statistics\n\n';
    md += `- **Average connections per node**: ${avgConnections}\n`;
    md += `- **Total connections**: ${edges.length}\n`;
    // Find most connected nodes
    const connectionCount = new Map();
    edges.forEach(edge => {
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
function generateGitHubMarkdown(nodes, edges) {
    let md = '## Graph Structure\n\n';
    md += '### Nodes\n\n';
    // Group nodes by type
    const nodesByType = new Map();
    nodes.forEach(node => {
        const type = node.data?.type || 'default';
        if (!nodesByType.has(type)) {
            nodesByType.set(type, []);
        }
        nodesByType.get(type).push(node);
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
function generateStandardMarkdown(nodes, edges) {
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
 * Generate node list
 */
function generateNodeList(nodes) {
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
 * Generate edge list
 */
function generateEdgeList(edges, nodes) {
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
 * Download markdown file
 */
function downloadMarkdown(content, filename) {
    // Check if we're in VS Code webview context
    if (typeof acquireVsCodeApi === 'function') {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            command: 'saveFile',
            data: content,
            filename: filename,
            mimeType: 'text/markdown;charset=utf-8'
        });
    }
    else {
        // Fallback for non-VS Code contexts (browser)
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
 * Sanitize ID for Mermaid
 */
function sanitizeMermaidId(id) {
    const sanitized = id.replace(/[^a-zA-Z0-9_]/g, '_');
    return sanitized.match(/^[0-9]/) ? `node_${sanitized}` : sanitized;
}
/**
 * Escape markdown special characters
 */
function escapeMarkdown(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\|/g, '\\|');
}
/**
 * Export as README template
 */
function exportAsREADME(nodes, edges, projectName = 'Project', filename = 'ARCHITECTURE.md') {
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
function getMarkdownSize(nodes, edges) {
    const markdown = generateMermaidDiagram(nodes, edges);
    return new Blob([markdown]).size;
}
//# sourceMappingURL=markdownExporter.js.map