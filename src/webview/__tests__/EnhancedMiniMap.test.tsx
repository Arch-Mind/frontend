
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedMiniMap, EnhancedMiniMapProps } from '../EnhancedMiniMap';
import { Node } from 'reactflow';

// Mock ReactFlow MiniMap since it uses ResizeObserver and other browser APIs
jest.mock('reactflow', () => ({
  MiniMap: ({ nodeColor, nodeClassName, onNodeClick, style }: any) => {
    const mockNodes = [
      { id: '1', type: 'file', data: { type: 'file', language: 'typescript' } },
      { id: '2', type: 'function', data: { type: 'function' } },
      { id: '3', type: 'class', data: { type: 'class' } },
    ];

    return (
      <div data-testid="minimap-mock" style={style}>
        {mockNodes.map((node) => (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            data-color={typeof nodeColor === 'function' ? nodeColor(node) : nodeColor}
            className={typeof nodeClassName === 'function' ? nodeClassName(node) : nodeClassName}
            onClick={(e) => onNodeClick && onNodeClick(e, node)}
          >
            Node {node.id}
          </div>
        ))}
      </div>
    );
  },
}));

describe('EnhancedMiniMap', () => {
  const defaultProps: EnhancedMiniMapProps = {
    selectedNodeId: null,
    hoveredNodeId: null,
    nodeColors: {},
    position: 'bottom-right',
    onNodeClick: jest.fn(),
  };

  it('renders without crashing', () => {
    render(<EnhancedMiniMap {...defaultProps} />);
    expect(screen.getByTestId('minimap-mock')).toBeInTheDocument();
  });

  it('applies correct colors to nodes based on type', () => {
    render(<EnhancedMiniMap {...defaultProps} />);
    const fileNode = screen.getByTestId('node-1');
    expect(fileNode).toHaveAttribute('data-color', '#3498db');
  });

  it('highlights selected node with specific color', () => {
    render(<EnhancedMiniMap {...defaultProps} selectedNodeId="1" />);
    const selectedNode = screen.getByTestId('node-1');
    expect(selectedNode).toHaveAttribute('data-color', '#f39c12');
  });

  it('handles node clicks', () => {
    const onNodeClick = jest.fn();
    render(<EnhancedMiniMap {...defaultProps} onNodeClick={onNodeClick} />);
    const node = screen.getByTestId('node-1');
    fireEvent.click(node);
    expect(onNodeClick).toHaveBeenCalled();
  });
});
