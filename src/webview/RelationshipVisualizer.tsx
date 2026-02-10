
import React from 'react';

/**
 * Represents a code entity in the architecture graph.
 */
export interface Node {
  id: string;      /** Unique identifier (usually the file path or symbol name) */
  type: string;    /** The type of node (e.g., 'file', 'function', 'class') */
  parentId?: string; /** Reference to the parent node for hierarchy */
  filePath?: string; /** Absolute path to the source file */
}

/**
 * Represents a relationship between two code entities.
 */
export interface Edge {
  id: string;      /** Unique edge identifier */
  source: string;  /** ID of the source node */
  target: string;  /** ID of the target node */
  type: string;    /** Type of relationship (e.g., 'CALLS', 'CONTAINS', 'IMPORTS') */
}

/**
 * Props for the RelationshipVisualizer component.
 */
interface RelationshipVisualizerProps {
  selectedNodeId: string; /** Currently selected node ID for which to show relationships */
  nodes: Node[];          /** Array of all nodes in the graph */
  edges: Edge[];          /** Array of all edges in the graph */
  onNodeClick: (nodeId: string) => void; /** Callback when a related node is clicked */
  onClose: () => void;    /** Callback to close the visualizer panel */
}

/**
 * Component to visualize the immediate relationships (parent, children, siblings) 
 * of a selected node. Used for Issue #21 and Epic 3.
 * 
 * @param props - The component props
 * @returns A JSX element containing the relationship summary
 */
export function RelationshipVisualizer({
  selectedNodeId,
  nodes,
  edges,
  onNodeClick,
  onClose
}: RelationshipVisualizerProps) {
  // Compute relationships
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const parent = selectedNode && selectedNode.parentId ? nodes.find(n => n.id === selectedNode.parentId) : undefined;
  const children = nodes.filter(n => n.parentId === selectedNodeId);
  const siblings = selectedNode && selectedNode.parentId
    ? nodes.filter(n => n.parentId === selectedNode.parentId && n.id !== selectedNodeId)
    : [];
  // For demo: ancestors, descendants, totalRelationships
  const ancestors: Node[] = [];
  const descendants: Node[] = [];
  const totalRelationships = (parent ? 1 : 0) + children.length + siblings.length;

  return (
    <div className="relationship-visualizer">
      <div className="summary">
        <span className="summary-label">Relationships</span>
        <span className="summary-value">{totalRelationships}</span>
        <button onClick={onClose}>Close</button>
      </div>
      {parent && (
        <div className="relationship-section">
          <span>Parent: {parent.id}</span>
        </div>
      )}
      {children.length > 0 && (
        <div className="relationship-section">
          <span>Children: {children.map(c => c.id).join(', ')}</span>
        </div>
      )}
      {siblings.length > 0 && (
        <div className="relationship-section">
          <span>Siblings: {siblings.map(s => s.id).join(', ')}</span>
        </div>
      )}
      {totalRelationships === 0 && (
        <div className="no-relationships">
          <span className="no-rel-text">No relationships found</span>
        </div>
      )}
    </div>
  );
}

