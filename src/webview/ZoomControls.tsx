/**
 * ZoomControls Component (Issue #20)
 * Displays zoom level indicator and preset buttons
 */

import React from 'react';
import { UseZoomPanReturn } from './useZoomPan';

export interface ZoomControlsProps {
    zoomPan: UseZoomPanReturn;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
    zoomPan,
    position = 'bottom-right',
}) => {
    const {
        zoomPercent,
        zoomIn,
        zoomOut,
        resetZoom,
        zoomToFit,
        presets,
        applyPreset,
        canZoomIn,
        canZoomOut,
    } = zoomPan;

    const [showPresets, setShowPresets] = React.useState(false);

    return (
        <div className={`zoom-controls zoom-controls-${position}`}>
            {/* Zoom Level Indicator */}
            <div 
                className="zoom-level-indicator"
                onClick={() => setShowPresets(!showPresets)}
                title="Click to show zoom presets"
            >
                <span className="zoom-icon">🔍</span>
                <span className="zoom-value">{zoomPercent}%</span>
                <span className="zoom-dropdown-icon">{showPresets ? '▲' : '▼'}</span>
            </div>

            {/* Presets Dropdown */}
            {showPresets && (
                <div className="zoom-presets-dropdown">
                    {presets.map((preset, index) => (
                        <button
                            key={index}
                            className="zoom-preset-btn"
                            onClick={() => {
                                applyPreset(preset);
                                setShowPresets(false);
                            }}
                        >
                            {preset.icon && <span className="preset-icon">{preset.icon}</span>}
                            <span className="preset-label">{preset.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Quick Controls */}
            <div className="zoom-quick-controls">
                <button
                    className="zoom-btn"
                    onClick={zoomOut}
                    disabled={!canZoomOut}
                    title="Zoom Out (Ctrl+−)"
                >
                    −
                </button>
                
                <button
                    className="zoom-btn"
                    onClick={resetZoom}
                    title="Reset Zoom (Ctrl+1)"
                >
                    ⊙
                </button>
                
                <button
                    className="zoom-btn"
                    onClick={zoomIn}
                    disabled={!canZoomIn}
                    title="Zoom In (Ctrl++)"
                >
                    +
                </button>
                
                <button
                    className="zoom-btn"
                    onClick={zoomToFit}
                    title="Fit to Screen (Ctrl+0)"
                >
                    ⊡
                </button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="zoom-shortcuts-hint">
                <div className="shortcut-line">
                    <kbd>Ctrl</kbd>+<kbd>+</kbd>/<kbd>−</kbd> Zoom
                </div>
                <div className="shortcut-line">
                    <kbd>Ctrl</kbd>+<kbd>0</kbd> Fit
                </div>
                <div className="shortcut-line">
                    <kbd>Shift</kbd>+Drag Pan
                </div>
            </div>
        </div>
    );
};
