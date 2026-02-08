import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RelationshipVisualizer } from '../RelationshipVisualizer';

describe('RelationshipVisualizer', () => {
  it('renders relationship visualizer panel', () => {
    render(
      <RelationshipVisualizer selectedNodeId="1" nodes={[]} edges={[]} onClose={jest.fn()} />
    );
    expect(screen.getByText(/relationship/i)).toBeInTheDocument();
  });
});
