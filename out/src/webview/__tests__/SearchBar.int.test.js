"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const SearchBar_1 = require("../SearchBar");
const useSearch_1 = require("../useSearch");
// Mock searchable nodes
const mockNodes = [
    { id: '1', label: 'App', type: 'function', filePath: 'src/App.tsx' },
    { id: '2', label: 'ArchitectureGraph', type: 'class', filePath: 'src/ArchitectureGraph.tsx' },
    { id: '3', label: 'utilsHelpers', type: 'module', filePath: 'src/utils/helpers.ts' },
];
// A wrapper component that integrates useSearch and SearchBar
const SearchIntegrationWrapper = ({ isOpen = true }) => {
    const searchHook = (0, useSearch_1.useSearch)(mockNodes, { debounceMs: 100 });
    // Test helper to capture navigation
    const [navigatedTo, setNavigatedTo] = react_1.default.useState(null);
    return (react_1.default.createElement("div", null,
        react_1.default.createElement("div", { "data-testid": "navigated-to" }, navigatedTo),
        react_1.default.createElement(SearchBar_1.SearchBar, { query: searchHook.query, onQueryChange: searchHook.setQuery, results: searchHook.results, selectedIndex: searchHook.selectedIndex, onSelectResult: searchHook.selectResult, onNavigateToResult: (result) => setNavigatedTo(result.node.id), isOpen: isOpen })));
};
describe('SearchBar Integration with useSearch', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        HTMLElement.prototype.scrollIntoView = jest.fn();
    });
    afterEach(() => {
        jest.useRealTimers();
        HTMLElement.prototype.scrollIntoView = undefined;
    });
    it('renders the search bar when isOpen is true', () => {
        (0, react_2.render)(react_1.default.createElement(SearchIntegrationWrapper, null));
        const input = react_2.screen.getByPlaceholderText(/Search nodes/i);
        expect(input).toBeInTheDocument();
    });
    it('does not render when isOpen is false', () => {
        (0, react_2.render)(react_1.default.createElement(SearchIntegrationWrapper, { isOpen: false }));
        const input = react_2.screen.queryByPlaceholderText(/Search nodes/i);
        expect(input).not.toBeInTheDocument();
    });
    it('filters results correctly based on debounced search query', async () => {
        (0, react_2.render)(react_1.default.createElement(SearchIntegrationWrapper, null));
        const input = react_2.screen.getByPlaceholderText(/Search nodes/i);
        // Type 'App'
        react_2.fireEvent.change(input, { target: { value: 'App' } });
        expect(input).toHaveValue('App');
        // Results should not show instantly due to debounce
        expect(react_2.screen.queryByText('App.tsx')).not.toBeInTheDocument();
        // Fast-forward timers for debounce matching hook's configuration
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(100);
        });
        // 'App' should be visible now in the path
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('src/App.tsx')).toBeInTheDocument();
        });
        // The node label "App" should be in the document
        // We use queryAllByText because "App" might match the label and highlight text
        const appLabels = react_2.screen.queryAllByText('App');
        expect(appLabels.length).toBeGreaterThan(0);
    });
    it('allows clearing the query using the clear button', async () => {
        (0, react_2.render)(react_1.default.createElement(SearchIntegrationWrapper, null));
        const input = react_2.screen.getByPlaceholderText(/Search nodes/i);
        // Type search string
        react_2.fireEvent.change(input, { target: { value: 'Arch' } });
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(100);
        });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByTitle('Clear search')).toBeInTheDocument();
        });
        const clearButton = react_2.screen.getByTitle('Clear search');
        // Clear search
        react_2.fireEvent.click(clearButton);
        expect(input).toHaveValue('');
        // Let debounce run
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(100);
        });
        // Results should be cleared
        expect(react_2.screen.queryByText('src/ArchitectureGraph.tsx')).not.toBeInTheDocument();
    });
    it('supports mouse interactions for selecting and navigating to results', async () => {
        const { container } = (0, react_2.render)(react_1.default.createElement(SearchIntegrationWrapper, null));
        const input = react_2.screen.getByPlaceholderText(/Search nodes/i);
        // Type 'utilsHelpers' to match exactly
        react_2.fireEvent.change(input, { target: { value: 'utilsHelpers' } });
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(100);
        });
        // Wait until search results container is present
        await (0, react_2.waitFor)(() => {
            expect(container.querySelector('.search-results-container')).toBeInTheDocument();
            expect(container.querySelectorAll('.search-result-item').length).toBeGreaterThan(0);
        });
        // Find the specific result that contains our string
        const resultItems = Array.from(container.querySelectorAll('.search-result-item'));
        const targetContainer = resultItems.find(item => item.textContent?.includes('src/utils/helpers.ts'));
        expect(targetContainer).toBeDefined();
        // Mouse hover simulation
        if (targetContainer) {
            react_2.fireEvent.mouseEnter(targetContainer);
            expect(targetContainer).toHaveClass('selected');
            // Click to navigate
            react_2.fireEvent.click(targetContainer);
        }
        expect(react_2.screen.getByTestId('navigated-to')).toHaveTextContent('3');
    });
});
//# sourceMappingURL=SearchBar.int.test.js.map