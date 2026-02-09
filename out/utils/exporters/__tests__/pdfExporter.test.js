"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock jsPDF to prevent import errors
jest.mock('jspdf', () => {
    return jest.fn();
});
// Mock html2canvas
jest.mock('html2canvas', () => {
    return jest.fn();
});
const pdfExporter_1 = require("../pdfExporter");
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
        it('should provide consistent estimates', () => {
            const size1 = (0, pdfExporter_1.estimatePDFSize)(mockNodes, mockEdges);
            const size2 = (0, pdfExporter_1.estimatePDFSize)(mockNodes, mockEdges);
            expect(size1).toBe(size2);
        });
        it('should scale with data', () => {
            const smallGraph = (0, pdfExporter_1.estimatePDFSize)([mockNodes[0]], []);
            const mediumGraph = (0, pdfExporter_1.estimatePDFSize)(mockNodes.slice(0, 2), [mockEdges[0]]);
            const largeGraph = (0, pdfExporter_1.estimatePDFSize)(mockNodes, mockEdges);
            expect(mediumGraph).toBeGreaterThan(smallGraph);
            expect(largeGraph).toBeGreaterThan(mediumGraph);
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
});
//# sourceMappingURL=pdfExporter.test.js.map