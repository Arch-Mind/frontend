import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RelationshipVisualizer } from '../RelationshipVisualizer';

describe('RelationshipVisualizer', () => {
  it('renders relationship visualizer panel', () => {
    // Mock nodes and edges to ensure content is rendered
    const nodes = [{ id: '1', type: 'file' }];
    render(
      <RelationshipVisualizer
        selectedNodeId="1"
        nodes={nodes as any}
        edges={[]}
        onClose={jest.fn()}
      />
    );
    // Look for the "Relationships" title specifically
    expect(screen.getByText('Relationships')).toBeInTheDocument();
  });
});
