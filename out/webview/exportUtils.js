"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAsPNG = exportAsPNG;
exports.exportAsSVG = exportAsSVG;
exports.exportAsJSON = exportAsJSON;
exports.exportAsMermaid = exportAsMermaid;
exports.exportAsDOT = exportAsDOT;
const html2canvas_1 = __importDefault(require("html2canvas"));
const file_saver_1 = require("file-saver");
// Export graph as PNG using html2canvas
async function exportAsPNG(reactFlowWrapper, filename = 'architecture-graph.png') {
    try {
        // Find the ReactFlow viewport element
        const viewport = reactFlowWrapper.querySelector('.react-flow__viewport');
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }
        // Capture the canvas
        const canvas = await (0, html2canvas_1.default)(viewport, {
            backgroundColor: '#1e1e1e',
            logging: false,
            scale: 2, // Higher quality
        });
        // Convert to blob and save
        canvas.toBlob((blob) => {
            if (blob) {
                (0, file_saver_1.saveAs)(blob, filename);
            }
        });
    }
    catch (error) {
        console.error('Error exporting PNG:', error);
        throw error;
    }
}
// Export graph as SVG
function exportAsSVG(nodes, edges, filename = 'architecture-graph.svg') {
    try {
        // Calculate bounds
        const bounds = calculateBounds(nodes);
        const padding = 50;
        const width = bounds.maxX - bounds.minX + padding * 2;
        const height = bounds.maxY - bounds.minY + padding * 2;
        // Create SVG content
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .node { fill: #2d2d2d; stroke: #4a9eff; stroke-width: 2; }
      .node-text { fill: #ffffff; font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
      .edge { stroke: #888888; stroke-width: 1; fill: none; }
      .edge-arrow { fill: #888888; }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon class="edge-arrow" points="0 0, 10 3, 0 6" />
    </marker>
  </defs>
  <g transform="translate(${padding - bounds.minX}, ${padding - bounds.minY})">
`;
        // Add edges
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (sourceNode && targetNode) {
                const x1 = sourceNode.position.x + 90; // Center of node (width/2)
                const y1 = sourceNode.position.y + 20; // Center of node (height/2)
                const x2 = targetNode.position.x + 90;
                const y2 = targetNode.position.y + 20;
                svg += `    <line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrowhead)" />\n`;
            }
        });
        // Add nodes
        nodes.forEach(node => {
            const x = node.position.x;
            const y = node.position.y;
            const width = 180;
            const height = 40;
            svg += `    <rect class="node" x="${x}" y="${y}" width="${width}" height="${height}" rx="4" />\n`;
            svg += `    <text class="node-text" x="${x + width / 2}" y="${y + height / 2 + 4}">${escapeXml(node.data.label || node.id)}</text>\n`;
        });
        svg += `  </g>
</svg>`;
        // Save file
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        (0, file_saver_1.saveAs)(blob, filename);
    }
    catch (error) {
        console.error('Error exporting SVG:', error);
        throw error;
    }
}
// Export graph as JSON for reimport
function exportAsJSON(nodes, edges, rawData, filename = 'architecture-graph.json') {
    try {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            nodes: nodes.map(n => ({
                id: n.id,
                data: n.data,
                position: n.position,
                style: n.style,
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type,
            })),
            rawData: rawData,
        };
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        (0, file_saver_1.saveAs)(blob, filename);
    }
    catch (error) {
        console.error('Error exporting JSON:', error);
        throw error;
    }
}
// Export graph as Mermaid diagram
function exportAsMermaid(nodes, edges, filename = 'architecture-graph.md') {
    try {
        let mermaid = '```mermaid\ngraph TB\n';
        // Add nodes with labels
        nodes.forEach(node => {
            const id = sanitizeMermaidId(node.id);
            const label = escapeMarkdown(node.data.label || node.id);
            const type = node.data.type;
            // Choose node shape based on type
            let nodeDefinition = '';
            switch (type) {
                case 'directory':
                    nodeDefinition = `${id}[${label}]`; // Rectangle
                    break;
                case 'function':
                    nodeDefinition = `${id}([${label}])`; // Stadium
                    break;
                case 'class':
                    nodeDefinition = `${id}[${label}]`; // Rectangle with double border would be ideal, but we'll use rectangle
                    break;
                default:
                    nodeDefinition = `${id}(${label})`; // Rounded rectangle
            }
            mermaid += `  ${nodeDefinition}\n`;
        });
        mermaid += '\n';
        // Add edges
        edges.forEach(edge => {
            const sourceId = sanitizeMermaidId(edge.source);
            const targetId = sanitizeMermaidId(edge.target);
            mermaid += `  ${sourceId} --> ${targetId}\n`;
        });
        mermaid += '```\n';
        // Add metadata
        const metadata = `# Architecture Graph Export\n\nExported: ${new Date().toISOString()}\n\nTotal Nodes: ${nodes.length}\nTotal Edges: ${edges.length}\n\n`;
        const content = metadata + mermaid;
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        (0, file_saver_1.saveAs)(blob, filename);
    }
    catch (error) {
        console.error('Error exporting Mermaid:', error);
        throw error;
    }
}
// Export graph as DOT format (Graphviz)
function exportAsDOT(nodes, edges, filename = 'architecture-graph.dot') {
    try {
        let dot = 'digraph ArchitectureGraph {\n';
        dot += '  // Graph settings\n';
        dot += '  rankdir=TB;\n';
        dot += '  node [shape=box, style=filled, fillcolor="#2d2d2d", fontcolor=white, fontname="Arial"];\n';
        dot += '  edge [color="#888888"];\n\n';
        // Add nodes
        dot += '  // Nodes\n';
        nodes.forEach(node => {
            const id = sanitizeDotId(node.id);
            const label = escapeDot(node.data.label || node.id);
            const type = node.data.type;
            // Customize appearance based on type
            let attributes = [];
            switch (type) {
                case 'directory':
                    attributes.push('shape=folder');
                    attributes.push('fillcolor="#4a9eff"');
                    break;
                case 'function':
                    attributes.push('shape=ellipse');
                    attributes.push('fillcolor="#27ae60"');
                    break;
                case 'class':
                    attributes.push('shape=component');
                    attributes.push('fillcolor="#9b59b6"');
                    break;
                default:
                    attributes.push('fillcolor="#6b7280"');
            }
            const attrsStr = attributes.length > 0 ? `, ${attributes.join(', ')}` : '';
            dot += `  ${id} [label="${label}"${attrsStr}];\n`;
        });
        dot += '\n  // Edges\n';
        // Add edges
        edges.forEach(edge => {
            const sourceId = sanitizeDotId(edge.source);
            const targetId = sanitizeDotId(edge.target);
            dot += `  ${sourceId} -> ${targetId};\n`;
        });
        dot += '}\n';
        const blob = new Blob([dot], { type: 'text/vnd.graphviz;charset=utf-8' });
        (0, file_saver_1.saveAs)(blob, filename);
    }
    catch (error) {
        console.error('Error exporting DOT:', error);
        throw error;
    }
}
// Helper function to calculate bounds of nodes
function calculateBounds(nodes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const width = 180; // Node width
        const height = 40; // Node height
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    });
    return { minX, minY, maxX, maxY };
}
// Helper function to escape XML special characters
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
// Helper function to sanitize Mermaid IDs (remove special characters)
function sanitizeMermaidId(id) {
    // Replace special characters with underscores and ensure it starts with a letter
    const sanitized = id.replace(/[^a-zA-Z0-9_]/g, '_');
    return sanitized.match(/^[0-9]/) ? `node_${sanitized}` : sanitized;
}
// Helper function to escape markdown special characters
function escapeMarkdown(text) {
    return text.replace(/[[\]()]/g, '');
}
// Helper function to sanitize DOT IDs
function sanitizeDotId(id) {
    // DOT identifiers can contain alphanumerics and underscores, must quote if special chars
    const sanitized = id.replace(/[^a-zA-Z0-9_]/g, '_');
    return `"${sanitized}"`;
}
// Helper function to escape DOT label text
function escapeDot(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
}
//# sourceMappingURL=exportUtils.js.map