"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsonExporter_1 = require("../jsonExporter");
// Test suite for JSON Exporter functionality
describe('jsonExporter', () => {
    // Mock Data: Standard nodes for testing exports
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
            style: { backgroundColor: 'blue' },
        },
    ];
    // Mock Data: Standard edges connecting the nodes
    const mockEdges = [
        {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            type: 'default',
            label: 'calls',
        },
    ];
    describe('exportAsJSON', () => {
        // Verify that the minimal export structure is correct
        it('should export nodes and edges as JSON string', () => {
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const parsed = JSON.parse(result);
            expect(parsed.version).toBe('1.0');
            expect(parsed.metadata.totalNodes).toBe(2);
            expect(parsed.metadata.totalEdges).toBe(1);
            expect(parsed.nodes).toHaveLength(2);
            expect(parsed.edges).toHaveLength(1);
        });
        // Verify that extra raw data is preserved in the export
        it('should include rawData when provided', () => {
            const rawData = { custom: 'data' };
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges, rawData);
            const parsed = JSON.parse(result);
            expect(parsed.rawData).toEqual(rawData);
        });
        // Verify metadata source tracking
        it('should set correct source metadata', () => {
            const backendResult = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges, undefined, 'backend');
            const parsed = JSON.parse(backendResult);
            expect(parsed.metadata.source).toBe('backend');
        });
        // Verify fallback behavior for nodes missing explicit labels
        it('should handle nodes without labels', () => {
            const nodesWithoutLabels = [
                {
                    id: 'test-node',
                    position: { x: 0, y: 0 },
                    data: {},
                },
            ];
            const result = (0, jsonExporter_1.exportAsJSON)(nodesWithoutLabels, []);
            const parsed = JSON.parse(result);
            expect(parsed.nodes[0].label).toBe('test-node');
        });
        // Verify styling data is kept
        it('should include node style information', () => {
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const parsed = JSON.parse(result);
            expect(parsed.nodes[1].style).toEqual({ backgroundColor: 'blue' });
        });
        // Verify that non-standard labels are handled gracefully
        it('should handle edges with non-string labels', () => {
            const edgesWithObjectLabel = [
                {
                    id: 'edge1',
                    source: 'node1',
                    target: 'node2',
                    label: { text: 'complex' },
                },
            ];
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, edgesWithObjectLabel);
            const parsed = JSON.parse(result);
            expect(parsed.edges[0].label).toBeUndefined();
        });
        // Verify timestamps are generated correctly
        it('should include exportDate in ISO format', () => {
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const parsed = JSON.parse(result);
            expect(parsed.exportDate).toBeDefined();
            expect(new Date(parsed.exportDate).toISOString()).toBe(parsed.exportDate);
        });
    });
    describe('parseImportedJSON', () => {
        // Verify happy path for parsing
        it('should parse valid JSON export', () => {
            const validJSON = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const result = (0, jsonExporter_1.parseImportedJSON)(validJSON);
            expect(result.version).toBe('1.0');
            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
        });
        // Verify error handling for malformed JSON strings
        it('should throw error for invalid JSON', () => {
            expect(() => (0, jsonExporter_1.parseImportedJSON)('invalid json')).toThrow('Failed to parse JSON');
        });
        // Verify error handling for missing required fields (version)
        it('should throw error for missing version', () => {
            const invalidData = JSON.stringify({
                nodes: [],
                edges: [],
            });
            expect(() => (0, jsonExporter_1.parseImportedJSON)(invalidData)).toThrow('Invalid export file format');
        });
        // Verify error handling for missing nodes array
        it('should throw error for missing nodes', () => {
            const invalidData = JSON.stringify({
                version: '1.0',
                edges: [],
            });
            expect(() => (0, jsonExporter_1.parseImportedJSON)(invalidData)).toThrow('Invalid export file format');
        });
        // Verify error handling for missing edges array
        it('should throw error for missing edges', () => {
            const invalidData = JSON.stringify({
                version: '1.0',
                nodes: [],
            });
            expect(() => (0, jsonExporter_1.parseImportedJSON)(invalidData)).toThrow('Invalid export file format');
        });
    });
    describe('convertToReactFlowFormat', () => {
        // Verify that import data is correctly transformed back into ReactFlow state
        it('should convert exported data back to ReactFlow format', () => {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                metadata: {
                    totalNodes: 2,
                    totalEdges: 1,
                    source: 'local',
                },
                nodes: [
                    {
                        id: 'node1',
                        label: 'Node 1',
                        type: 'function',
                        position: { x: 100, y: 200 },
                        data: { label: 'Node 1', type: 'function' },
                    },
                ],
                edges: [
                    {
                        id: 'edge1',
                        source: 'node1',
                        target: 'node2',
                        type: 'default',
                        label: 'calls',
                    },
                ],
            };
            const result = (0, jsonExporter_1.convertToReactFlowFormat)(exportData);
            expect(result.nodes).toHaveLength(1);
            expect(result.edges).toHaveLength(1);
            expect(result.nodes[0].id).toBe('node1');
            expect(result.edges[0].source).toBe('node1');
        });
        // Verify handling of default types (which are explicitly undefined in ReactFlow)
        it('should handle default type conversion', () => {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                metadata: {
                    totalNodes: 1,
                    totalEdges: 0,
                    source: 'local',
                },
                nodes: [
                    {
                        id: 'node1',
                        label: 'Node 1',
                        type: 'default',
                        position: { x: 0, y: 0 },
                        data: {},
                    },
                ],
                edges: [],
            };
            const result = (0, jsonExporter_1.convertToReactFlowFormat)(exportData);
            expect(result.nodes[0].type).toBeUndefined();
        });
        // Verify integrity of visual properties (position, style)
        it('should preserve node positions and data', () => {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                metadata: {
                    totalNodes: 1,
                    totalEdges: 0,
                    source: 'local',
                },
                nodes: [
                    {
                        id: 'node1',
                        label: 'Test',
                        type: 'class',
                        position: { x: 150, y: 250 },
                        data: { custom: 'value' },
                        style: { color: 'red' },
                    },
                ],
                edges: [],
            };
            const result = (0, jsonExporter_1.convertToReactFlowFormat)(exportData);
            expect(result.nodes[0].position).toEqual({ x: 150, y: 250 });
            expect(result.nodes[0].data).toEqual({ custom: 'value' });
            expect(result.nodes[0].style).toEqual({ color: 'red' });
        });
    });
    describe('getJSONSize', () => {
        // Verify size calculation
        it('should return size in bytes', () => {
            const size = (0, jsonExporter_1.getJSONSize)(mockNodes, mockEdges);
            expect(size).toBeGreaterThan(0);
            expect(typeof size).toBe('number');
        });
        // Verify that more data equals larger size
        it('should return larger size for more data', () => {
            const singleNode = [mockNodes[0]];
            const singleSize = (0, jsonExporter_1.getJSONSize)(singleNode, []);
            const multiSize = (0, jsonExporter_1.getJSONSize)(mockNodes, mockEdges);
            expect(multiSize).toBeGreaterThan(singleSize);
        });
    });
    describe('formatFileSize', () => {
        it('should format bytes correctly', () => {
            expect((0, jsonExporter_1.formatFileSize)(500)).toBe('500 B');
        });
        it('should format kilobytes correctly', () => {
            expect((0, jsonExporter_1.formatFileSize)(1024)).toBe('1.00 KB');
            expect((0, jsonExporter_1.formatFileSize)(2048)).toBe('2.00 KB');
            expect((0, jsonExporter_1.formatFileSize)(1536)).toBe('1.50 KB');
        });
        it('should format megabytes correctly', () => {
            expect((0, jsonExporter_1.formatFileSize)(1024 * 1024)).toBe('1.00 MB');
            expect((0, jsonExporter_1.formatFileSize)(1024 * 1024 * 2.5)).toBe('2.50 MB');
        });
        it('should handle edge cases', () => {
            expect((0, jsonExporter_1.formatFileSize)(0)).toBe('0 B');
            expect((0, jsonExporter_1.formatFileSize)(1023)).toBe('1023 B');
            expect((0, jsonExporter_1.formatFileSize)(1024 * 1024 - 1)).toContain('KB');
        });
    });
});
//# sourceMappingURL=jsonExporter.test.js.map