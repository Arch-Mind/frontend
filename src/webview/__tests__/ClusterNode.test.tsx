import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from 'reactflow';
import { ClusterNode } from '../ClusterNode';

describe('ClusterNode', () => {
  const cluster = {
    id: 'cluster-1',
    label: 'Cluster A',
    path: '/root/cluster-a',
    nodes: [],
    metrics: { nodeCount: 5, fileCount: 2, functionCount: 0, classCount: 0 },
    depth: 1,
  };
  const onExpand = jest.fn();
  const data = { cluster, onExpand };
  const nodeProps = {
    id: 'cluster-1',
    type: 'cluster',
    data,
    xPos: 0,
    yPos: 0,
    selected: false,
    zIndex: 0,
    isConnectable: false,
    dragHandle: undefined,
    dragging: false,
    sourcePosition: undefined,
    targetPosition: undefined,
  };

  const renderWithProvider = (component: React.ReactNode) => {
    return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
  };

  it('renders cluster label and node count', () => {
    renderWithProvider(<ClusterNode {...nodeProps} />);
    expect(screen.getByText('Cluster A')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onExpand when expand icon is clicked', () => {
    renderWithProvider(<ClusterNode {...nodeProps} />);
    const button = screen.getByTitle('Expand cluster');
    fireEvent.click(button);
    expect(onExpand).toHaveBeenCalled();
  });
});
