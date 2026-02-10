import React from 'react';
import { NodeProps } from 'reactflow';

interface HeatmapNodeData {
    label: string;
    heatmapTooltip?: string;
}

export const HeatmapNode: React.FC<NodeProps<HeatmapNodeData>> = ({ data }) => {
    return (
        <div className="heatmap-node" title={data.heatmapTooltip || ''}>
            {data.label}
        </div>
    );
};
