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
 * Calculate relationships for a node
 */
function calculateRelationships(
    nodeId: string,
    nodes: Node[],
    edges: Edge[]
): RelationshipInfo {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const currentNode = nodeMap.get(nodeId);
    
    if (!currentNode) {
        return { children: [], siblings: [], ancestors: [], descendants: [] };
    }

    // Find parent
    const parent = currentNode.parentId ? nodeMap.get(currentNode.parentId) : undefined;

    // Find children (nodes with this node as parent)
    const children = nodes.filter(n => n.parentId === nodeId);

    // Find siblings (nodes with same parent)
    const siblings = currentNode.parentId
        ? nodes.filter(n => n.parentId === currentNode.parentId && n.id !== nodeId)
        : [];

    // Find ancestors (walk up parent chain)
    const ancestors: Node[] = [];
    let currentParentId = currentNode.parentId;
    while (currentParentId) {
        const ancestorNode = nodeMap.get(currentParentId);
        if (!ancestorNode) break;
        ancestors.push(ancestorNode);
        currentParentId = ancestorNode.parentId;
    }

    // Find descendants (walk down children)
    const descendants: Node[] = [];
    const visited = new Set<string>();
    
    const findDescendants = (parentId: string) => {
        const childNodes = nodes.filter(n => n.parentId === parentId);
        childNodes.forEach(child => {
            if (!visited.has(child.id)) {
                visited.add(child.id);
                descendants.push(child);
                findDescendants(child.id);
            }
        });
    };
    
    findDescendants(nodeId);

    return {
        parent,
        children,
        siblings,
        ancestors,
        descendants,
    };
}

/**
 * Get icon for node type
 */
function getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
        file: '📄',
        directory: '📁',
        function: 'ƒ',
        class: '◆',
        module: '📦',
    };
    return icons[type] || '•';
}

/**
 * Relationship strength based on connection count
 */
function getRelationshipStrength(count: number): 'weak' | 'medium' | 'strong' {
    if (count >= 5) return 'strong';
    if (count >= 2) return 'medium';
    return 'weak';
}

export const RelationshipVisualizer: React.FC<RelationshipVisualizerProps> = ({
    selectedNodeId,
    nodes,
    edges,
    onNodeClick,
    onClose,
}) => {
    const relationships = useMemo(() => {
        if (!selectedNodeId) return null;
        return calculateRelationships(selectedNodeId, nodes, edges);
    }, [selectedNodeId, nodes, edges]);

    const selectedNode = useMemo(() => {
        return nodes.find(n => n.id === selectedNodeId);
    }, [selectedNodeId, nodes]);

    if (!selectedNodeId || !relationships || !selectedNode) {
        return null;
    }

    const { parent, children, siblings, ancestors, descendants } = relationships;

    const totalRelationships =
        (parent ? 1 : 0) +
        children.length +
        siblings.length +
        ancestors.length +
        descendants.length;

    return (
        <div className="relationship-visualizer">
            <div className="relationship-header">
                <div className="relationship-title">
                    <span className="relationship-icon">🔗</span>
                    <span>Relationships</span>
                </div>
                <button className="relationship-close-btn" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            <div className="relationship-summary">
                <div className="selected-node-info">
                    <span className="node-type-icon">{getNodeIcon(selectedNode.type)}</span>
                    <div className="node-details">
                        <div className="node-name">{selectedNode.id}</div>
                        <div className="node-type-label">{selectedNode.type}</div>
                    </div>
                </div>
                <div className="relationship-count">
                    {totalRelationships} relationship{totalRelationships !== 1 ? 's' : ''}
                </div>
            </div>

            <div className="relationship-sections">
                {/* Parent Section */}
                {parent && (
                    <div className="relationship-section">
                        <div className="section-header">
                            <span className="section-icon">⬆️</span>
                            <span className="section-title">Parent</span>
                            <span className="section-badge">1</span>
                        </div>
                        <div className="relationship-items">
                            <RelationshipNode
                                node={parent}
                                relationshipType="parent"
                                onClick={onNodeClick}
                            />
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
 * Individual relationship node item
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
    const handleClick = () => {
        onClick?.(node.id);
    };

    const indent = depth ? depth * 12 : 0;

    return (
        <div
            className={`relationship-node relationship-${relationshipType}`}
            style={{ marginLeft: `${indent}px` }}
            onClick={handleClick}
        >
            <div className="rel-node-connector"></div>
            <span className="rel-node-icon">{getNodeIcon(node.type)}</span>
            <div className="rel-node-content">
                <div className="rel-node-name">{node.id}</div>
                <div className="rel-node-type">{node.type}</div>
            </div>
            {depth && <span className="rel-node-depth">Level {depth}</span>}
        </div>
    );
};
