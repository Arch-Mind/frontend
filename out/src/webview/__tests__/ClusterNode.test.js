"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const ClusterNode_1 = require("../ClusterNode");
// Mock ReactFlow components since they require a Provider context
jest.mock('reactflow', () => ({
    Handle: () => react_1.default.createElement("div", { "data-testid": "handle" }),
    Position: {
        Top: 'top',
        Bottom: 'bottom',
    },
}));
describe('ClusterNode', () => {
    const mockNode = {
        id: 'cluster-1',
        data: {
            cluster: {
                id: 'cluster-1',
                label: 'src/utils',
                metrics: {
                    nodeCount: 5,
                    fileCount: 2,
                    functionCount: 3,
                    classCount: 0
                }
            },
            onExpand: jest.fn(),
        },
    };
    it('renders cluster label and node count', () => {
        (0, react_2.render)(react_1.default.createElement(ClusterNode_1.ClusterNode, { ...mockNode }));
        expect(react_2.screen.getByText('src/utils')).toBeInTheDocument();
        expect(react_2.screen.getByText('5')).toBeInTheDocument();
    });
    it('calls onExpand when expand icon is clicked', () => {
        (0, react_2.render)(react_1.default.createElement(ClusterNode_1.ClusterNode, { ...mockNode }));
        const expandButton = react_2.screen.getByTitle('Expand cluster');
        react_2.fireEvent.click(expandButton);
        expect(mockNode.data.onExpand).toHaveBeenCalledWith('cluster-1');
    });
});
//# sourceMappingURL=ClusterNode.test.js.map