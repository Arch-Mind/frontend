/**
 * Impact Analysis Component (Issue #15)
 * Visualizes the impact radius when a node is selected
 */

import React, { useState, useEffect } from 'react';

export interface ImpactNode {
    nodeId: string;
    distance: number; // Hops from source
    impactType: 'direct' | 'indirect';
}

export interface ImpactAnalysisData {
    sourceNodeId: string;
    affectedNodes: ImpactNode[];
    maxDepth: number;
    totalImpact: number;
}

export interface ImpactAnalysisProps {
    data: ImpactAnalysisData | null;
    onClose: () => void;
    onNodeClick?: (nodeId: string) => void;
}

export const ImpactAnalysisPanel: React.FC<ImpactAnalysisProps> = ({
    data,
    onClose,
    onNodeClick,
}) => {
    const [expandedDepth, setExpandedDepth] = useState<number | null>(null);

    if (!data) return null;

    // Group nodes by distance
    const nodesByDistance = new Map<number, ImpactNode[]>();
    data.affectedNodes.forEach(node => {
        const group = nodesByDistance.get(node.distance) || [];
        group.push(node);
        nodesByDistance.set(node.distance, group);
    });

    // Get color for distance level
    const getDistanceColor = (distance: number): string => {
        const colors = [
            '#e74c3c', // Red - 1 hop
            '#e67e22', // Orange - 2 hops
            '#f39c12', // Yellow - 3 hops
            '#3498db', // Blue - 4+ hops
        ];
        return colors[Math.min(distance - 1, colors.length - 1)];
    };

    return (
        <div className="impact-analysis-panel">
            <div className="impact-header">
                <div className="impact-title">
                    <span className="impact-icon">💥</span>
                    <span>Impact Analysis</span>
                </div>
                <button className="impact-close-btn" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            <div className="impact-summary">
                <div className="impact-stat">
                    <span className="stat-label">Total Impact:</span>
                    <span className="stat-value">{data.totalImpact} nodes</span>
                </div>
                <div className="impact-stat">
                    <span className="stat-label">Max Distance:</span>
                    <span className="stat-value">{data.maxDepth} hops</span>
                </div>
            </div>

            <div className="impact-legend">
                <div className="legend-title">Impact Levels:</div>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#e74c3c' }}></div>
                        <span>1 hop (Direct)</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#e67e22' }}></div>
                        <span>2 hops</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#f39c12' }}></div>
                        <span>3 hops</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#3498db' }}></div>
                        <span>4+ hops</span>
                    </div>
                </div>
            </div>

            <div className="impact-levels">
                {Array.from(nodesByDistance.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([distance, nodes]) => (
                        <div key={distance} className="impact-level">
                            <div
                                className="impact-level-header"
                                onClick={() => setExpandedDepth(expandedDepth === distance ? null : distance)}
                            >
                                <div
                                    className="level-indicator"
                                    style={{ backgroundColor: getDistanceColor(distance) }}
                                ></div>
                                <div className="level-info">
                                    <span className="level-distance">{distance} hop{distance > 1 ? 's' : ''}</span>
                                    <span className="level-count">{nodes.length} node{nodes.length > 1 ? 's' : ''}</span>
                                </div>
                                <span className="level-toggle">{expandedDepth === distance ? '▼' : '▶'}</span>
                            </div>

                            {expandedDepth === distance && (
                                <div className="impact-level-nodes">
                                    {nodes.map(node => (
                                        <div
                                            key={node.nodeId}
                                            className="impact-node-item"
                                            onClick={() => onNodeClick?.(node.nodeId)}
                                        >
                                            <span className="node-type-badge">
                                                {node.impactType === 'direct' ? '→' : '⤷'}
                                            </span>
                                            <span className="node-id">{node.nodeId}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
            </div>

            <div className="impact-actions">
                <button className="impact-btn" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

/**
 * Hook for fetching impact analysis data
 */
export function useImpactAnalysis(
    nodeId: string | null,
    depth: number = 3
): {
    data: ImpactAnalysisData | null;
    isLoading: boolean;
    error: string | null;
    fetchImpact: (nodeId: string) => Promise<void>;
} {
    const [data, setData] = useState<ImpactAnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchImpact = async (targetNodeId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Call backend API
            const response = await fetch(
                `https://graph-engine-production-90f5.up.railway.app/api/impact/${encodeURIComponent(targetNodeId)}?depth=${depth}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Transform to our format
            const impactData: ImpactAnalysisData = {
                sourceNodeId: targetNodeId,
                affectedNodes: result.affected_nodes?.map((node: any) => ({
                    nodeId: node.node_id || node.id,
                    distance: node.distance || 1,
                    impactType: node.distance === 1 ? 'direct' : 'indirect',
                })) || [],
                maxDepth: result.max_depth || depth,
                totalImpact: result.total_impact || result.affected_nodes?.length || 0,
            };

            setData(impactData);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch impact analysis';
            setError(errorMsg);
            console.error('Impact analysis error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (nodeId) {
            fetchImpact(nodeId);
        }
    }, [nodeId, depth]);

    return { data, isLoading, error, fetchImpact };
}

