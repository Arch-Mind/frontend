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
const jspdf_1 = __importDefault(require("jspdf"));
const html2canvas_1 = __importDefault(require("html2canvas"));
exports.DEFAULT_PDF_OPTIONS = {
    orientation: 'landscape',
    format: 'a4',
    includeMetadata: true,
    includeTitle: true,
    title: 'Architecture Graph',
    quality: 0.95,
};
/**
 * Export graph as PDF
 */
async function exportAsPDF(element, nodes, edges, filename = 'graph.pdf', options = {}) {
    const opts = { ...exports.DEFAULT_PDF_OPTIONS, ...options };
    try {
        const viewport = element.querySelector('.react-flow__viewport');
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }
        // Create canvas from viewport
        const canvas = await (0, html2canvas_1.default)(viewport, {
            backgroundColor: '#1e1e1e',
            scale: 2,
            logging: false,
            useCORS: true,
        });
        // Initialize PDF
        const pdf = new jspdf_1.default({
            orientation: opts.orientation,
            unit: 'mm',
            format: opts.format,
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yOffset = 10;
        // Add title
        if (opts.includeTitle && opts.title) {
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0);
            pdf.text(opts.title, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 10;
        }
        // Add metadata
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
        // Add graph image
        const imgData = canvas.toDataURL('image/jpeg', opts.quality);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        // Calculate dimensions to fit page
        let pdfImgWidth = pageWidth - 20; // 10mm margin on each side
        let pdfImgHeight = pdfImgWidth / ratio;
        // If image is too tall, scale to fit height
        if (pdfImgHeight > pageHeight - yOffset - 10) {
            pdfImgHeight = pageHeight - yOffset - 10;
            pdfImgWidth = pdfImgHeight * ratio;
        }
        // Center the image
        const xOffset = (pageWidth - pdfImgWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, pdfImgWidth, pdfImgHeight);
        // Add second page with details if needed
        if (opts.includeMetadata && nodes.length > 0) {
            pdf.addPage();
            addNodeDetailsPage(pdf, nodes, edges);
        }
        // Save PDF
        // Check if we're in VS Code webview context
        if (typeof acquireVsCodeApi === 'function') {
            const pdfBlob = pdf.output('blob');
            const reader = new FileReader();
            reader.onloadend = () => {
                const vscode = acquireVsCodeApi();
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
 * Export as multi-page PDF with detailed node information
 */
async function exportDetailedPDF(element, nodes, edges, filename = 'graph-detailed.pdf', options = {}) {
    const opts = { ...exports.DEFAULT_PDF_OPTIONS, includeMetadata: true, ...options };
    return exportAsPDF(element, nodes, edges, filename, opts);
}
/**
 * Add node details page to PDF
 */
function addNodeDetailsPage(pdf, nodes, edges) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 20;
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Graph Details', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    // Summary
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
    // Node list
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
 * Get unique node types
 */
function getUniqueTypes(nodes) {
    const types = new Set();
    nodes.forEach(node => {
        types.add(node.data?.type || 'default');
    });
    return Array.from(types);
}
/**
 * Export as PDF with custom layout
 */
async function exportCustomPDF(element, nodes, edges, config) {
    const pdf = new jspdf_1.default({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;
    // Title page
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
    // Export graph
    const viewport = element.querySelector('.react-flow__viewport');
    if (viewport) {
        const canvas = await (0, html2canvas_1.default)(viewport, {
            backgroundColor: '#1e1e1e',
            scale: 2,
            logging: false,
        });
        pdf.addPage();
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 10, 10, pageWidth - 20, 180);
    }
    // Add statistics
    if (config.includeStats) {
        pdf.addPage();
        addStatsPage(pdf, nodes, edges);
    }
    // Add node list
    if (config.includeNodeList) {
        pdf.addPage();
        addNodeDetailsPage(pdf, nodes, edges);
    }
    // Save PDF
    // Check if we're in VS Code webview context
    if (typeof acquireVsCodeApi === 'function') {
        const pdfBlob = pdf.output('blob');
        const reader = new FileReader();
        reader.onloadend = () => {
            const vscode = acquireVsCodeApi();
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
 * Add statistics page
 */
function addStatsPage(pdf, nodes, edges) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;
    pdf.setFontSize(14);
    pdf.text('Statistics', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    // Type distribution
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
    // Connection statistics
    pdf.setFontSize(12);
    pdf.text('Connection Statistics', 10, yPos);
    yPos += 7;
    const avgConnections = edges.length / nodes.length;
    pdf.setFontSize(10);
    pdf.text(`Average connections per node: ${avgConnections.toFixed(2)}`, 15, yPos);
}
/**
 * Estimate PDF file size
 */
function estimatePDFSize(nodes, edges) {
    // Rough estimate: base size + node data
    const baseSize = 50000; // ~50KB base PDF
    const nodeSize = nodes.length * 100;
    const edgeSize = edges.length * 50;
    return baseSize + nodeSize + edgeSize;
}
//# sourceMappingURL=pdfExporter.js.map