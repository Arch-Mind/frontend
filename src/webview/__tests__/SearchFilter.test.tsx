import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchFilter, { FilterState } from '../SearchFilter';

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
        render(<SearchFilter {...defaultProps} />);

        // Search input should be visible
        expect(screen.getByPlaceholderText(/Search nodes.../)).toBeInTheDocument();

        // Expanded section should not be visible
        expect(screen.queryByText('Filter by Type:')).not.toBeInTheDocument();
    });

    it('toggles expanded section when toggle button is clicked', () => {
        render(<SearchFilter {...defaultProps} />);

        const toggleBtn = screen.getByTitle('Toggle filters');
        fireEvent.click(toggleBtn);

        expect(screen.getByText('Filter by Type:')).toBeInTheDocument();

        fireEvent.click(toggleBtn);
        expect(screen.queryByText('Filter by Type:')).not.toBeInTheDocument();
    });

    it('expands and focuses input on Ctrl+F', () => {
        render(<SearchFilter {...defaultProps} />);

        fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

        expect(screen.getByText('Filter by Type:')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search nodes.../)).toHaveFocus();
    });

    it('updates search query and calls onFilterChange', () => {
        render(<SearchFilter {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Search nodes.../);
        fireEvent.change(input, { target: { value: 'test query' } });

        expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
            searchQuery: 'test query'
        }));

        expect(input).toHaveValue('test query');
    });

    it('updates path pattern and calls onFilterChange', () => {
        render(<SearchFilter {...defaultProps} />);

        // Expand first
        const toggleBtn = screen.getByTitle('Toggle filters');
        fireEvent.click(toggleBtn);

        const pathInput = screen.getByPlaceholderText('e.g., src/components/* or *.tsx');
        fireEvent.change(pathInput, { target: { value: '*.ts' } });

        expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
            pathPattern: '*.ts'
        }));

        expect(pathInput).toHaveValue('*.ts');
    });

    it('toggles node types and calls onFilterChange', () => {
        render(<SearchFilter {...defaultProps} />);

        // Expand first
        fireEvent.click(screen.getByTitle('Toggle filters'));

        // Find the "file" type button (it contains "file")
        const fileBtn = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'button' && content.includes('file');
        });

        fireEvent.click(fileBtn);

        expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
            nodeTypes: expect.objectContaining({
                file: false // Should toggle to false since default is true
            })
        }));
    });

    it('shows clear and focus buttons when active filters exist', () => {
        render(<SearchFilter {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Search nodes.../);
        fireEvent.change(input, { target: { value: 'something' } });

        expect(screen.getByTitle('Clear all filters')).toBeInTheDocument();
        expect(screen.getByTitle('Focus on filtered results')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', () => {
        render(<SearchFilter {...defaultProps} />);

        // Add a filter
        const input = screen.getByPlaceholderText(/Search nodes.../);
        fireEvent.change(input, { target: { value: 'something' } });

        const clearBtn = screen.getByTitle('Clear all filters');
        fireEvent.click(clearBtn);

        expect(input).toHaveValue('');
        expect(mockOnFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({
            searchQuery: '',
            pathPattern: ''
        }));
    });

    it('triggers onFocusSelection when focus button is clicked', () => {
        render(<SearchFilter {...defaultProps} />);

        // Add a filter to make focus button appear
        const input = screen.getByPlaceholderText(/Search nodes.../);
        fireEvent.change(input, { target: { value: 'something' } });

        const focusBtn = screen.getByTitle('Focus on filtered results');
        fireEvent.click(focusBtn);

        expect(mockOnFocusSelection).toHaveBeenCalled();
    });
});
