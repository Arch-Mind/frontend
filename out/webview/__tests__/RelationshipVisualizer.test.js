"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const RelationshipVisualizer_1 = __importDefault(require("../RelationshipVisualizer"));
const mockNode = {
    id: '1',
    type: 'function',
    parentId: undefined,
    filePath: '/path/to/file',
};
describe('RelationshipVisualizer', () => {
    it('renders relationship visualizer panel', () => {
        (0, react_2.render)(react_1.default.createElement(RelationshipVisualizer_1.RelationshipVisualizer, { selectedNodeId: "1", nodes: [], edges: [], onClose: jest.fn() }));
        expect(react_2.screen.getByText(/relationship/i)).toBeInTheDocument();
    });
});
//# sourceMappingURL=RelationshipVisualizer.test.js.map