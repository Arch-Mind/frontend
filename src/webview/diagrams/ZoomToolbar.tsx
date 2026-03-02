// src/webview/diagrams/ZoomToolbar.tsx
import React, { useCallback, useState } from "react";
import { useReactFlow, type Viewport } from "reactflow";

export function ZoomToolbar({
    fitPadding = 0.05,
    minZoom = 0.03,
    maxZoom = 3,
}: {
    fitPadding?: number;
    minZoom?: number;
    maxZoom?: number;
}) {
    const rf = useReactFlow();
    const [zoom, setZoom] = useState<number>(1);

    const syncZoom = useCallback(() => {
        const vp: Viewport = rf.getViewport();
        setZoom(vp.zoom);
    }, [rf]);

    const setZoomTo = useCallback(
        (z: number) => {
            const vp = rf.getViewport();
            rf.setViewport({ x: vp.x, y: vp.y, zoom: z }, { duration: 120 });
            setZoom(z);
        },
        [rf]
    );

    return (
        <div
            style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "rgba(15,23,42,0.92)",
                color: "#e5e7eb",
            }}
            onMouseEnter={syncZoom}
        >
            <span style={{ fontSize: 12, opacity: 0.9 }}>Zoom</span>
            <input
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoomTo(Number(e.target.value))}
                style={{ width: 160 }}
            />
            <span style={{ fontSize: 12, width: 52, textAlign: "right" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => rf.fitView({ padding: fitPadding })}>Fit</button>
        </div>
    );
}