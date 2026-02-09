"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const RelationshipVisualizer_1 = require("../RelationshipVisualizer");
describe('RelationshipVisualizer', () => {
    it('renders relationship visualizer panel', () => {
        // Mock nodes and edges to ensure content is rendered
        const nodes = [{ id: '1', type: 'file' }];
        (0, react_2.render)(react_1.default.createElement(RelationshipVisualizer_1.RelationshipVisualizer, { selectedNodeId: "1", nodes: nodes, edges: [], onClose: jest.fn() }));
        // Look for the "Relationships" title specifically
        expect(react_2.screen.getByText('Relationships')).toBeInTheDocument();
    });
});
//# sourceMappingURL=RelationshipVisualizer.test.js.map