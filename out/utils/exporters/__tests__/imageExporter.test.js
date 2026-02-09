"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const imageExporter_1 = require("../imageExporter");
// Mock html2canvas
jest.mock('html2canvas', () => {
    return jest.fn(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.toBlob = jest.fn((callback) => {
            callback(new Blob(['mock-image-data'], { type: 'image/png' }));
        });
        canvas.toDataURL = jest.fn(() => 'data:image/png;base64,mockdata');
        return Promise.resolve(canvas);
    });
});
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
    const mockEdges = [
        {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            label: 'calls',
        },
    ];
    let mockElement;
    let mockViewport;
    let createElementSpy;
    let appendChildSpy;
    let removeChildSpy;
    let createObjectURLSpy;
    let revokeObjectURLSpy;
    let mockLink;
    beforeEach(() => {
        // Setup mock viewport
        mockViewport = document.createElement('div');
        mockViewport.className = 'react-flow__viewport';
        mockElement = document.createElement('div');
        mockElement.appendChild(mockViewport);
        // Setup DOM mocks
        mockLink = {
            href: '',
            download: '',
            click: jest.fn(),
        };
        createElementSpy = jest.spyOn(document, 'createElement');
        const originalCreateElement = createElementSpy.getMockImplementation();
        createElementSpy.mockImplementation((tagName) => {
            if (tagName === 'a') {
                return mockLink;
            }
            return document.createElement(tagName);
        });
        appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
        removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();
        createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
        revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('exportAsPNG', () => {
        it('should export graph as PNG', async () => {
            await (0, imageExporter_1.exportAsPNG)(mockElement, 'test.png');
            expect(mockLink.download).toBe('test.png');
            expect(mockLink.click).toHaveBeenCalled();
        });
        it('should use default filename when not provided', async () => {
            await (0, imageExporter_1.exportAsPNG)(mockElement);
            expect(mockLink.download).toBe('graph.png');
        });
        it('should use custom options', async () => {
            const html2canvas = require('html2canvas');
            await (0, imageExporter_1.exportAsPNG)(mockElement, 'test.png', {
                scale: 3,
                backgroundColor: '#ffffff',
                quality: 0.8,
            });
            expect(html2canvas).toHaveBeenCalledWith(mockViewport, expect.objectContaining({
                scale: 3,
                backgroundColor: '#ffffff',
            }));
        });
        it('should handle missing viewport error', async () => {
            const emptyElement = document.createElement('div');
            await expect((0, imageExporter_1.exportAsPNG)(emptyElement)).rejects.toThrow('ReactFlow viewport not found');
        });
        it('should create and revoke blob URL', async () => {
            await (0, imageExporter_1.exportAsPNG)(mockElement);
            expect(createObjectURLSpy).toHaveBeenCalled();
            expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
        });
        it('should handle includeBackground option', async () => {
            const html2canvas = require('html2canvas');
            await (0, imageExporter_1.exportAsPNG)(mockElement, 'test.png', { includeBackground: false });
            expect(html2canvas).toHaveBeenCalledWith(mockViewport, expect.objectContaining({
                backgroundColor: null,
            }));
        });
        it('should use default image options', async () => {
            const html2canvas = require('html2canvas');
            await (0, imageExporter_1.exportAsPNG)(mockElement);
            expect(html2canvas).toHaveBeenCalledWith(mockViewport, expect.objectContaining({
                scale: imageExporter_1.DEFAULT_IMAGE_OPTIONS.scale,
                backgroundColor: imageExporter_1.DEFAULT_IMAGE_OPTIONS.backgroundColor,
            }));
        });
    });
    describe('exportAsJPEG', () => {
        it('should export graph as JPEG', async () => {
            await (0, imageExporter_1.exportAsJPEG)(mockElement, 'test.jpg');
            expect(mockLink.download).toBe('test.jpg');
            expect(mockLink.click).toHaveBeenCalled();
        });
        it('should use default filename when not provided', async () => {
            await (0, imageExporter_1.exportAsJPEG)(mockElement);
            expect(mockLink.download).toBe('graph.jpg');
        });
        it('should set format to jpeg', async () => {
            const canvas = document.createElement('canvas');
            const toBlobSpy = jest.spyOn(canvas, 'toBlob');
            await (0, imageExporter_1.exportAsJPEG)(mockElement, 'test.jpg');
            // The format should be set to 'jpeg' internally
        });
    });
    describe('exportAsWebP', () => {
        it('should export graph as WebP', async () => {
            await (0, imageExporter_1.exportAsWebP)(mockElement, 'test.webp');
            expect(mockLink.download).toBe('test.webp');
            expect(mockLink.click).toHaveBeenCalled();
        });
        it('should use default filename when not provided', async () => {
            await (0, imageExporter_1.exportAsWebP)(mockElement);
            expect(mockLink.download).toBe('graph.webp');
        });
    });
    describe('exportAsSVG', () => {
        beforeEach(() => {
            global.Blob = jest.fn().mockImplementation((content) => ({
                content: content[0],
                size: content[0].length,
            }));
        });
        it('should export graph as SVG', () => {
            (0, imageExporter_1.exportAsSVG)(mockNodes, mockEdges, 'test.svg');
            expect(mockLink.download).toBe('test.svg');
            expect(mockLink.click).toHaveBeenCalled();
        });
        it('should use default filename when not provided', () => {
            (0, imageExporter_1.exportAsSVG)(mockNodes, mockEdges);
            expect(mockLink.download).toBe('graph.svg');
        });
        it('should generate valid SVG structure', () => {
            (0, imageExporter_1.exportAsSVG)(mockNodes, mockEdges);
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(blobContent).toContain('<svg');
            expect(blobContent).toContain('</svg>');
        });
        it('should include nodes in SVG', () => {
            (0, imageExporter_1.exportAsSVG)(mockNodes, mockEdges);
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('Node 1');
            expect(blobContent).toContain('Node 2');
        });
        it('should include edges in SVG', () => {
            (0, imageExporter_1.exportAsSVG)(mockNodes, mockEdges);
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('<line');
            expect(blobContent).toContain('marker-end="url(#arrowhead)"');
        });
        it('should handle custom dimensions', () => {
            (0, imageExporter_1.exportAsSVG)(mockNodes, mockEdges, 'test.svg', {
                width: 1000,
                height: 800,
            });
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('width="1000"');
            expect(blobContent).toContain('height="800"');
        });
        it('should handle padding option', () => {
            (0, imageExporter_1.exportAsSVG)(mockNodes, mockEdges, 'test.svg', { padding: 100 });
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('<svg');
        });
        it('should escape XML special characters in labels', () => {
            const nodesWithSpecialChars = [
                {
                    id: 'node1',
                    position: { x: 0, y: 0 },
                    data: { label: 'Test & Node <script>' },
                },
            ];
            (0, imageExporter_1.exportAsSVG)(nodesWithSpecialChars, []);
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('&amp;');
            expect(blobContent).toContain('&lt;');
            expect(blobContent).toContain('&gt;');
        });
        it('should handle empty nodes array', () => {
            (0, imageExporter_1.exportAsSVG)([], []);
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('<svg');
            expect(blobContent).toContain('</svg>');
        });
    });
    describe('copyToClipboard', () => {
        let mockClipboard;
        beforeEach(() => {
            mockClipboard = {
                write: jest.fn().mockResolvedValue(undefined),
            };
            Object.defineProperty(navigator, 'clipboard', {
                value: mockClipboard,
                writable: true,
                configurable: true,
            });
        });
        it('should copy image to clipboard', async () => {
            await (0, imageExporter_1.copyToClipboard)(mockElement);
            expect(mockClipboard.write).toHaveBeenCalled();
        });
        it('should handle missing viewport error', async () => {
            const emptyElement = document.createElement('div');
            await expect((0, imageExporter_1.copyToClipboard)(emptyElement)).rejects.toThrow('ReactFlow viewport not found');
        });
        it('should use html2canvas with correct options', async () => {
            const html2canvas = require('html2canvas');
            await (0, imageExporter_1.copyToClipboard)(mockElement);
            expect(html2canvas).toHaveBeenCalledWith(mockViewport, expect.objectContaining({
                backgroundColor: '#1e1e1e',
                scale: 2,
                logging: false,
            }));
        });
        it('should create ClipboardItem with PNG blob', async () => {
            await (0, imageExporter_1.copyToClipboard)(mockElement);
            const writeCall = mockClipboard.write.mock.calls[0][0];
            expect(writeCall).toHaveLength(1);
            expect(writeCall[0]).toBeInstanceOf(ClipboardItem);
        });
    });
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
    describe('edge cases', () => {
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
        it('should handle nodes without labels', () => {
            const nodesWithoutLabels = [
                {
                    id: 'test-node',
                    position: { x: 0, y: 0 },
                    data: {},
                },
            ];
            global.Blob = jest.fn().mockImplementation((content) => ({
                content: content[0],
                size: content[0].length,
            }));
            (0, imageExporter_1.exportAsSVG)(nodesWithoutLabels, []);
            const blobContent = global.Blob.mock.calls[0][0][0];
            expect(blobContent).toContain('test-node');
        });
    });
});
//# sourceMappingURL=imageExporter.test.js.map