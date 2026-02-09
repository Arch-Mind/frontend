"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const reactflow_1 = require("reactflow");
const ClusterNode_1 = require("../ClusterNode");
describe('ClusterNode', () => {
    const cluster = {
        id: 'cluster-1',
        label: 'Cluster A',
        path: '/root/cluster-a',
        nodes: [],
        metrics: { nodeCount: 5, fileCount: 2, functionCount: 0, classCount: 0 },
        depth: 1,
    };
    const onExpand = jest.fn();
    const data = { cluster, onExpand };
    const nodeProps = {
        id: 'cluster-1',
        type: 'cluster',
        data,
        xPos: 0,
        yPos: 0,
        selected: false,
        zIndex: 0,
        isConnectable: false,
        dragHandle: undefined,
        dragging: false,
        sourcePosition: undefined,
        targetPosition: undefined,
    };
    const renderWithProvider = (component) => {
        return (0, react_2.render)(react_1.default.createElement(reactflow_1.ReactFlowProvider, null, component));
    };
    it('renders cluster label and node count', () => {
        renderWithProvider(react_1.default.createElement(ClusterNode_1.ClusterNode, { ...nodeProps }));
        expect(react_2.screen.getByText('Cluster A')).toBeInTheDocument();
        expect(react_2.screen.getByText('5')).toBeInTheDocument();
    });
    it('calls onExpand when expand icon is clicked', () => {
        renderWithProvider(react_1.default.createElement(ClusterNode_1.ClusterNode, { ...nodeProps }));
        const button = react_2.screen.getByTitle('Expand cluster');
        react_2.fireEvent.click(button);
        expect(onExpand).toHaveBeenCalled();
    });
});
//# sourceMappingURL=ClusterNode.test.js.map