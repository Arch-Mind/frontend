"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const markdownExporter_1 = require("../markdownExporter");
describe('markdownExporter', () => {
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
    describe('generateMermaidDiagram', () => {
        it('should generate mermaid diagram with default direction', () => {
            const result = (0, markdownExporter_1.generateMermaidDiagram)(mockNodes, mockEdges);
            expect(result).toContain('```mermaid');
            expect(result).toContain('graph TB');
            expect(result).toContain('```');
        });
        it('should support different directions', () => {
            const directions = ['TB', 'LR', 'RL', 'BT'];
            directions.forEach(direction => {
                const result = (0, markdownExporter_1.generateMermaidDiagram)(mockNodes, mockEdges, direction);
                expect(result).toContain(`graph ${direction}`);
            });
        });
        it('should include nodes with appropriate shapes', () => {
            const result = (0, markdownExporter_1.generateMermaidDiagram)(mockNodes, mockEdges);
            // Class nodes use rectangle
            expect(result).toContain('[AuthService]');
            // Function nodes use stadium shape
            expect(result).toContain('([login])');
            // Directory nodes use rectangle
            expect(result).toContain('[database]');
        });
        it('should include edges with labels', () => {
            const result = (0, markdownExporter_1.generateMermaidDiagram)(mockNodes, mockEdges);
            expect(result).toContain('|calls|');
            expect(result).toContain('|connects to|');
        });
        it('should sanitize IDs for Mermaid compatibility', () => {
            const nodesWithSpecialChars = [
                {
                    id: 'node-with-dashes',
                    position: { x: 0, y: 0 },
                    data: { label: 'Test Node' },
                },
                {
                    id: '123-starts-with-number',
                    position: { x: 100, y: 100 },
                    data: { label: 'Another' },
                },
            ];
            const result = (0, markdownExporter_1.generateMermaidDiagram)(nodesWithSpecialChars, []);
            expect(result).toContain('node_with_dashes');
            expect(result).toContain('node_123_starts_with_number');
        });
        it('should escape markdown special characters in labels', () => {
            const nodesWithSpecialChars = [
                {
                    id: 'node1',
                    position: { x: 0, y: 0 },
                    data: { label: 'Test[bracket]' },
                },
                {
                    id: 'node2',
                    position: { x: 100, y: 100 },
                    data: { label: 'Has|pipe' },
                },
            ];
            const result = (0, markdownExporter_1.generateMermaidDiagram)(nodesWithSpecialChars, []);
            expect(result).toContain('Test\\[bracket\\]');
            expect(result).toContain('Has\\|pipe');
        });
        it('should handle different node types', () => {
            const typedNodes = [
                { id: 'file1', position: { x: 0, y: 0 }, data: { label: 'File', type: 'file' } },
                { id: 'func1', position: { x: 0, y: 0 }, data: { label: 'Func', type: 'function' } },
                { id: 'class1', position: { x: 0, y: 0 }, data: { label: 'Class', type: 'class' } },
                { id: 'dir1', position: { x: 0, y: 0 }, data: { label: 'Dir', type: 'directory' } },
                { id: 'default1', position: { x: 0, y: 0 }, data: { label: 'Default', type: 'default' } },
            ];
            const result = (0, markdownExporter_1.generateMermaidDiagram)(typedNodes, []);
            // File uses rounded rectangle
            expect(result).toContain('(File)');
            // Function uses stadium
            expect(result).toContain('([Func])');
            // Class uses rectangle
            expect(result).toContain('[Class]');
            // Directory uses rectangle
            expect(result).toContain('[Dir]');
            // Default uses hexagon
            expect(result).toContain('{{Default}}');
        });
        it('should handle edges without labels', () => {
            const edgesWithoutLabels = [
                {
                    id: 'edge1',
                    source: 'node1',
                    target: 'node2',
                },
            ];
            const result = (0, markdownExporter_1.generateMermaidDiagram)(mockNodes, edgesWithoutLabels);
            expect(result).toContain('-->');
        });
        it('should handle empty nodes and edges', () => {
            const result = (0, markdownExporter_1.generateMermaidDiagram)([], []);
            expect(result).toContain('```mermaid');
            expect(result).toContain('graph TB');
            expect(result).toContain('```');
        });
        it('should handle nodes without type', () => {
            const nodesWithoutType = [
                {
                    id: 'node1',
                    position: { x: 0, y: 0 },
                    data: { label: 'Test' },
                },
            ];
            const result = (0, markdownExporter_1.generateMermaidDiagram)(nodesWithoutType, []);
            expect(result).toContain('Test');
        });
        it('should handle very large graphs', () => {
            const manyNodes = Array.from({ length: 100 }, (_, i) => ({
                id: `node${i}`,
                position: { x: i * 100, y: i * 100 },
                data: { label: `Node ${i}`, type: 'class' },
            }));
            const result = (0, markdownExporter_1.generateMermaidDiagram)(manyNodes, []);
            expect(result).toContain('```mermaid');
            expect(result.split('\n').length).toBeGreaterThan(100);
        });
    });
    describe('getMarkdownSize', () => {
        it('should return size in bytes', () => {
            const size = (0, markdownExporter_1.getMarkdownSize)(mockNodes, mockEdges);
            expect(size).toBeGreaterThan(0);
            expect(typeof size).toBe('number');
        });
        it('should return larger size for more nodes', () => {
            const singleNode = [mockNodes[0]];
            const singleSize = (0, markdownExporter_1.getMarkdownSize)(singleNode, []);
            const multiSize = (0, markdownExporter_1.getMarkdownSize)(mockNodes, mockEdges);
            expect(multiSize).toBeGreaterThan(singleSize);
        });
    });
    describe('DEFAULT_MARKDOWN_OPTIONS', () => {
        it('should have correct default values', () => {
            expect(markdownExporter_1.DEFAULT_MARKDOWN_OPTIONS.format).toBe('mermaid');
            expect(markdownExporter_1.DEFAULT_MARKDOWN_OPTIONS.includeMetadata).toBe(true);
            expect(markdownExporter_1.DEFAULT_MARKDOWN_OPTIONS.includeStats).toBe(true);
            expect(markdownExporter_1.DEFAULT_MARKDOWN_OPTIONS.includeNodeList).toBe(false);
            expect(markdownExporter_1.DEFAULT_MARKDOWN_OPTIONS.includeEdgeList).toBe(false);
            expect(markdownExporter_1.DEFAULT_MARKDOWN_OPTIONS.mermaidDirection).toBe('TB');
        });
    });
});
//# sourceMappingURL=markdownExporter.test.js.map