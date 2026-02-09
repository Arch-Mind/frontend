"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const imageExporter_1 = require("../imageExporter");
describe('imageExporter', () => {
    const mockNodes = [
        {
            id: 'node1',
            position: { x: 100, y: 200 },
            data: { label: 'Node 1', type: 'function' },
        },
        {
            id: 'node2',
            position: { x: 300, y: 400 },
            data: { label: 'Node 2', type: 'class' },
        },
    ];
    describe('estimateImageSize', () => {
        it('should estimate image dimensions', () => {
            const result = (0, imageExporter_1.estimateImageSize)(mockNodes);
            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
            expect(result.estimatedBytes).toBeGreaterThan(0);
        });
        it('should account for scale factor', () => {
            const scale1 = (0, imageExporter_1.estimateImageSize)(mockNodes, 1);
            const scale2 = (0, imageExporter_1.estimateImageSize)(mockNodes, 2);
            expect(scale2.width).toBe(scale1.width * 2);
            expect(scale2.height).toBe(scale1.height * 2);
        });
        it('should return larger size for more nodes', () => {
            const singleNode = [mockNodes[0]];
            const singleSize = (0, imageExporter_1.estimateImageSize)(singleNode);
            const multiSize = (0, imageExporter_1.estimateImageSize)(mockNodes);
            expect(multiSize.width).toBeGreaterThanOrEqual(singleSize.width);
            expect(multiSize.height).toBeGreaterThanOrEqual(singleSize.height);
        });
        it('should handle empty nodes array', () => {
            const result = (0, imageExporter_1.estimateImageSize)([]);
            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
        });
        it('should calculate estimated bytes', () => {
            const result = (0, imageExporter_1.estimateImageSize)(mockNodes, 2);
            expect(typeof result.estimatedBytes).toBe('number');
            expect(result.estimatedBytes).toBeGreaterThan(0);
        });
        it('should handle nodes at negative positions', () => {
            const negativeNodes = [
                {
                    id: 'node1',
                    position: { x: -100, y: -200 },
                    data: { label: 'Negative' },
                },
            ];
            const size = (0, imageExporter_1.estimateImageSize)(negativeNodes);
            expect(size.width).toBeGreaterThan(0);
            expect(size.height).toBeGreaterThan(0);
        });
        it('should handle very large position values', () => {
            const largeNodes = [
                {
                    id: 'node1',
                    position: { x: 10000, y: 10000 },
                    data: { label: 'Far' },
                },
            ];
            const size = (0, imageExporter_1.estimateImageSize)(largeNodes);
            expect(size.width).toBeGreaterThan(0);
            expect(size.height).toBeGreaterThan(0);
        });
        it('should handle multiple scale values', () => {
            const scales = [1, 2, 3, 4];
            scales.forEach(scale => {
                const result = (0, imageExporter_1.estimateImageSize)(mockNodes, scale);
                expect(result.width).toBeGreaterThan(0);
                expect(result.height).toBeGreaterThan(0);
            });
        });
    });
    describe('DEFAULT_IMAGE_OPTIONS', () => {
        it('should have correct default values', () => {
            expect(imageExporter_1.DEFAULT_IMAGE_OPTIONS.format).toBe('png');
            expect(imageExporter_1.DEFAULT_IMAGE_OPTIONS.quality).toBe(0.95);
            expect(imageExporter_1.DEFAULT_IMAGE_OPTIONS.scale).toBe(2);
            expect(imageExporter_1.DEFAULT_IMAGE_OPTIONS.backgroundColor).toBe('#1e1e1e');
            expect(imageExporter_1.DEFAULT_IMAGE_OPTIONS.includeBackground).toBe(true);
        });
    });
});
//# sourceMappingURL=imageExporter.test.js.map