/**
 * Relationship Visualizer Component (Issue #21)
 * Visualizes parent-child and sibling relationships between nodes
 */

import React, { useMemo } from 'react';

export interface Node {
    id: string;
    type: string;
    parentId?: string;
    filePath?: string;
}

export interface Edge {
    id: string;
    source: string;
    target: string;
    type: string;
}

export interface RelationshipInfo {
    parent?: Node;
    children: Node[];
    siblings: Node[];
    ancestors: Node[];
    descendants: Node[];
}

export interface RelationshipVisualizerProps {
    selectedNodeId: string | null;
    nodes: Node[];
    edges: Edge[];
    onNodeClick?: (nodeId: string) => void;
    onClose: () => void;
}

/**
/**
 * RelationshipVisualizer component
 * --------------------------------
 * Visualizes the relationships (parents, children, siblings, ancestors, descendants) of a given node.
 * Provides interactive sections for each relationship type, allowing users to explore the node's context in the graph.
 *
 * Props:
 * - node: The current node being visualized.
 * - relationships: Object containing arrays of related nodes by type.
 * - onNodeClick: Handler for clicking a related node.
 */
export const RelationshipVisualizer: React.FC<RelationshipVisualizerProps> = ({
    node,
    relationships,
    onNodeClick,
}) => {
    // Destructure relationship arrays from the relationships prop
    const { parents, children, siblings, ancestors, descendants } = relationships;
    // Calculate total number of relationships
    const totalRelationships =
        parents.length + children.length + siblings.length + ancestors.length + descendants.length;

    /**
     * Returns a string representing the strength of a relationship based on count.
     * Used for descendants section indicator.
     */
    function getRelationshipStrength(count: number): string {
        if (count > 20) return 'strong';
        if (count > 10) return 'medium';
        if (count > 0) return 'weak';
        return 'none';
    }

    /**
     * Returns an icon for a node type.
     * Used in RelationshipNode.
     */
    function getNodeIcon(type: string): string {
        switch (type) {
            case 'class':
                return '📦';
            case 'function':
                return '🔧';
            case 'interface':
                return '🔗';
            default:
                return '🔹';
        }
    }

    return (
        <div className="relationship-visualizer">
            <div className="relationship-summary">
                {/* Summary Section: Shows counts for each relationship type */}
                <div className="summary-header">
                    <span className="summary-title">Relationships</span>
                    <span className="summary-badge">{totalRelationships}</span>
                </div>
                <div className="summary-items">
                    <div className="summary-item">
                        <span className="summary-label">Parents</span>
                        <span className="summary-value">{parents.length}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Children</span>
                        <span className="summary-value">{children.length}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Siblings</span>
                        <span className="summary-value">{siblings.length}</span>
                    </div>
                </div>
            </div>

            {/* Parents Section: Lists parent nodes */}
            {parents.length > 0 && (
                <div className="relationship-section">
                    <div className="section-header">
                        <span className="section-icon">⬆️</span>
                        <span className="section-title">Parents</span>
                        <span className="section-badge">{parents.length}</span>
                    </div>
                    <div className="relationship-items">
                        {parents.map(parent => (
                            <RelationshipNode
                                key={parent.id}
                                node={parent}
                                relationshipType="parent"
                                onClick={onNodeClick}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Children Section: Lists child nodes */}
            {children.length > 0 && (
                <div className="relationship-section">
                    <div className="section-header">
                        <span className="section-icon">⬇️</span>
                        <span className="section-title">Children</span>
                        <span className="section-badge">{children.length}</span>
                    </div>
                    <div className="relationship-items">
                        {children.map(child => (
                            <RelationshipNode
                                key={child.id}
                                node={child}
                                relationshipType="child"
                                onClick={onNodeClick}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Siblings Section: Lists sibling nodes */}
            {siblings.length > 0 && (
                <div className="relationship-section">
                    <div className="section-header">
                        <span className="section-icon">↔️</span>
                        <span className="section-title">Siblings</span>
                        <span className="section-badge">{siblings.length}</span>
                    </div>
                    <div className="relationship-items">
                        {siblings.map(sibling => (
                            <RelationshipNode
                                key={sibling.id}
                                node={sibling}
                                relationshipType="sibling"
                                onClick={onNodeClick}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Ancestors Section: Lists ancestor nodes with depth */}
            {ancestors.length > 0 && (
                <div className="relationship-section">
                    <div className="section-header">
                        <span className="section-icon">⏫</span>
                        <span className="section-title">Ancestors</span>
                        <span className="section-badge">{ancestors.length}</span>
                    </div>
                    <div className="relationship-items">
                        {ancestors.map((node, index) => (
                            <RelationshipNode
                                key={node.id}
                                node={node}
                                relationshipType="ancestor"
                                depth={index + 1}
                                onClick={onNodeClick}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Descendants Section: Lists descendant nodes, shows strength indicator, limits to 10 with overflow */}
            {descendants.length > 0 && (
                <div className="relationship-section">
                    <div className="section-header">
                        <span className="section-icon">⏬</span>
                        <span className="section-title">Descendants</span>
                        <span className="section-badge">{descendants.length}</span>
                        <span className={`strength-indicator strength-${getRelationshipStrength(descendants.length)}`}>
                            {getRelationshipStrength(descendants.length)}
                        </span>
                    </div>
                    <div className="relationship-items">
                        {descendants.slice(0, 10).map(node => (
                            <RelationshipNode
                                key={node.id}
                                node={node}
                                relationshipType="descendant"
                                onClick={onNodeClick}
                            />
                        ))}
                        {descendants.length > 10 && (
                            <div className="more-items">
                                +{descendants.length - 10} more...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* No relationships fallback */}
            {totalRelationships === 0 && (
                <div className="no-relationships">
                    <span className="no-rel-icon">🔍</span>
                    <span className="no-rel-text">No relationships found</span>
                </div>
            )}
        </div>
    );
};
                        </div>
                    </div>
                )}

                {/* Children Section */}
                {children.length > 0 && (
                    <div className="relationship-section">
                        <div className="section-header">
                            <span className="section-icon">⬇️</span>
                            <span className="section-title">Children</span>
                            <span className="section-badge">{children.length}</span>
                            <span className={`strength-indicator strength-${getRelationshipStrength(children.length)}`}>
                                {getRelationshipStrength(children.length)}
                            </span>
                        </div>
                        <div className="relationship-items">
                            {children.map(node => (
                                <RelationshipNode
                                    key={node.id}
                                    node={node}
                                    relationshipType="child"
                                    onClick={onNodeClick}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Siblings Section */}
                {siblings.length > 0 && (
                    <div className="relationship-section">
                        <div className="section-header">
                            <span className="section-icon">↔️</span>
                            <span className="section-title">Siblings</span>
                            <span className="section-badge">{siblings.length}</span>
                        </div>
                        <div className="relationship-items">
                            {siblings.map(node => (
                                <RelationshipNode
                                    key={node.id}
                                    node={node}
                                    relationshipType="sibling"
                                    onClick={onNodeClick}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Ancestors Section */}
                {ancestors.length > 0 && (
                    <div className="relationship-section">
                        <div className="section-header">
                            <span className="section-icon">⏫</span>
                            <span className="section-title">Ancestors</span>
                            <span className="section-badge">{ancestors.length}</span>
                        </div>
                        <div className="relationship-items">
                            {ancestors.map((node, index) => (
                                <RelationshipNode
                                    key={node.id}
                                    node={node}
                                    relationshipType="ancestor"
                                    depth={index + 1}
                                    onClick={onNodeClick}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Descendants Section */}
                {descendants.length > 0 && (
                    <div className="relationship-section">
                        <div className="section-header">
                            <span className="section-icon">⏬</span>
                            <span className="section-title">Descendants</span>
                            <span className="section-badge">{descendants.length}</span>
                            <span className={`strength-indicator strength-${getRelationshipStrength(descendants.length)}`}>
                                {getRelationshipStrength(descendants.length)}
                            </span>
                        </div>
                        <div className="relationship-items">
                            {descendants.slice(0, 10).map(node => (
                                <RelationshipNode
                                    key={node.id}
                                    node={node}
                                    relationshipType="descendant"
                                    onClick={onNodeClick}
                                />
                            ))}
                            {descendants.length > 10 && (
                                <div className="more-items">
                                    +{descendants.length - 10} more...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {totalRelationships === 0 && (
                    <div className="no-relationships">
                        <span className="no-rel-icon">🔍</span>
                        <span className="no-rel-text">No relationships found</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * RelationshipNode component
 * -------------------------
 * Renders an individual node in a relationship list (parent, child, sibling, ancestor, descendant).
 * Shows node icon, name, type, and (optionally) depth/level for ancestors.
 *
 * Props:
 * - node: The node to display.
 * - relationshipType: The type of relationship (for styling).
 * - depth: Optional depth/level (for ancestors).
 * - onClick: Optional handler for node click.
 */
interface RelationshipNodeProps {
    node: Node;
    relationshipType: 'parent' | 'child' | 'sibling' | 'ancestor' | 'descendant';
    depth?: number;
    onClick?: (nodeId: string) => void;
}

const RelationshipNode: React.FC<RelationshipNodeProps> = ({
    node,
    relationshipType,
    depth,
    onClick,
}) => {
    // Handle click on node, call parent handler if provided
    const handleClick = () => {
        onClick?.(node.id);
    };

    // Indent based on depth (for ancestor tree visualization)
    const indent = depth ? depth * 12 : 0;

    return (
        <div
            className={`relationship-node relationship-${relationshipType}`}
            style={{ marginLeft: `${indent}px` }}
            onClick={handleClick}
        >
            <div className="rel-node-connector"></div>
            {/* Node type icon */}
            <span className="rel-node-icon">{getNodeIcon(node.type)}</span>
            <div className="rel-node-content">
                <div className="rel-node-name">{node.id}</div>
                <div className="rel-node-type">{node.type}</div>
            </div>
            {/* Show depth/level for ancestors */}
            {depth && <span className="rel-node-depth">Level {depth}</span>}
        </div>
    );
};
