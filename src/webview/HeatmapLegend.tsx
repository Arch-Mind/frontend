import React from 'react';
import { formatHeatmapMetric, getHeatmapColor, HeatmapMode } from './heatmapUtils';

interface HeatmapLegendProps {
    mode: HeatmapMode;
    minMetric: number;
    maxMetric: number;
}

export const HeatmapLegend: React.FC<HeatmapLegendProps> = ({ mode, minMetric, maxMetric }) => {
    if (mode === 'off' || maxMetric <= 0) {
        return null;
    }

    const steps = [0.1, 0.5, 1];
    const labels = steps.map((step) => {
        const metric = minMetric + (maxMetric - minMetric) * step;
        return formatHeatmapMetric(mode, metric);
    });

    return (
        <div className="heatmap-legend">
            <div className="heatmap-legend-title">Heatmap: {labelForMode(mode)}</div>
            <div className="heatmap-legend-scale">
                {steps.map((step, index) => {
                    const metric = minMetric + (maxMetric - minMetric) * step;
                    return (
                        <div key={step} className="heatmap-legend-step">
                            <span
                                className="heatmap-legend-swatch"
                                style={{ backgroundColor: getHeatmapColor(metric, maxMetric) }}
                            />
                            <span className="heatmap-legend-label">{labels[index]}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

function labelForMode(mode: HeatmapMode): string {
    switch (mode) {
        case 'commit_count':
            return 'Commit Count';
        case 'last_modified':
            return 'Last Modified';
        case 'author_count':
            return 'Author Count';
        default:
            return 'Off';
    }
}
