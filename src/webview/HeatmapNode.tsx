import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';

interface HeatmapNodeData {
    label: string;
    heatmapTooltip?: string;
    type?: string;
}

export const HeatmapNode: React.FC<NodeProps<HeatmapNodeData>> = ({ data }) => {
    return (
        <div className="heatmap-node" title={data.heatmapTooltip || ''}>
            <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
            <div className="heatmap-node-content">
                <div className="heatmap-node-label">{data.label}</div>
                {data.type && <div className="heatmap-node-type">{data.type}</div>}
            </div>
            <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
        </div>
    );
};
