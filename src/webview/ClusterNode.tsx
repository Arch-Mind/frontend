/**
 * ClusterNode Component (Issue #11)
 * Displays a collapsed cluster with metrics and expand button
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Cluster } from './clustering';

export interface ClusterNodeData {
    cluster: Cluster;
    onExpand: (clusterId: string) => void;
}

export function ClusterNode({ data }: NodeProps<ClusterNodeData>) {
    const { cluster, onExpand } = data;
    const { label, metrics } = cluster;

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        onExpand(cluster.id);
    };

    return (
        <div className="cluster-node">
            <Handle type="target" position={Position.Top} />
            
            <div className="cluster-header">
                <div className="cluster-icon">📁</div>
                <div className="cluster-title">{label}</div>
            </div>
            
            <div className="cluster-metrics">
                <div className="metric">
                    <span className="metric-label">Nodes:</span>
                    <span className="metric-value">{metrics.nodeCount}</span>
                </div>
                {metrics.fileCount > 0 && (
                    <div className="metric">
                        <span className="metric-label">Files:</span>
                        <span className="metric-value">{metrics.fileCount}</span>
                    </div>
                )}
                {metrics.functionCount > 0 && (
                    <div className="metric">
                        <span className="metric-label">Functions:</span>
                        <span className="metric-value">{metrics.functionCount}</span>
                    </div>
                )}
                {metrics.classCount > 0 && (
                    <div className="metric">
                        <span className="metric-label">Classes:</span>
                        <span className="metric-value">{metrics.classCount}</span>
                    </div>
                )}
            </div>
            
            <button 
                className="cluster-expand-button" 
                onClick={handleExpand}
                title="Expand cluster"
            >
                Expand ▶
            </button>
            
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}
