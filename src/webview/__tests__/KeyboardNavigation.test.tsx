
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useKeyboardNavigation } from '../KeyboardNavigation';

// Helper component to test the hook
const TestComponent = ({ options }: { options: any }) => {
  useKeyboardNavigation(options);
  return <div data-testid="test-div">Keyboard Navigation Test</div>;
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
    render(<TestComponent options={defaultOptions} />);

    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(defaultOptions.onNodeSelect).toHaveBeenCalledWith('node-2');
  });

  it('calls onNodeActivate when Enter is pressed', () => {
    render(<TestComponent options={defaultOptions} />);

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(defaultOptions.onNodeActivate).toHaveBeenCalledWith('node-1');
  });

  it('calls onFocusSearch when / is pressed', () => {
    render(<TestComponent options={defaultOptions} />);

    fireEvent.keyDown(window, { key: '/' });

    expect(defaultOptions.onFocusSearch).toHaveBeenCalled();
  });
});
