import html2canvas from 'html2canvas'; // Library to capture DOM elements as images
import { Node, Edge } from 'reactflow'; // ReactFlow types
import { isVSCodeWebview, saveFileInVSCode } from './vscodeExportHelper'; // Helper for VS Code

// Options for tailoring the image output
export interface ImageExportOptions {
    format: 'png' | 'jpeg' | 'webp'; // Image file format
    quality: number; // Validation 0.0 to 1.0 (for JPEG/WebP)
    scale: number; // Resolution multiplier (1x, 2x, etc.)
    backgroundColor?: string; // Optional custom background
    includeBackground: boolean; // Whether to include background or keep transparent
}

// Default settings if no options are provided
export const DEFAULT_IMAGE_OPTIONS: ImageExportOptions = {
    format: 'png',
    quality: 0.95,
    scale: 2, // High resolution by default
    backgroundColor: '#1e1e1e', // Dark theme background
    includeBackground: true,
};

/**
 * Main function to export graph as PNG using html2canvas.
 * This is the base function used by other raster formats (JPEG, WebP).
 */
export async function exportAsPNG(
    element: HTMLElement,     // The container element
    filename: string = 'graph.png', // Output filename
    options: Partial<ImageExportOptions> = {} // Optional overrides
): Promise<void> {
    const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };

    try {
        // 1. Locate view to capture
        const viewport = element.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }

        // 2. Capture canvas
        const canvas = await html2canvas(viewport, {
            backgroundColor: opts.includeBackground ? opts.backgroundColor : null,
            scale: opts.scale,
            logging: false, // Disable debug logs
            useCORS: true,  // Allow cross-origin images
            allowTaint: true,
        });

        // 3. Trigger Download
        await downloadCanvas(canvas, filename, opts);
    } catch (error) {
        throw new Error(`PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Export graph as JPEG
 */
export async function exportAsJPEG(
    element: HTMLElement,
    filename: string = 'graph.jpg',
    options: Partial<ImageExportOptions> = {}
): Promise<void> {
    const opts = { ...DEFAULT_IMAGE_OPTIONS, format: 'jpeg' as const, ...options };
    return exportAsPNG(element, filename, opts);
}

/**
 * Export graph as WebP
 */
export async function exportAsWebP(
    element: HTMLElement,
    filename: string = 'graph.webp',
    options: Partial<ImageExportOptions> = {}
): Promise<void> {
    const opts = { ...DEFAULT_IMAGE_OPTIONS, format: 'webp' as const, ...options };
    return exportAsPNG(element, filename, opts);
}

/**
 * Export as vector SVG.
 * Manually constructs an SVG string from the node/edge data.
 * Note: limits styling fidelity compared to html2canvas.
 */
export function exportAsSVG(
    nodes: Node[],
    edges: Edge[],
    filename: string = 'graph.svg',
    options: {
        width?: number;
        height?: number;
        padding?: number;
    } = {}
): void {
    const { padding = 50 } = options;

    // 1. Calculate boundaries to fit all nodes
    const bounds = calculateBounds(nodes);
    const width = options.width || (bounds.maxX - bounds.minX + padding * 2);
    const height = options.height || (bounds.maxY - bounds.minY + padding * 2);

    // 2. Create SVG Container
    let svg = createSVGDocument(width, height);

    // 3. Add Content Group (centered/padded)
    svg += `  <g transform="translate(${padding - bounds.minX}, ${padding - bounds.minY})">\n`;

    // 4. Add Edges (lines)
    svg += addEdgesToSVG(edges, nodes);

    // 5. Add Nodes (rects + text)
    svg += addNodesToSVG(nodes);

    svg += '  </g>\n</svg>';

    // 6. Download File
    downloadString(svg, filename, 'image/svg+xml');
}

/**
 * Capture screenshot and immediately copy to clipboard.
 * Useful for quick sharing.
 */
export async function copyToClipboard(element: HTMLElement): Promise<void> {
    try {
        const viewport = element.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }

        // Capture
        const canvas = await html2canvas(viewport, {
            backgroundColor: '#1e1e1e',
            scale: 2,
            logging: false,
        });

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create blob'));
            });
        });

        // Write to Clipboard API
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
    } catch (error) {
        throw new Error(`Copy to clipboard failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper functions

/**
 * Helper: Converts canvas to blob and saves it using the appropriate method (VS Code vs Browser).
 */
function downloadCanvas(
    canvas: HTMLCanvasElement,
    filename: string,
    options: ImageExportOptions
): Promise<void> {
    return new Promise((resolve, reject) => {
        const mimeType = `image/${options.format}`;

        canvas.toBlob(
            async (blob) => {
                if (!blob) {
                    reject(new Error('Failed to create blob'));
                    return;
                }

                try {
                    // Check if we're in VS Code webview context
                    if (isVSCodeWebview()) {
                        // Convert blob to data URL for VS Code
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            try {
                                await saveFileInVSCode(reader.result as string, filename, mimeType);
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        };
                        reader.onerror = () => reject(new Error('Failed to read blob'));
                        reader.readAsDataURL(blob);
                    } else {
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
                } catch (error) {
                    reject(error);
                }
            },
            mimeType,
            options.quality
        );
    });
}

/**
 * Helper: Determines the total bounding box of all nodes.
 */
function calculateBounds(nodes: Node[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
} {
    if (nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
        // Assume default node dimensions if not set
        const width = 180;
        const height = 40;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + width);
        maxY = Math.max(maxY, node.position.y + height);
    });

    return { minX, minY, maxX, maxY };
}

function createSVGDocument(width: number, height: number): string {
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

function addEdgesToSVG(edges: Edge[], nodes: Node[]): string {
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

function addNodesToSVG(nodes: Node[]): string {
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

function escapeXML(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Helper: Downloads string content as a file (mainly for SVG).
 */
function downloadString(content: string, filename: string, mimeType: string): void {
    // Check if we're in VS Code webview context
    if (typeof acquireVsCodeApi === 'function') {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            command: 'saveFile',
            data: content,
            filename: filename,
            mimeType: mimeType
        });
    } else {
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
 * Get estimated image size in bytes.
 * Used for file size warnings.
 */
export function estimateImageSize(
    nodes: Node[],
    scale: number = 2
): { width: number; height: number; estimatedBytes: number } {
    const bounds = calculateBounds(nodes);
    const width = (bounds.maxX - bounds.minX) * scale;
    const height = (bounds.maxY - bounds.minY) * scale;
    // RGBA = 4 bytes per pixel, 0.5 compression factor rough estimate
    const estimatedBytes = Math.round(width * height * 4 * 0.5);

    return { width, height, estimatedBytes };
}
