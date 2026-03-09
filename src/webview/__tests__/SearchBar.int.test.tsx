import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchBar } from '../SearchBar';
import { useSearch } from '../useSearch';
import { SearchableNode } from '../searchEngine';

// Mock searchable nodes
const mockNodes: SearchableNode[] = [
    { id: '1', label: 'App', type: 'function', filePath: 'src/App.tsx' },
    { id: '2', label: 'ArchitectureGraph', type: 'class', filePath: 'src/ArchitectureGraph.tsx' },
    { id: '3', label: 'utilsHelpers', type: 'module', filePath: 'src/utils/helpers.ts' },
];

// A wrapper component that integrates useSearch and SearchBar
const SearchIntegrationWrapper: React.FC<{ isOpen?: boolean }> = ({ isOpen = true }) => {
    const searchHook = useSearch(mockNodes, { debounceMs: 100 });
    
    // Test helper to capture navigation
    const [navigatedTo, setNavigatedTo] = React.useState<string | null>(null);

    return (
        <div>
            <div data-testid="navigated-to">{navigatedTo}</div>
            <SearchBar
                query={searchHook.query}
                onQueryChange={searchHook.setQuery}
                results={searchHook.results}
                selectedIndex={searchHook.selectedIndex}
                onSelectResult={searchHook.selectResult}
                onNavigateToResult={(result) => setNavigatedTo(result.node.id)}
                isOpen={isOpen}
            />
        </div>
    );
};

describe('SearchBar Integration with useSearch', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    afterEach(() => {
        jest.useRealTimers();
        HTMLElement.prototype.scrollIntoView = undefined as any;
    });

    it('renders the search bar when isOpen is true', () => {
        render(<SearchIntegrationWrapper />);
        const input = screen.getByPlaceholderText(/Search nodes/i);
        expect(input).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<SearchIntegrationWrapper isOpen={false} />);
        const input = screen.queryByPlaceholderText(/Search nodes/i);
        expect(input).not.toBeInTheDocument();
    });

    it('filters results correctly based on debounced search query', async () => {
        render(<SearchIntegrationWrapper />);
        const input = screen.getByPlaceholderText(/Search nodes/i);

        // Type 'App'
        fireEvent.change(input, { target: { value: 'App' } });
        expect(input).toHaveValue('App');

        // Results should not show instantly due to debounce
        expect(screen.queryByText('App.tsx')).not.toBeInTheDocument();

        // Fast-forward timers for debounce matching hook's configuration
        act(() => {
            jest.advanceTimersByTime(100);
        });

        // 'App' should be visible now in the path
        await waitFor(() => {
            expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
        });

        // The node label "App" should be in the document
        // We use queryAllByText because "App" might match the label and highlight text
        const appLabels = screen.queryAllByText('App');
        expect(appLabels.length).toBeGreaterThan(0);
    });

    it('allows clearing the query using the clear button', async () => {
        render(<SearchIntegrationWrapper />);
        const input = screen.getByPlaceholderText(/Search nodes/i);

        // Type search string
        fireEvent.change(input, { target: { value: 'Arch' } });
        act(() => {
            jest.advanceTimersByTime(100);
        });

        await waitFor(() => {
            expect(screen.getByTitle('Clear search')).toBeInTheDocument();
        });

        const clearButton = screen.getByTitle('Clear search');
        
        // Clear search
        fireEvent.click(clearButton);
        expect(input).toHaveValue('');
        
        // Let debounce run
        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Results should be cleared
        expect(screen.queryByText('src/ArchitectureGraph.tsx')).not.toBeInTheDocument();
    });

    it('supports mouse interactions for selecting and navigating to results', async () => {
        const { container } = render(<SearchIntegrationWrapper />);
        const input = screen.getByPlaceholderText(/Search nodes/i);

        // Type 'utilsHelpers' to match exactly
        fireEvent.change(input, { target: { value: 'utilsHelpers' } });
        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Wait until search results container is present
        await waitFor(() => {
            expect(container.querySelector('.search-results-container')).toBeInTheDocument();
            expect(container.querySelectorAll('.search-result-item').length).toBeGreaterThan(0);
        });
        
        // Find the specific result that contains our string
        const resultItems = Array.from(container.querySelectorAll('.search-result-item'));
        const targetContainer = resultItems.find(item => item.textContent?.includes('src/utils/helpers.ts'));

        expect(targetContainer).toBeDefined();

        // Mouse hover simulation
        if (targetContainer) {
            fireEvent.mouseEnter(targetContainer);
            expect(targetContainer).toHaveClass('selected');
            
            // Click to navigate
            fireEvent.click(targetContainer);
        }

        expect(screen.getByTestId('navigated-to')).toHaveTextContent('3');
    });
});
