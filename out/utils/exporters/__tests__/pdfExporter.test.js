"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfExporter_1 = require("../pdfExporter");
// Mock jsPDF
const mockAddPage = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetTextColor = jest.fn();
const mockText = jest.fn();
const mockAddImage = jest.fn();
const mockSave = jest.fn();
const mockGetWidth = jest.fn(() => 297);
const mockGetHeight = jest.fn(() => 210);
jest.mock('jspdf', () => {
    return jest.fn().mockImplementation(() => ({
        addPage: mockAddPage,
        setFontSize: mockSetFontSize,
        setTextColor: mockSetTextColor,
        text: mockText,
        addImage: mockAddImage,
        save: mockSave,
        internal: {
            pageSize: {
                getWidth: mockGetWidth,
                getHeight: mockGetHeight,
            },
        },
    }));
});
// Mock html2canvas
jest.mock('html2canvas', () => {
    return jest.fn(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.toDataURL = jest.fn(() => 'data:image/jpeg;base64,mockdata');
        return Promise.resolve(canvas);
    });
});
describe('pdfExporter', () => {
    const mockNodes = [
        {
            id: 'node1',
            position: { x: 100, y: 200 },
            data: { label: 'AuthService', type: 'class' },
        },
        {
            id: 'node2',
            position: { x: 300, y: 400 },
            data: { label: 'login', type: 'function' },
        },
        {
            id: 'node3',
            position: { x: 500, y: 600 },
            data: { label: 'database', type: 'directory' },
        },
    ];
    const mockEdges = [
        {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            label: 'calls',
        },
        {
            id: 'edge2',
            source: 'node2',
            target: 'node3',
            label: 'connects to',
        },
    ];
    let mockElement;
    let mockViewport;
    beforeEach(() => {
        // Setup mock viewport
        mockViewport = document.createElement('div');
        mockViewport.className = 'react-flow__viewport';
        mockElement = document.createElement('div');
        mockElement.appendChild(mockViewport);
        // Clear all mock calls
        jest.clearAllMocks();
    });
    describe('exportAsPDF', () => {
        it('should export graph as PDF', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf');
            expect(mockSave).toHaveBeenCalledWith('test.pdf');
        });
        it('should use default filename when not provided', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges);
            expect(mockSave).toHaveBeenCalledWith('graph.pdf');
        });
        it('should handle missing viewport error', async () => {
            const emptyElement = document.createElement('div');
            await expect((0, pdfExporter_1.exportAsPDF)(emptyElement, mockNodes, mockEdges)).rejects.toThrow('ReactFlow viewport not found');
        });
        it('should add title when includeTitle is true', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                includeTitle: true,
                title: 'My Architecture',
            });
            expect(mockSetFontSize).toHaveBeenCalledWith(16);
            expect(mockText).toHaveBeenCalledWith('My Architecture', expect.any(Number), expect.any(Number), {
                align: 'center',
            });
        });
        it('should add metadata when includeMetadata is true', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                includeMetadata: true,
            });
            expect(mockText).toHaveBeenCalledWith(expect.stringContaining('Nodes: 3 | Edges: 2'), expect.any(Number), expect.any(Number));
        });
        it('should add graph image to PDF', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges);
            expect(mockAddImage).toHaveBeenCalledWith('data:image/jpeg;base64,mockdata', 'JPEG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
        });
        it('should add second page with details when includeMetadata is true', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                includeMetadata: true,
            });
            expect(mockAddPage).toHaveBeenCalled();
        });
        it('should support portrait orientation', async () => {
            const jsPDF = require('jspdf');
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                orientation: 'portrait',
            });
            expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({
                orientation: 'portrait',
            }));
        });
        it('should support landscape orientation', async () => {
            const jsPDF = require('jspdf');
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                orientation: 'landscape',
            });
            expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({
                orientation: 'landscape',
            }));
        });
        it('should support different page formats', async () => {
            const jsPDF = require('jspdf');
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                format: 'a3',
            });
            expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({
                format: 'a3',
            }));
        });
        it('should use custom quality option', async () => {
            const html2canvas = require('html2canvas');
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                quality: 0.7,
            });
            const canvas = await html2canvas();
            expect(canvas.toDataURL).toHaveBeenCalled();
        });
        it('should not add title when includeTitle is false', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                includeTitle: false,
            });
            const titleCalls = mockText.mock.calls.filter(call => call[0] === pdfExporter_1.DEFAULT_PDF_OPTIONS.title);
            expect(titleCalls).toHaveLength(0);
        });
    });
    describe('exportDetailedPDF', () => {
        it('should export detailed PDF', async () => {
            await (0, pdfExporter_1.exportDetailedPDF)(mockElement, mockNodes, mockEdges, 'detailed.pdf');
            expect(mockSave).toHaveBeenCalledWith('detailed.pdf');
        });
        it('should use default filename when not provided', async () => {
            await (0, pdfExporter_1.exportDetailedPDF)(mockElement, mockNodes, mockEdges);
            expect(mockSave).toHaveBeenCalledWith('graph-detailed.pdf');
        });
        it('should force includeMetadata to true', async () => {
            await (0, pdfExporter_1.exportDetailedPDF)(mockElement, mockNodes, mockEdges, 'test.pdf');
            expect(mockAddPage).toHaveBeenCalled();
        });
        it('should support custom options', async () => {
            const jsPDF = require('jspdf');
            await (0, pdfExporter_1.exportDetailedPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                orientation: 'portrait',
                format: 'letter',
            });
            expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({
                orientation: 'portrait',
                format: 'letter',
            }));
        });
    });
    describe('exportCustomPDF', () => {
        const config = {
            filename: 'custom.pdf',
            title: 'Custom Title',
            subtitle: 'Custom Subtitle',
            includeStats: true,
            includeNodeList: true,
        };
        it('should export custom PDF', async () => {
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, config);
            expect(mockSave).toHaveBeenCalledWith('custom.pdf');
        });
        it('should add custom title', async () => {
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, config);
            expect(mockSetFontSize).toHaveBeenCalledWith(20);
            expect(mockText).toHaveBeenCalledWith('Custom Title', expect.any(Number), expect.any(Number), {
                align: 'center',
            });
        });
        it('should add subtitle when provided', async () => {
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, config);
            expect(mockSetFontSize).toHaveBeenCalledWith(12);
            expect(mockText).toHaveBeenCalledWith('Custom Subtitle', expect.any(Number), expect.any(Number), {
                align: 'center',
            });
        });
        it('should add statistics page when includeStats is true', async () => {
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, config);
            expect(mockAddPage).toHaveBeenCalled();
            expect(mockText).toHaveBeenCalledWith('Statistics', expect.any(Number), expect.any(Number), {
                align: 'center',
            });
        });
        it('should add node list when includeNodeList is true', async () => {
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, config);
            expect(mockText).toHaveBeenCalledWith('Graph Details', expect.any(Number), expect.any(Number), {
                align: 'center',
            });
        });
        it('should not add subtitle when not provided', async () => {
            const configWithoutSubtitle = { ...config, subtitle: undefined };
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, configWithoutSubtitle);
            const subtitleCalls = mockText.mock.calls.filter(call => call[0] === 'Custom Subtitle');
            expect(subtitleCalls).toHaveLength(0);
        });
        it('should skip stats page when includeStats is false', async () => {
            const configNoStats = { ...config, includeStats: false };
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, configNoStats);
            const statsCalls = mockText.mock.calls.filter(call => call[0] === 'Statistics');
            expect(statsCalls).toHaveLength(0);
        });
        it('should skip node list when includeNodeList is false', async () => {
            const configNoList = { ...config, includeNodeList: false };
            await (0, pdfExporter_1.exportCustomPDF)(mockElement, mockNodes, mockEdges, configNoList);
            const detailsCalls = mockText.mock.calls.filter(call => call[0] === 'Graph Details');
            expect(detailsCalls).toHaveLength(0);
        });
    });
    describe('estimatePDFSize', () => {
        it('should estimate PDF file size', () => {
            const size = (0, pdfExporter_1.estimatePDFSize)(mockNodes, mockEdges);
            expect(size).toBeGreaterThan(0);
            expect(typeof size).toBe('number');
        });
        it('should return larger size for more nodes', () => {
            const singleNode = [mockNodes[0]];
            const singleEdge = [mockEdges[0]];
            const singleSize = (0, pdfExporter_1.estimatePDFSize)(singleNode, singleEdge);
            const multiSize = (0, pdfExporter_1.estimatePDFSize)(mockNodes, mockEdges);
            expect(multiSize).toBeGreaterThan(singleSize);
        });
        it('should include base size', () => {
            const size = (0, pdfExporter_1.estimatePDFSize)([], []);
            expect(size).toBeGreaterThan(0);
            expect(size).toBeGreaterThanOrEqual(50000);
        });
        it('should account for edges', () => {
            const noEdges = (0, pdfExporter_1.estimatePDFSize)(mockNodes, []);
            const withEdges = (0, pdfExporter_1.estimatePDFSize)(mockNodes, mockEdges);
            expect(withEdges).toBeGreaterThan(noEdges);
        });
        it('should handle large graphs', () => {
            const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
                id: `node${i}`,
                position: { x: 0, y: 0 },
                data: { label: `Node ${i}` },
            }));
            const size = (0, pdfExporter_1.estimatePDFSize)(manyNodes, []);
            expect(size).toBeGreaterThan(100000);
        });
    });
    describe('DEFAULT_PDF_OPTIONS', () => {
        it('should have correct default values', () => {
            expect(pdfExporter_1.DEFAULT_PDF_OPTIONS.orientation).toBe('landscape');
            expect(pdfExporter_1.DEFAULT_PDF_OPTIONS.format).toBe('a4');
            expect(pdfExporter_1.DEFAULT_PDF_OPTIONS.includeMetadata).toBe(true);
            expect(pdfExporter_1.DEFAULT_PDF_OPTIONS.includeTitle).toBe(true);
            expect(pdfExporter_1.DEFAULT_PDF_OPTIONS.title).toBe('Architecture Graph');
            expect(pdfExporter_1.DEFAULT_PDF_OPTIONS.quality).toBe(0.95);
        });
    });
    describe('node details page', () => {
        it('should include node type summary', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, mockNodes, mockEdges, 'test.pdf', {
                includeMetadata: true,
            });
            expect(mockText).toHaveBeenCalledWith('Summary', expect.any(Number), expect.any(Number));
        });
        it('should list first 50 nodes', async () => {
            const manyNodes = Array.from({ length: 100 }, (_, i) => ({
                id: `node${i}`,
                position: { x: 0, y: 0 },
                data: { label: `Node ${i}`, type: 'class' },
            }));
            await (0, pdfExporter_1.exportAsPDF)(mockElement, manyNodes, [], 'test.pdf', {
                includeMetadata: true,
            });
            const nodeCalls = mockText.mock.calls.filter(call => typeof call[0] === 'string' && call[0].startsWith('• Node'));
            // Should list nodes in details page
            expect(nodeCalls.length).toBeGreaterThan(0);
        });
        it('should indicate more nodes when exceeding 50', async () => {
            const manyNodes = Array.from({ length: 100 }, (_, i) => ({
                id: `node${i}`,
                position: { x: 0, y: 0 },
                data: { label: `Node ${i}` },
            }));
            await (0, pdfExporter_1.exportAsPDF)(mockElement, manyNodes, [], 'test.pdf', {
                includeMetadata: true,
            });
            expect(mockText).toHaveBeenCalledWith('... and 50 more nodes', expect.any(Number), expect.any(Number));
        });
    });
    describe('edge cases', () => {
        it('should handle empty nodes and edges', async () => {
            await (0, pdfExporter_1.exportAsPDF)(mockElement, [], []);
            expect(mockSave).toHaveBeenCalled();
        });
        it('should handle nodes without labels', async () => {
            const nodesWithoutLabels = [
                {
                    id: 'test-node',
                    position: { x: 0, y: 0 },
                    data: {},
                },
            ];
            await (0, pdfExporter_1.exportAsPDF)(mockElement, nodesWithoutLabels, [], 'test.pdf', {
                includeMetadata: true,
            });
            expect(mockText).toHaveBeenCalledWith(expect.stringContaining('test-node'), expect.any(Number), expect.any(Number));
        });
        it('should handle nodes without type', async () => {
            const nodesWithoutType = [
                {
                    id: 'node1',
                    position: { x: 0, y: 0 },
                    data: { label: 'Test' },
                },
            ];
            await (0, pdfExporter_1.exportAsPDF)(mockElement, nodesWithoutType, [], 'test.pdf', {
                includeMetadata: true,
            });
            expect(mockSave).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=pdfExporter.test.js.map