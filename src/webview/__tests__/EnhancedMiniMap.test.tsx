import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedMiniMap, EnhancedMiniMapProps } from '../EnhancedMiniMap';
import { Node } from 'reactflow';

// Mock ReactFlow MiniMap since it uses ResizeObserver and other browser APIs
jest.mock('reactflow', () => ({
  MiniMap: ({ nodeColor, nodeClassName, onNodeClick, style }: any) => {
    // Render a mock container that uses the passed functions to render "nodes"
    // so we can test the logic of nodeColor and nodeClassName
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
    
    // File node (blue by default)
    const fileNode = screen.getByTestId('node-1');
    expect(fileNode).toHaveAttribute('data-color', '#3498db');

    // Function node (green by default)
    const funcNode = screen.getByTestId('node-2');
    expect(funcNode).toHaveAttribute('data-color', '#2ecc71');

    // Class node (orange by default)
    const classNode = screen.getByTestId('node-3');
    expect(classNode).toHaveAttribute('data-color', '#e67e22');
  });

  it('highlights selected node with specific color', () => {
    render(<EnhancedMiniMap {...defaultProps} selectedNodeId="1" />);
    
    const selectedNode = screen.getByTestId('node-1');
    // Expected highlight color for selected node
    expect(selectedNode).toHaveAttribute('data-color', '#f39c12');
  });

  it('highlights hovered node with specific color', () => {
    render(<EnhancedMiniMap {...defaultProps} hoveredNodeId="2" />);
    
    const hoveredNode = screen.getByTestId('node-2');
    // Expected highlight color for hovered node
    expect(hoveredNode).toHaveAttribute('data-color', '#e74c3c');
  });

  it('applies correct class names for styling', () => {
    render(<EnhancedMiniMap {...defaultProps} selectedNodeId="1" hoveredNodeId="2" />);
    
    const selectedNode = screen.getByTestId('node-1');
    expect(selectedNode).toHaveClass('minimap-node');
    expect(selectedNode).toHaveClass('minimap-node-selected');
    expect(selectedNode).toHaveClass('minimap-node-file');

    const hoveredNode = screen.getByTestId('node-2');
    expect(hoveredNode).toHaveClass('minimap-node');
    expect(hoveredNode).toHaveClass('minimap-node-hovered');
    expect(hoveredNode).toHaveClass('minimap-node-function');
  });

  it('handles node clicks', () => {
    const onNodeClick = jest.fn();
    render(<EnhancedMiniMap {...defaultProps} onNodeClick={onNodeClick} />);
    
    const node = screen.getByTestId('node-1');
    fireEvent.click(node);
    
    expect(onNodeClick).toHaveBeenCalledTimes(1);
    // onNodeClick is called with (event, node)
    expect(onNodeClick).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: '1' }));
  });
});
