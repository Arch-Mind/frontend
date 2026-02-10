// Unit tests for SearchBar component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchBar } from '../SearchBar';

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
      const [query, setQuery] = React.useState('');
      return (
        <SearchBar {...defaultProps} query={query} onQueryChange={setQuery} />
      );
    }
    render(<Wrapper />);
    const input = screen.getByPlaceholderText(/search nodes/i);
    fireEvent.change(input, { target: { value: 'test' } });
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
        type: 'file' as const,
        filePath: '/path/to/FileA',
      },
      score: 0.95,
      matchedFields: ['label'],
      highlights: [],
    }];
    render(
      <SearchBar
        {...defaultProps}
        results={results}
        onNavigateToResult={onNavigateToResult}
        onSelectResult={onSelectResult}
        query={'FileA'}
      />
    );
    const resultItem = screen.getByText('FileA');
    fireEvent.click(resultItem);
    expect(onNavigateToResult).toHaveBeenCalled();
  });
});
