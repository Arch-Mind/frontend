import { Node } from 'reactflow';
import {
    estimateImageSize,
    DEFAULT_IMAGE_OPTIONS,
} from '../imageExporter';

// Test suite for Image Exporter functionality
describe('imageExporter', () => {
    // Mock data: A simple graph with two nodes at different positions
    const mockNodes: Node[] = [
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
        // Verify that the function returns valid dimensions and byte size
        it('should estimate image dimensions', () => {
            const result = estimateImageSize(mockNodes);

            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
            expect(result.estimatedBytes).toBeGreaterThan(0);
        });

        // Verify that increasing the scale linearly increases dimensions
        it('should account for scale factor', () => {
            const scale1 = estimateImageSize(mockNodes, 1);
            const scale2 = estimateImageSize(mockNodes, 2);

            expect(scale2.width).toBe(scale1.width * 2);
            expect(scale2.height).toBe(scale1.height * 2);
        });

        // Verify that adding more nodes (expanding bounds) increases size
        it('should return larger size for more nodes', () => {
            const singleNode: Node[] = [mockNodes[0]];
            const singleSize = estimateImageSize(singleNode);
            const multiSize = estimateImageSize(mockNodes);

            expect(multiSize.width).toBeGreaterThanOrEqual(singleSize.width);
            expect(multiSize.height).toBeGreaterThanOrEqual(singleSize.height);
        });

        // Verify fallback defaults when no nodes exist
        it('should handle empty nodes array', () => {
            const result = estimateImageSize([]);

            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
        });

        // Verify that the byte estimation is a valid number
        it('should calculate estimated bytes', () => {
            const result = estimateImageSize(mockNodes, 2);

            expect(typeof result.estimatedBytes).toBe('number');
            expect(result.estimatedBytes).toBeGreaterThan(0);
        });

        // Verify that negative coordinates don't break the calculation
        it('should handle nodes at negative positions', () => {
            const negativeNodes: Node[] = [
                {
                    id: 'node1',
                    position: { x: -100, y: -200 },
                    data: { label: 'Negative' },
                },
            ];

            const size = estimateImageSize(negativeNodes);
            expect(size.width).toBeGreaterThan(0);
            expect(size.height).toBeGreaterThan(0);
        });

        // Verify handling of nodes far from origin
        it('should handle very large position values', () => {
            const largeNodes: Node[] = [
                {
                    id: 'node1',
                    position: { x: 10000, y: 10000 },
                    data: { label: 'Far' },
                },
            ];

            const size = estimateImageSize(largeNodes);
            expect(size.width).toBeGreaterThan(0);
            expect(size.height).toBeGreaterThan(0);
        });

        // Loop through multiple scales to ensure stability
        it('should handle multiple scale values', () => {
            const scales = [1, 2, 3, 4];

            scales.forEach(scale => {
                const result = estimateImageSize(mockNodes, scale);
                expect(result.width).toBeGreaterThan(0);
                expect(result.height).toBeGreaterThan(0);
            });
        });
    });

    describe('DEFAULT_IMAGE_OPTIONS', () => {
        it('should have correct default values', () => {
            expect(DEFAULT_IMAGE_OPTIONS.format).toBe('png');
            expect(DEFAULT_IMAGE_OPTIONS.quality).toBe(0.95);
            expect(DEFAULT_IMAGE_OPTIONS.scale).toBe(2);
            expect(DEFAULT_IMAGE_OPTIONS.backgroundColor).toBe('#1e1e1e');
            expect(DEFAULT_IMAGE_OPTIONS.includeBackground).toBe(true);
        });
    });
});
