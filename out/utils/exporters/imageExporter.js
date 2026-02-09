"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_IMAGE_OPTIONS = void 0;
exports.exportAsPNG = exportAsPNG;
exports.exportAsJPEG = exportAsJPEG;
exports.exportAsWebP = exportAsWebP;
exports.exportAsSVG = exportAsSVG;
exports.copyToClipboard = copyToClipboard;
exports.estimateImageSize = estimateImageSize;
const html2canvas_1 = __importDefault(require("html2canvas"));
const vscodeExportHelper_1 = require("./vscodeExportHelper");
exports.DEFAULT_IMAGE_OPTIONS = {
    format: 'png',
    quality: 0.95,
    scale: 2,
    backgroundColor: '#1e1e1e',
    includeBackground: true,
};
/**
 * Export graph as PNG using html2canvas
 */
async function exportAsPNG(element, filename = 'graph.png', options = {}) {
    const opts = { ...exports.DEFAULT_IMAGE_OPTIONS, ...options };
    try {
        const viewport = element.querySelector('.react-flow__viewport');
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }
        const canvas = await (0, html2canvas_1.default)(viewport, {
            backgroundColor: opts.includeBackground ? opts.backgroundColor : null,
            scale: opts.scale,
            logging: false,
            useCORS: true,
            allowTaint: true,
        });
        await downloadCanvas(canvas, filename, opts);
    }
    catch (error) {
        throw new Error(`PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Export graph as JPEG
 */
async function exportAsJPEG(element, filename = 'graph.jpg', options = {}) {
    const opts = { ...exports.DEFAULT_IMAGE_OPTIONS, format: 'jpeg', ...options };
    return exportAsPNG(element, filename, opts);
}
/**
 * Export graph as WebP
 */
async function exportAsWebP(element, filename = 'graph.webp', options = {}) {
    const opts = { ...exports.DEFAULT_IMAGE_OPTIONS, format: 'webp', ...options };
    return exportAsPNG(element, filename, opts);
}
/**
 * Export as SVG
 */
function exportAsSVG(nodes, edges, filename = 'graph.svg', options = {}) {
    const { padding = 50 } = options;
    // Calculate bounds
    const bounds = calculateBounds(nodes);
    const width = options.width || (bounds.maxX - bounds.minX + padding * 2);
    const height = options.height || (bounds.maxY - bounds.minY + padding * 2);
    // Create SVG
    let svg = createSVGDocument(width, height);
    // Add transform group
    svg += `  <g transform="translate(${padding - bounds.minX}, ${padding - bounds.minY})">\n`;
    // Add edges
    svg += addEdgesToSVG(edges, nodes);
    // Add nodes
    svg += addNodesToSVG(nodes);
    svg += '  </g>\n</svg>';
    // Download
    downloadString(svg, filename, 'image/svg+xml');
}
/**
 * Capture screenshot and copy to clipboard
 */
async function copyToClipboard(element) {
    try {
        const viewport = element.querySelector('.react-flow__viewport');
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }
        const canvas = await (0, html2canvas_1.default)(viewport, {
            backgroundColor: '#1e1e1e',
            scale: 2,
            logging: false,
        });
        // Convert to blob
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob)
                    resolve(blob);
                else
                    reject(new Error('Failed to create blob'));
            });
        });
        // Copy to clipboard
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
    }
    catch (error) {
        throw new Error(`Copy to clipboard failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Helper functions
function downloadCanvas(canvas, filename, options) {
    return new Promise((resolve, reject) => {
        const mimeType = `image/${options.format}`;
        canvas.toBlob(async (blob) => {
            if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
            }
            try {
                // Check if we're in VS Code webview context
                if ((0, vscodeExportHelper_1.isVSCodeWebview)()) {
                    // Convert blob to data URL for VS Code
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            await (0, vscodeExportHelper_1.saveFileInVSCode)(reader.result, filename, mimeType);
                            resolve();
                        }
                        catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = () => reject(new Error('Failed to read blob'));
                    reader.readAsDataURL(blob);
                }
                else {
                    // Fallback for non-VS Code contexts (browser)
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    resolve();
                }
            }
            catch (error) {
                reject(error);
            }
        }, mimeType, options.quality);
    });
}
function calculateBounds(nodes) {
    if (nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach(node => {
        const width = 180;
        const height = 40;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + width);
        maxY = Math.max(maxY, node.position.y + height);
    });
    return { minX, minY, maxX, maxY };
}
function createSVGDocument(width, height) {
    return `<?xml version="1.0" encoding="UTF-8"?>
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
`;
}
function addEdgesToSVG(edges, nodes) {
    let svg = '';
    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
            const x1 = sourceNode.position.x + 90;
            const y1 = sourceNode.position.y + 20;
            const x2 = targetNode.position.x + 90;
            const y2 = targetNode.position.y + 20;
            svg += `    <line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrowhead)" />\n`;
        }
    });
    return svg;
}
function addNodesToSVG(nodes) {
    let svg = '';
    nodes.forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const width = 180;
        const height = 40;
        const label = escapeXML(node.data?.label || node.id);
        svg += `    <rect class="node" x="${x}" y="${y}" width="${width}" height="${height}" rx="4" />\n`;
        svg += `    <text class="node-text" x="${x + width / 2}" y="${y + height / 2 + 4}">${label}</text>\n`;
    });
    return svg;
}
function escapeXML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function downloadString(content, filename, mimeType) {
    // Check if we're in VS Code webview context
    if (typeof acquireVsCodeApi === 'function') {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            command: 'saveFile',
            data: content,
            filename: filename,
            mimeType: mimeType
        });
    }
    else {
        // Fallback for non-VS Code contexts (browser)
        const blob = new Blob([content], { type: mimeType });
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
 * Get estimated image size
 */
function estimateImageSize(nodes, scale = 2) {
    const bounds = calculateBounds(nodes);
    const width = (bounds.maxX - bounds.minX) * scale;
    const height = (bounds.maxY - bounds.minY) * scale;
    const estimatedBytes = Math.round(width * height * 4 * 0.5); // Rough estimate
    return { width, height, estimatedBytes };
}
//# sourceMappingURL=imageExporter.js.map