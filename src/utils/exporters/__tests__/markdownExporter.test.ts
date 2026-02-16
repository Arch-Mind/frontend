import { Node, Edge } from 'reactflow';
import {
    generateMermaidDiagram,
    getMarkdownSize,
    DEFAULT_MARKDOWN_OPTIONS,
} from '../markdownExporter';

// Test suite for Markdown Exporter functionality
describe('markdownExporter', () => {
    // Mock Data: Standard nodes representing different code entities (class, function, directory)
    const mockNodes: Node[] = [
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

    // Mock Data: Edges connecting the nodes
    const mockEdges: Edge[] = [
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
        // Verify default syntax generation
        it('should generate mermaid diagram with default direction', () => {
            const result = generateMermaidDiagram(mockNodes, mockEdges);

            expect(result).toContain('```mermaid');
            expect(result).toContain('graph TB');
            expect(result).toContain('```');
        });

        // Verify that direction configuration works
        it('should support different directions', () => {
            const directions: Array<'TB' | 'LR' | 'RL' | 'BT'> = ['TB', 'LR', 'RL', 'BT'];

            directions.forEach(direction => {
                const result = generateMermaidDiagram(mockNodes, mockEdges, direction);
                expect(result).toContain(`graph ${direction}`);
            });
        });

        // Verify that different node types get rendered with appropriate shapes
        it('should include nodes with appropriate shapes', () => {
            const result = generateMermaidDiagram(mockNodes, mockEdges);

            // Class nodes use rectangle
            expect(result).toContain('[AuthService]');
            // Function nodes use stadium shape
            expect(result).toContain('([login])');
            // Directory nodes use rectangle
            expect(result).toContain('[database]');
        });

        // Verify that edge labels are included
        it('should include edges with labels', () => {
            const result = generateMermaidDiagram(mockNodes, mockEdges);

            expect(result).toContain('|calls|');
            expect(result).toContain('|connects to|');
        });

        // Verify ID sanitization (removing special chars that break Mermaid)
        it('should sanitize IDs for Mermaid compatibility', () => {
            const nodesWithSpecialChars: Node[] = [
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

            const result = generateMermaidDiagram(nodesWithSpecialChars, []);

            expect(result).toContain('node_with_dashes');
            expect(result).toContain('node_123_starts_with_number');
        });

        // Verify escaping of Markdown special characters
        it('should escape markdown special characters in labels', () => {
            const nodesWithSpecialChars: Node[] = [
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

            const result = generateMermaidDiagram(nodesWithSpecialChars, []);

            expect(result).toContain('Test\\[bracket\\]');
            expect(result).toContain('Has\\|pipe');
        });

        // Verify rendering of all supported node types
        it('should handle different node types', () => {
            const typedNodes: Node[] = [
                { id: 'file1', position: { x: 0, y: 0 }, data: { label: 'File', type: 'file' } },
                { id: 'func1', position: { x: 0, y: 0 }, data: { label: 'Func', type: 'function' } },
                { id: 'class1', position: { x: 0, y: 0 }, data: { label: 'Class', type: 'class' } },
                { id: 'dir1', position: { x: 0, y: 0 }, data: { label: 'Dir', type: 'directory' } },
                { id: 'default1', position: { x: 0, y: 0 }, data: { label: 'Default', type: 'default' } },
            ];

            const result = generateMermaidDiagram(typedNodes, []);

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

        // Verify handling of edges without explicit labels
        it('should handle edges without labels', () => {
            const edgesWithoutLabels: Edge[] = [
                {
                    id: 'edge1',
                    source: 'node1',
                    target: 'node2',
                },
            ];

            const result = generateMermaidDiagram(mockNodes, edgesWithoutLabels);

            expect(result).toContain('-->');
        });

        // Verify handling of empty data sets
        it('should handle empty nodes and edges', () => {
            const result = generateMermaidDiagram([], []);

            expect(result).toContain('```mermaid');
            expect(result).toContain('graph TB');
            expect(result).toContain('```');
        });

        // Verify default type handling
        it('should handle nodes without type', () => {
            const nodesWithoutType: Node[] = [
                {
                    id: 'node1',
                    position: { x: 0, y: 0 },
                    data: { label: 'Test' },
                },
            ];

            const result = generateMermaidDiagram(nodesWithoutType, []);
            expect(result).toContain('Test');
        });

        // Verify performance/output with larger data
        it('should handle very large graphs', () => {
            const manyNodes: Node[] = Array.from({ length: 100 }, (_, i) => ({
                id: `node${i}`,
                position: { x: i * 100, y: i * 100 },
                data: { label: `Node ${i}`, type: 'class' },
            }));

            const result = generateMermaidDiagram(manyNodes, []);
            expect(result).toContain('```mermaid');
            expect(result.split('\n').length).toBeGreaterThan(100);
        });
    });

    describe('getMarkdownSize', () => {
        // Verify size calculation
        it('should return size in bytes', () => {
            const size = getMarkdownSize(mockNodes, mockEdges);

            expect(size).toBeGreaterThan(0);
            expect(typeof size).toBe('number');
        });

        // Verify that more data means larger file size
        it('should return larger size for more nodes', () => {
            const singleNode: Node[] = [mockNodes[0]];
            const singleSize = getMarkdownSize(singleNode, []);
            const multiSize = getMarkdownSize(mockNodes, mockEdges);

            expect(multiSize).toBeGreaterThan(singleSize);
        });
    });

    describe('DEFAULT_MARKDOWN_OPTIONS', () => {
        it('should have correct default values', () => {
            expect(DEFAULT_MARKDOWN_OPTIONS.format).toBe('mermaid');
            expect(DEFAULT_MARKDOWN_OPTIONS.includeMetadata).toBe(true);
            expect(DEFAULT_MARKDOWN_OPTIONS.includeStats).toBe(true);
            expect(DEFAULT_MARKDOWN_OPTIONS.includeNodeList).toBe(false);
            expect(DEFAULT_MARKDOWN_OPTIONS.includeEdgeList).toBe(false);
            expect(DEFAULT_MARKDOWN_OPTIONS.mermaidDirection).toBe('TB');
        });
    });
});
