"use strict";
// Unit tests for SearchBar component
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const SearchBar_1 = require("../SearchBar");
// Test suite for SearchBar functionality
describe('SearchBar', () => {
    // Setup: Mock scrollIntoView for jsdom environment
    beforeAll(() => {
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });
    const defaultProps = {
        query: '',
        onQueryChange: jest.fn(),
        results: [],
        selectedIndex: 0,
        onSelectResult: jest.fn(),
        onNavigateToResult: jest.fn(),
        isOpen: true,
        onClose: jest.fn(),
        placeholder: 'Search nodes... (/ or Ctrl+F)',
    };
    // Test: renders search input and handles input changes
    it('renders search input and handles input', () => {
        // Wrapper simulates controlled input for SearchBar
        function Wrapper() {
            const [query, setQuery] = react_1.default.useState('');
            return (react_1.default.createElement(SearchBar_1.SearchBar, { ...defaultProps, query: query, onQueryChange: setQuery }));
        }
        (0, react_2.render)(react_1.default.createElement(Wrapper, null));
        const input = react_2.screen.getByPlaceholderText(/search nodes/i);
        react_2.fireEvent.change(input, { target: { value: 'test' } });
        expect(input).toHaveValue('test');
    });
    // Test: verifies navigation callback when result is clicked
    it('calls onNavigateToResult when a result is clicked', () => {
        const onNavigateToResult = jest.fn();
        const onSelectResult = jest.fn();
        const results = [{
                node: {
                    id: '1',
                    label: 'FileA',
                    type: 'file',
                    filePath: '/path/to/FileA',
                },
                score: 0.95,
                matchedFields: ['label'],
                highlights: [],
            }];
        (0, react_2.render)(react_1.default.createElement(SearchBar_1.SearchBar, { ...defaultProps, results: results, onNavigateToResult: onNavigateToResult, onSelectResult: onSelectResult, query: 'FileA' }));
        const resultItem = react_2.screen.getByText('FileA');
        react_2.fireEvent.click(resultItem);
        expect(onNavigateToResult).toHaveBeenCalled();
    });
});
//# sourceMappingURL=SearchBar.test.js.map