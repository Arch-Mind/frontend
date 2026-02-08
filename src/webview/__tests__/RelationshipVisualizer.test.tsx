// Unit tests for RelationshipVisualizer component

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RelationshipVisualizer } from '../RelationshipVisualizer';

describe('RelationshipVisualizer', () => {
  // Test suite for RelationshipVisualizer functionality
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
  // Test: renders relationship graph and handles empty state
  
  it('renders relationship graph', () => {
    render(<RelationshipVisualizer nodes={[]} edges={[]} selectedNodeId="1" onClose={jest.fn()} />);
    expect(screen.getByText('No relationships found')).toBeInTheDocument();
  });
});
