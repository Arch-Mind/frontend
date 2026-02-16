"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PDF_OPTIONS = void 0;
exports.exportAsPDF = exportAsPDF;
exports.exportDetailedPDF = exportDetailedPDF;
exports.exportCustomPDF = exportCustomPDF;
exports.estimatePDFSize = estimatePDFSize;
const jspdf_1 = __importDefault(require("jspdf")); // Library for generating PDF files
const html2canvas_1 = __importDefault(require("html2canvas")); // Library to capture DOM elements as images
const vscodeApi_1 = require("../vscodeApi");
// Default settings if no options are provided
exports.DEFAULT_PDF_OPTIONS = {
    orientation: 'landscape',
    format: 'a4',
    includeMetadata: true,
    includeTitle: true,
    title: 'Architecture Graph',
    quality: 0.95, // High quality JPEG
};
/**
 * Main function to export the ReactFlow graph as a PDF.
 * Captures the current view, converts it to an image, and places it in a PDF.
 */
async function exportAsPDF(element, // The container element of the graph
nodes, // Array of nodes in the graph
edges, // Array of edges in the graph
filename = 'graph.pdf', // Output filename
options = {} // Optional overrides
) {
    const opts = { ...exports.DEFAULT_PDF_OPTIONS, ...options };
    try {
        // 1. Locate the viewport element containing the graph
        const viewport = element.querySelector('.react-flow__viewport');
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }
        // 2. Capture the viewport as a high-resolution canvas image
        const canvas = await (0, html2canvas_1.default)(viewport, {
            backgroundColor: '#1e1e1e', // Dark background for contrast
            scale: 2, // 2x scale for better resolution
            logging: false, // Disable debug logs
            useCORS: true, // Allow cross-origin images
        });
        // 3. Initialize a new PDF document
        const pdf = new jspdf_1.default({
            orientation: opts.orientation,
            unit: 'mm',
            format: opts.format,
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yOffset = 10; // Vertical position tracker
        // 4. Add Title if requested
        if (opts.includeTitle && opts.title) {
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0);
            pdf.text(opts.title, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 10;
        }
        // 5. Add Metadata (Timestamp, counts) in smaller text
        if (opts.includeMetadata) {
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            const metadata = [
                `Generated: ${new Date().toLocaleString()}`,
                `Nodes: ${nodes.length} | Edges: ${edges.length}`,
            ];
            metadata.forEach(line => {
                pdf.text(line, 10, yOffset);
                yOffset += 5;
            });
            yOffset += 5;
        }
        // 6. Convert canvas to image data
        const imgData = canvas.toDataURL('image/jpeg', opts.quality);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        // 7. Calculate image dimensions to fit page
        let pdfImgWidth = pageWidth - 20; // 10mm margin on each side
        let pdfImgHeight = pdfImgWidth / ratio;
        // Scale down if image height exceeds available page height
        if (pdfImgHeight > pageHeight - yOffset - 10) {
            pdfImgHeight = pageHeight - yOffset - 10;
            pdfImgWidth = pdfImgHeight * ratio;
        }
        // Center the image horizontally
        const xOffset = (pageWidth - pdfImgWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, pdfImgWidth, pdfImgHeight);
        // 8. Add a second page with details if requested
        if (opts.includeMetadata && nodes.length > 0) {
            pdf.addPage();
            addNodeDetailsPage(pdf, nodes, edges);
        }
        // 9. Save file - Handle different environments (VS Code Extension vs Web)
        if (typeof acquireVsCodeApi === 'function') {
            const pdfBlob = pdf.output('blob');
            const reader = new FileReader();
            reader.onloadend = () => {
                const vscode = (0, vscodeApi_1.getVsCodeApi)();
                vscode.postMessage({
                    command: 'saveFile',
                    data: reader.result,
                    filename: filename,
                    mimeType: 'application/pdf'
                });
            };
            reader.onerror = () => { throw new Error('Failed to read PDF blob'); };
            reader.readAsDataURL(pdfBlob);
        }
        else {
            // Fallback for non-VS Code contexts (browser)
            pdf.save(filename);
        }
    }
    catch (error) {
        throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Wrapper to export a detailed PDF which always includes metadata.
 */
async function exportDetailedPDF(element, nodes, edges, filename = 'graph-detailed.pdf', options = {}) {
    const opts = { ...exports.DEFAULT_PDF_OPTIONS, includeMetadata: true, ...options };
    return exportAsPDF(element, nodes, edges, filename, opts);
}
/**
 * Helper: Adds a page listing specific details about the nodes.
 */
function addNodeDetailsPage(pdf, nodes, edges) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 20;
    // Header
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Graph Details', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    // Summary Section
    pdf.setFontSize(12);
    pdf.text('Summary', 10, yPos);
    yPos += 7;
    pdf.setFontSize(10);
    const summary = [
        `Total Nodes: ${nodes.length}`,
        `Total Edges: ${edges.length}`,
        `Node Types: ${getUniqueTypes(nodes).join(', ')}`,
    ];
    summary.forEach(line => {
        pdf.text(line, 15, yPos);
        yPos += 6;
    });
    yPos += 10;
    // Node list Section
    pdf.setFontSize(12);
    pdf.text('Nodes', 10, yPos);
    yPos += 7;
    pdf.setFontSize(9);
    nodes.slice(0, 50).forEach(node => {
        if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = 20;
        }
        const nodeText = `• ${node.data?.label || node.id} (${node.data?.type || 'default'})`;
        pdf.text(nodeText, 15, yPos);
        yPos += 5;
    });
    if (nodes.length > 50) {
        pdf.text(`... and ${nodes.length - 50} more nodes`, 15, yPos);
    }
}
/**
 * Helper: Extracts a unique list of node types from the node array.
 */
function getUniqueTypes(nodes) {
    const types = new Set();
    nodes.forEach(node => {
        types.add(node.data?.type || 'default');
    });
    return Array.from(types);
}
/**
 * Advanced export function allowing for a custom simplified layout.
 * Good for generating reports.
 */
async function exportCustomPDF(element, nodes, edges, config) {
    const pdf = new jspdf_1.default({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;
    // 1. Create Title Page
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    pdf.text(config.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    if (config.subtitle) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(config.subtitle, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
    }
    // 2. Add Graph Image on the first page
    const viewport = element.querySelector('.react-flow__viewport');
    if (viewport) {
        const canvas = await (0, html2canvas_1.default)(viewport, {
            backgroundColor: '#1e1e1e',
            scale: 2,
            logging: false,
        });
        pdf.addPage();
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        // Fixed positioning for report style
        pdf.addImage(imgData, 'JPEG', 10, 10, pageWidth - 20, 180);
    }
    // 3. Add Statistics Page if requested
    if (config.includeStats) {
        pdf.addPage();
        addStatsPage(pdf, nodes, edges);
    }
    // 4. Add Detailed Node List if requested
    if (config.includeNodeList) {
        pdf.addPage();
        addNodeDetailsPage(pdf, nodes, edges);
    }
    // 5. Save the file (VS Code or Browser)
    if (typeof acquireVsCodeApi === 'function') {
        const pdfBlob = pdf.output('blob');
        const reader = new FileReader();
        reader.onloadend = () => {
            const vscode = (0, vscodeApi_1.getVsCodeApi)();
            vscode.postMessage({
                command: 'saveFile',
                data: reader.result,
                filename: config.filename,
                mimeType: 'application/pdf'
            });
        };
        reader.onerror = () => { throw new Error('Failed to read PDF blob'); };
        reader.readAsDataURL(pdfBlob);
    }
    else {
        // Fallback for non-VS Code contexts (browser)
        pdf.save(config.filename);
    }
}
/**
 * Helper: Adds a page with statistical breakdown of the graph.
 */
function addStatsPage(pdf, nodes, edges) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;
    pdf.setFontSize(14);
    pdf.text('Statistics', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    // Section: Node Type Distribution
    pdf.setFontSize(12);
    pdf.text('Node Type Distribution', 10, yPos);
    yPos += 7;
    const typeCount = new Map();
    nodes.forEach(node => {
        const type = node.data?.type || 'default';
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });
    pdf.setFontSize(10);
    Array.from(typeCount.entries()).forEach(([type, count]) => {
        pdf.text(`${type}: ${count} (${((count / nodes.length) * 100).toFixed(1)}%)`, 15, yPos);
        yPos += 6;
    });
    yPos += 10;
    // Section: Connection Stats
    pdf.setFontSize(12);
    pdf.text('Connection Statistics', 10, yPos);
    yPos += 7;
    const avgConnections = edges.length / nodes.length;
    pdf.setFontSize(10);
    pdf.text(`Average connections per node: ${avgConnections.toFixed(2)}`, 15, yPos);
}
/**
 * Utility: Rough estimation of the resulting PDF size based on graph complexity.
 * Used for progress bars or warnings.
 */
function estimatePDFSize(nodes, edges) {
    // Rough estimate: base size + node data
    const baseSize = 50000; // ~50KB base PDF
    const nodeSize = nodes.length * 100;
    const edgeSize = edges.length * 50;
    return baseSize + nodeSize + edgeSize;
}
//# sourceMappingURL=pdfExporter.js.map