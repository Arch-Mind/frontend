"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsonExporter_1 = require("../jsonExporter");
describe('jsonExporter', () => {
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
        it('should export nodes and edges as JSON string', () => {
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const parsed = JSON.parse(result);
            expect(parsed.version).toBe('1.0');
            expect(parsed.metadata.totalNodes).toBe(2);
            expect(parsed.metadata.totalEdges).toBe(1);
            expect(parsed.nodes).toHaveLength(2);
            expect(parsed.edges).toHaveLength(1);
        });
        it('should include rawData when provided', () => {
            const rawData = { custom: 'data' };
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges, rawData);
            const parsed = JSON.parse(result);
            expect(parsed.rawData).toEqual(rawData);
        });
        it('should set correct source metadata', () => {
            const backendResult = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges, undefined, 'backend');
            const parsed = JSON.parse(backendResult);
            expect(parsed.metadata.source).toBe('backend');
        });
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
        it('should include node style information', () => {
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const parsed = JSON.parse(result);
            expect(parsed.nodes[1].style).toEqual({ backgroundColor: 'blue' });
        });
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
        it('should include exportDate in ISO format', () => {
            const result = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const parsed = JSON.parse(result);
            expect(parsed.exportDate).toBeDefined();
            expect(new Date(parsed.exportDate).toISOString()).toBe(parsed.exportDate);
        });
    });
    describe('downloadJSON', () => {
        let createElementSpy;
        let appendChildSpy;
        let removeChildSpy;
        let createObjectURLSpy;
        let revokeObjectURLSpy;
        beforeEach(() => {
            const mockLink = {
                href: '',
                download: '',
                click: jest.fn(),
            };
            createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
            appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
            removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();
            createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
            revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation();
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
        it('should trigger download with correct filename', () => {
            (0, jsonExporter_1.downloadJSON)(mockNodes, mockEdges, 'test-export.json');
            const mockLink = createElementSpy.mock.results[0].value;
            expect(mockLink.download).toBe('test-export.json');
            expect(mockLink.click).toHaveBeenCalled();
        });
        it('should use default filename when not provided', () => {
            (0, jsonExporter_1.downloadJSON)(mockNodes, mockEdges);
            const mockLink = createElementSpy.mock.results[0].value;
            expect(mockLink.download).toBe('graph-export.json');
        });
        it('should create and revoke object URL', () => {
            (0, jsonExporter_1.downloadJSON)(mockNodes, mockEdges);
            expect(createObjectURLSpy).toHaveBeenCalled();
            expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
        });
        it('should append and remove link from DOM', () => {
            (0, jsonExporter_1.downloadJSON)(mockNodes, mockEdges);
            expect(appendChildSpy).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalled();
        });
    });
    describe('parseImportedJSON', () => {
        it('should parse valid JSON export', () => {
            const validJSON = (0, jsonExporter_1.exportAsJSON)(mockNodes, mockEdges);
            const result = (0, jsonExporter_1.parseImportedJSON)(validJSON);
            expect(result.version).toBe('1.0');
            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
        });
        it('should throw error for invalid JSON', () => {
            expect(() => (0, jsonExporter_1.parseImportedJSON)('invalid json')).toThrow('Failed to parse JSON');
        });
        it('should throw error for missing version', () => {
            const invalidData = JSON.stringify({
                nodes: [],
                edges: [],
            });
            expect(() => (0, jsonExporter_1.parseImportedJSON)(invalidData)).toThrow('Invalid export file format');
        });
        it('should throw error for missing nodes', () => {
            const invalidData = JSON.stringify({
                version: '1.0',
                edges: [],
            });
            expect(() => (0, jsonExporter_1.parseImportedJSON)(invalidData)).toThrow('Invalid export file format');
        });
        it('should throw error for missing edges', () => {
            const invalidData = JSON.stringify({
                version: '1.0',
                nodes: [],
            });
            expect(() => (0, jsonExporter_1.parseImportedJSON)(invalidData)).toThrow('Invalid export file format');
        });
    });
    describe('convertToReactFlowFormat', () => {
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
        it('should return size in bytes', () => {
            const size = (0, jsonExporter_1.getJSONSize)(mockNodes, mockEdges);
            expect(size).toBeGreaterThan(0);
            expect(typeof size).toBe('number');
        });
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