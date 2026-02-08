import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchBar } from '../SearchBar';

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
