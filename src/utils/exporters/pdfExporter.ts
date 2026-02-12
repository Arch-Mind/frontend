import jsPDF from 'jspdf';
import { getVsCodeApi } from '../../webview/vscode-api';
import html2canvas from 'html2canvas';
import { Node, Edge } from 'reactflow';
import { isVSCodeWebview, saveFileInVSCode } from './vscodeExportHelper';

export interface PDFExportOptions {
    orientation: 'portrait' | 'landscape';
    format: 'a4' | 'letter' | 'a3';
    includeMetadata: boolean;
    includeTitle: boolean;
    title?: string;
    quality: number;
}

export const DEFAULT_PDF_OPTIONS: PDFExportOptions = {
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
export async function exportAsPDF(
    element: HTMLElement,
    nodes: Node[],
    edges: Edge[],
    filename: string = 'graph.pdf',
    options: Partial<PDFExportOptions> = {}
): Promise<void> {
    const opts = { ...DEFAULT_PDF_OPTIONS, ...options };

    try {
        const viewport = element.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport) {
            throw new Error('ReactFlow viewport not found');
        }

        // Create canvas from viewport
        const canvas = await html2canvas(viewport, {
            backgroundColor: '#1e1e1e',
            scale: 2,
            logging: false,
            useCORS: true,
        });

        // Initialize PDF
        const pdf = new jsPDF({
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
        if (typeof window !== 'undefined') {
            const pdfBlob = pdf.output('blob');
            const reader = new FileReader();
            reader.onloadend = () => {
                const vscode = getVsCodeApi();
                if (vscode) {
                    vscode.postMessage({
                        command: 'saveFile',
                        data: reader.result as string,
                        filename: filename,
                        mimeType: 'application/pdf'
                    });
                } else {
                    pdf.save(filename);
                }
            };
            reader.onerror = () => { throw new Error('Failed to read PDF blob'); };
            reader.readAsDataURL(pdfBlob);
        } else {
            // Fallback for non-VS Code contexts (browser)
            pdf.save(filename);
        }
    } catch (error) {
        throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Export as multi-page PDF with detailed node information
 */
export async function exportDetailedPDF(
    element: HTMLElement,
    nodes: Node[],
    edges: Edge[],
    filename: string = 'graph-detailed.pdf',
    options: Partial<PDFExportOptions> = {}
): Promise<void> {
    const opts = { ...DEFAULT_PDF_OPTIONS, includeMetadata: true, ...options };
    return exportAsPDF(element, nodes, edges, filename, opts);
}

/**
 * Add node details page to PDF
 */
function addNodeDetailsPage(pdf: jsPDF, nodes: Node[], edges: Edge[]): void {
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
    nodes.slice(0, 50).forEach(node => { // Limit to first 50 nodes
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
function getUniqueTypes(nodes: Node[]): string[] {
    const types = new Set<string>();
    nodes.forEach(node => {
        types.add(node.data?.type || 'default');
    });
    return Array.from(types);
}

/**
 * Export as PDF with custom layout
 */
export async function exportCustomPDF(
    element: HTMLElement,
    nodes: Node[],
    edges: Edge[],
    config: {
        filename: string;
        title: string;
        subtitle?: string;
        includeStats: boolean;
        includeNodeList: boolean;
        pageBreaks?: number; // Split into multiple images every N nodes
    }
): Promise<void> {
    const pdf = new jsPDF({
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
    const viewport = element.querySelector('.react-flow__viewport') as HTMLElement;
    if (viewport) {
        const canvas = await html2canvas(viewport, {
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
    const vscode = getVsCodeApi();
    if (vscode) {
        const pdfBlob = pdf.output('blob');
        const reader = new FileReader();
        reader.onloadend = () => {
            vscode.postMessage({
                command: 'saveFile',
                data: reader.result as string,
                filename: config.filename,
                mimeType: 'application/pdf'
            });
        };
        reader.onerror = () => { throw new Error('Failed to read PDF blob'); };
        reader.readAsDataURL(pdfBlob);
    } else {
        // Fallback for non-VS Code contexts (browser)
        pdf.save(config.filename);
    }
}

/**
 * Add statistics page
 */
function addStatsPage(pdf: jsPDF, nodes: Node[], edges: Edge[]): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;

    pdf.setFontSize(14);
    pdf.text('Statistics', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Type distribution
    pdf.setFontSize(12);
    pdf.text('Node Type Distribution', 10, yPos);
    yPos += 7;

    const typeCount = new Map<string, number>();
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
export function estimatePDFSize(nodes: Node[], edges: Edge[]): number {
    // Rough estimate: base size + node data
    const baseSize = 50000; // ~50KB base PDF
    const nodeSize = nodes.length * 100;
    const edgeSize = edges.length * 50;
    return baseSize + nodeSize + edgeSize;
}
