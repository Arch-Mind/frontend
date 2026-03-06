"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const RelationshipVisualizer_1 = require("../RelationshipVisualizer");
const mockNode = {
    id: '1',
    type: 'function',
    parentId: undefined,
    filePath: '/path/to/file',
};
describe('RelationshipVisualizer', () => {
    it('renders summary and no relationships message', () => {
        (0, react_2.render)(react_1.default.createElement(RelationshipVisualizer_1.RelationshipVisualizer, { selectedNodeId: "1", nodes: [mockNode], edges: [], onNodeClick: jest.fn(), onClose: jest.fn() }));
        expect(react_2.screen.getByText('Relationships')).toBeInTheDocument();
        expect(react_2.screen.getByText('0')).toBeInTheDocument();
        expect(react_2.screen.getByText(/No relationships found/i)).toBeInTheDocument();
    });
    it('renders parent and children correctly', () => {
        const nodes = [
            { id: 'parent-1', type: 'file' },
            { id: 'selected-1', type: 'function', parentId: 'parent-1' },
            { id: 'child-1', type: 'function', parentId: 'selected-1' },
        ];
        (0, react_2.render)(react_1.default.createElement(RelationshipVisualizer_1.RelationshipVisualizer, { selectedNodeId: "selected-1", nodes: nodes, edges: [], onNodeClick: jest.fn(), onClose: jest.fn() }));
        expect(react_2.screen.getByText(/Parent: parent-1/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Children: child-1/i)).toBeInTheDocument();
        expect(react_2.screen.getByText('2')).toBeInTheDocument();
    });
});
//# sourceMappingURL=RelationshipVisualizer.test.js.map