"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const KeyboardNavigation_1 = require("../KeyboardNavigation");
// Helper component to test the hook
const TestComponent = ({ options }) => {
    (0, KeyboardNavigation_1.useKeyboardNavigation)(options);
    return react_1.default.createElement("div", { "data-testid": "test-div" }, "Keyboard Navigation Test");
};
describe('KeyboardNavigation', () => {
    const defaultOptions = {
        nodes: [{ id: 'node-1' }, { id: 'node-2' }],
        onNodeSelect: jest.fn(),
        onNodeActivate: jest.fn(),
        getCurrentNodeId: jest.fn().mockReturnValue('node-1'),
        getConnectedNodes: jest.fn().mockReturnValue([]),
        onFocusSearch: jest.fn(),
        onShowHelp: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('calls onNodeSelect when ArrowDown is pressed', () => {
        (0, react_2.render)(react_1.default.createElement(TestComponent, { options: defaultOptions }));
        react_2.fireEvent.keyDown(window, { key: 'ArrowDown' });
        expect(defaultOptions.onNodeSelect).toHaveBeenCalledWith('node-2');
    });
    it('calls onNodeActivate when Enter is pressed', () => {
        (0, react_2.render)(react_1.default.createElement(TestComponent, { options: defaultOptions }));
        react_2.fireEvent.keyDown(window, { key: 'Enter' });
        expect(defaultOptions.onNodeActivate).toHaveBeenCalledWith('node-1');
    });
    it('calls onFocusSearch when / is pressed', () => {
        (0, react_2.render)(react_1.default.createElement(TestComponent, { options: defaultOptions }));
        react_2.fireEvent.keyDown(window, { key: '/' });
        expect(defaultOptions.onFocusSearch).toHaveBeenCalled();
    });
});
//# sourceMappingURL=KeyboardNavigation.test.js.map