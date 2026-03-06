"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const SearchFilter_1 = __importDefault(require("../SearchFilter"));
describe('SearchFilter', () => {
    const mockOnFilterChange = jest.fn();
    const mockOnFocusSelection = jest.fn();
    const defaultProps = {
        onFilterChange: mockOnFilterChange,
        onFocusSelection: mockOnFocusSelection,
        matchCount: 5,
        totalCount: 10,
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('renders closed by default', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        // Search input should be visible
        expect(react_2.screen.getByPlaceholderText(/Search nodes.../)).toBeInTheDocument();
        // Expanded section should not be visible
        expect(react_2.screen.queryByText('Filter by Type:')).not.toBeInTheDocument();
    });
    it('toggles expanded section when toggle button is clicked', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        const toggleBtn = react_2.screen.getByTitle('Toggle filters');
        react_2.fireEvent.click(toggleBtn);
        expect(react_2.screen.getByText('Filter by Type:')).toBeInTheDocument();
        react_2.fireEvent.click(toggleBtn);
        expect(react_2.screen.queryByText('Filter by Type:')).not.toBeInTheDocument();
    });
    it('expands and focuses input on Ctrl+F', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        react_2.fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
        expect(react_2.screen.getByText('Filter by Type:')).toBeInTheDocument();
        expect(react_2.screen.getByPlaceholderText(/Search nodes.../)).toHaveFocus();
    });
    it('updates search query and calls onFilterChange', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        const input = react_2.screen.getByPlaceholderText(/Search nodes.../);
        react_2.fireEvent.change(input, { target: { value: 'test query' } });
        expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
            searchQuery: 'test query'
        }));
        expect(input).toHaveValue('test query');
    });
    it('updates path pattern and calls onFilterChange', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        // Expand first
        const toggleBtn = react_2.screen.getByTitle('Toggle filters');
        react_2.fireEvent.click(toggleBtn);
        const pathInput = react_2.screen.getByPlaceholderText('e.g., src/components/* or *.tsx');
        react_2.fireEvent.change(pathInput, { target: { value: '*.ts' } });
        expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
            pathPattern: '*.ts'
        }));
        expect(pathInput).toHaveValue('*.ts');
    });
    it('toggles node types and calls onFilterChange', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        // Expand first
        react_2.fireEvent.click(react_2.screen.getByTitle('Toggle filters'));
        // Find the "file" type button (it contains "file")
        const fileBtn = react_2.screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'button' && content.includes('file');
        });
        react_2.fireEvent.click(fileBtn);
        expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
            nodeTypes: expect.objectContaining({
                file: false // Should toggle to false since default is true
            })
        }));
    });
    it('shows clear and focus buttons when active filters exist', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        const input = react_2.screen.getByPlaceholderText(/Search nodes.../);
        react_2.fireEvent.change(input, { target: { value: 'something' } });
        expect(react_2.screen.getByTitle('Clear all filters')).toBeInTheDocument();
        expect(react_2.screen.getByTitle('Focus on filtered results')).toBeInTheDocument();
    });
    it('clears all filters when clear button is clicked', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        // Add a filter
        const input = react_2.screen.getByPlaceholderText(/Search nodes.../);
        react_2.fireEvent.change(input, { target: { value: 'something' } });
        const clearBtn = react_2.screen.getByTitle('Clear all filters');
        react_2.fireEvent.click(clearBtn);
        expect(input).toHaveValue('');
        expect(mockOnFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({
            searchQuery: '',
            pathPattern: ''
        }));
    });
    it('triggers onFocusSelection when focus button is clicked', () => {
        (0, react_2.render)(react_1.default.createElement(SearchFilter_1.default, { ...defaultProps }));
        // Add a filter to make focus button appear
        const input = react_2.screen.getByPlaceholderText(/Search nodes.../);
        react_2.fireEvent.change(input, { target: { value: 'something' } });
        const focusBtn = react_2.screen.getByTitle('Focus on filtered results');
        react_2.fireEvent.click(focusBtn);
        expect(mockOnFocusSelection).toHaveBeenCalled();
    });
});
//# sourceMappingURL=SearchFilter.test.js.map