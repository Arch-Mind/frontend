"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Unit tests for ClusterNode component
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const reactflow_1 = require("reactflow");
const ClusterNode_1 = require("../ClusterNode");
const reactflow_1 = require("reactflow");
// Test suite for ClusterNode functionality
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
    // Test: renders cluster label and node count correctly
    it('renders cluster label and node count', () => {
<<<<<<< HEAD
        renderWithProvider(react_1.default.createElement(ClusterNode_1.ClusterNode, { ...nodeProps }));
=======
        (0, react_2.render)(react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
            react_1.default.createElement(ClusterNode_1.ClusterNode, { ...nodeProps })));
>>>>>>> 1d859f6 (implement unit tests)
        expect(react_2.screen.getByText('Cluster A')).toBeInTheDocument();
        expect(react_2.screen.getByText('5')).toBeInTheDocument();
    });
    // Test: verifies expand callback when icon is clicked
    it('calls onExpand when expand icon is clicked', () => {
<<<<<<< HEAD
        renderWithProvider(react_1.default.createElement(ClusterNode_1.ClusterNode, { ...nodeProps }));
        const button = react_2.screen.getByTitle('Expand cluster');
        react_2.fireEvent.click(button);
=======
        (0, react_2.render)(react_1.default.createElement(reactflow_1.ReactFlowProvider, null,
            react_1.default.createElement(ClusterNode_1.ClusterNode, { ...nodeProps })));
        // Try to get the button or clickable element for expand
        let icon;
        try {
            icon = react_2.screen.getByRole('button');
        }
        catch {
            icon = react_2.screen.getByText('📁');
        }
        react_2.fireEvent.click(icon);
>>>>>>> 1d859f6 (implement unit tests)
        expect(onExpand).toHaveBeenCalled();
    });
});
//# sourceMappingURL=ClusterNode.test.js.map