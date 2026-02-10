
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClusterNode } from '../ClusterNode';

// Mock ReactFlow components since they require a Provider context
jest.mock('reactflow', () => ({
  Handle: () => <div data-testid="handle" />,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
  },
}));

describe('ClusterNode', () => {
  const mockNode = {
    id: 'cluster-1',
    data: {
      cluster: {
        id: 'cluster-1',
        label: 'src/utils',
        metrics: {
          nodeCount: 5,
          fileCount: 2,
          functionCount: 3,
          classCount: 0
        }
      },
      onExpand: jest.fn(),
    },
  };

  it('renders cluster label and node count', () => {
    render(<ClusterNode {...(mockNode as any)} />);
    expect(screen.getByText('src/utils')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onExpand when expand icon is clicked', () => {
    render(<ClusterNode {...(mockNode as any)} />);
    const expandButton = screen.getByTitle('Expand cluster');
    fireEvent.click(expandButton);
    expect(mockNode.data.onExpand).toHaveBeenCalledWith('cluster-1');
  });
});
