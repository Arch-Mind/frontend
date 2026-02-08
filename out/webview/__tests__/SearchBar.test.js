"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const SearchBar_1 = require("../SearchBar");
describe('SearchBar', () => {
    beforeAll(() => {
        // Mock scrollIntoView for jsdom
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
    it('renders search input and handles input', () => {
        // Use a wrapper to simulate controlled input
        function Wrapper() {
            const [query, setQuery] = react_1.default.useState('');
            return (react_1.default.createElement(SearchBar_1.SearchBar, { ...defaultProps, query: query, onQueryChange: setQuery }));
        }
        (0, react_2.render)(react_1.default.createElement(Wrapper, null));
        const input = react_2.screen.getByPlaceholderText(/search nodes/i);
        react_2.fireEvent.change(input, { target: { value: 'test' } });
        expect(input).toHaveValue('test');
    });
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