
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RelationshipVisualizer } from '../RelationshipVisualizer';

const mockNode = {
  id: '1',
  type: 'function',
  parentId: undefined,
  filePath: '/path/to/file',
};

describe('RelationshipVisualizer', () => {
  it('renders summary and no relationships message', () => {
    render(
      <RelationshipVisualizer
        selectedNodeId="1"
        nodes={[mockNode] as any}
        edges={[]}
        onNodeClick={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Relationships')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/No relationships found/i)).toBeInTheDocument();
  });

  it('renders parent and children correctly', () => {
    const nodes = [
      { id: 'parent-1', type: 'file' },
      { id: 'selected-1', type: 'function', parentId: 'parent-1' },
      { id: 'child-1', type: 'function', parentId: 'selected-1' },
    ];

    render(
      <RelationshipVisualizer
        selectedNodeId="selected-1"
        nodes={nodes as any}
        edges={[]}
        onNodeClick={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/Parent: parent-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Children: child-1/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});