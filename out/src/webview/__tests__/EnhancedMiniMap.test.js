"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const EnhancedMiniMap_1 = require("../EnhancedMiniMap");
// Mock ReactFlow MiniMap since it uses ResizeObserver and other browser APIs
jest.mock('reactflow', () => ({
    MiniMap: ({ nodeColor, nodeClassName, onNodeClick, style }) => {
        const mockNodes = [
            { id: '1', type: 'file', data: { type: 'file', language: 'typescript' } },
            { id: '2', type: 'function', data: { type: 'function' } },
            { id: '3', type: 'class', data: { type: 'class' } },
        ];
        return (react_1.default.createElement("div", { "data-testid": "minimap-mock", style: style }, mockNodes.map((node) => (react_1.default.createElement("div", { key: node.id, "data-testid": `node-${node.id}`, "data-color": typeof nodeColor === 'function' ? nodeColor(node) : nodeColor, className: typeof nodeClassName === 'function' ? nodeClassName(node) : nodeClassName, onClick: (e) => onNodeClick && onNodeClick(e, node) },
            "Node ",
            node.id)))));
    },
}));
describe('EnhancedMiniMap', () => {
    const defaultProps = {
        selectedNodeId: null,
        hoveredNodeId: null,
        nodeColors: {},
        position: 'bottom-right',
        onNodeClick: jest.fn(),
    };
    it('renders without crashing', () => {
        (0, react_2.render)(react_1.default.createElement(EnhancedMiniMap_1.EnhancedMiniMap, { ...defaultProps }));
        expect(react_2.screen.getByTestId('minimap-mock')).toBeInTheDocument();
    });
    it('applies correct colors to nodes based on type', () => {
        (0, react_2.render)(react_1.default.createElement(EnhancedMiniMap_1.EnhancedMiniMap, { ...defaultProps }));
        const fileNode = react_2.screen.getByTestId('node-1');
        expect(fileNode).toHaveAttribute('data-color', '#3498db');
    });
    it('highlights selected node with specific color', () => {
        (0, react_2.render)(react_1.default.createElement(EnhancedMiniMap_1.EnhancedMiniMap, { ...defaultProps, selectedNodeId: "1" }));
        const selectedNode = react_2.screen.getByTestId('node-1');
        expect(selectedNode).toHaveAttribute('data-color', '#f39c12');
    });
    it('handles node clicks', () => {
        const onNodeClick = jest.fn();
        (0, react_2.render)(react_1.default.createElement(EnhancedMiniMap_1.EnhancedMiniMap, { ...defaultProps, onNodeClick: onNodeClick }));
        const node = react_2.screen.getByTestId('node-1');
        react_2.fireEvent.click(node);
        expect(onNodeClick).toHaveBeenCalled();
    });
});
//# sourceMappingURL=EnhancedMiniMap.test.js.map