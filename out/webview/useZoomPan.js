"use strict";
/**
 * useZoomPan Hook (Issue #20)
 * Custom hook for managing zoom and pan controls with ReactFlow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useZoomPan = useZoomPan;
exports.useZoomPanKeyboard = useZoomPanKeyboard;
const react_1 = require("react");
const reactflow_1 = require("reactflow");
const gestureHandler_1 = require("./gestureHandler");
const DEFAULT_PRESETS = [
    { label: 'Fit to Screen', zoom: 'fit', icon: '⊡' },
    { label: '50%', zoom: 0.5, icon: '−' },
    { label: '100%', zoom: 1.0, icon: '•' },
    { label: '150%', zoom: 1.5, icon: '+' },
    { label: '200%', zoom: 2.0, icon: '++' },
];
/**
 * Custom hook for zoom and pan functionality
 */
function useZoomPan(options = {}) {
    const { minZoom = 0.1, maxZoom = 4.0, defaultZoom = 1.0, zoomStep = 0.2, animationDuration = 300, } = options;
    const reactFlow = (0, reactflow_1.useReactFlow)();
    const [viewport, setViewport] = (0, react_1.useState)({
        x: 0,
        y: 0,
        zoom: defaultZoom,
    });
    // Update viewport state when it changes
    (0, react_1.useEffect)(() => {
        const updateViewport = () => {
            const vp = reactFlow.getViewport();
            setViewport(vp);
        };
        updateViewport();
        // Listen for viewport changes
        const interval = setInterval(updateViewport, 100);
        return () => clearInterval(interval);
    }, [reactFlow]);
    // Zoom in
    const zoomIn = (0, react_1.useCallback)(() => {
        const newZoom = (0, gestureHandler_1.clamp)(viewport.zoom + zoomStep, minZoom, maxZoom);
        reactFlow.setViewport({ x: viewport.x, y: viewport.y, zoom: newZoom }, { duration: animationDuration });
    }, [viewport, zoomStep, minZoom, maxZoom, animationDuration, reactFlow]);
    // Zoom out
    const zoomOut = (0, react_1.useCallback)(() => {
        const newZoom = (0, gestureHandler_1.clamp)(viewport.zoom - zoomStep, minZoom, maxZoom);
        reactFlow.setViewport({ x: viewport.x, y: viewport.y, zoom: newZoom }, { duration: animationDuration });
    }, [viewport, zoomStep, minZoom, maxZoom, animationDuration, reactFlow]);
    // Zoom to specific level
    const zoomTo = (0, react_1.useCallback)((zoom, center) => {
        const newZoom = (0, gestureHandler_1.clamp)(zoom, minZoom, maxZoom);
        if (center) {
            // Zoom to a specific point
            const { x: viewportX, y: viewportY, zoom: currentZoom } = viewport;
            // Calculate the position of the center point in the flow coordinate system
            const pointX = (center.x - viewportX) / currentZoom;
            const pointY = (center.y - viewportY) / currentZoom;
            // Calculate new viewport position to keep the point at the same screen position
            const newX = center.x - pointX * newZoom;
            const newY = center.y - pointY * newZoom;
            reactFlow.setViewport({ x: newX, y: newY, zoom: newZoom }, { duration: animationDuration });
        }
        else {
            // Zoom from center
            reactFlow.setViewport({ x: viewport.x, y: viewport.y, zoom: newZoom }, { duration: animationDuration });
        }
    }, [viewport, minZoom, maxZoom, animationDuration, reactFlow]);
    // Fit view to show all nodes
    const zoomToFit = (0, react_1.useCallback)(() => {
        reactFlow.fitView({
            padding: 0.2,
            duration: animationDuration,
            minZoom,
            maxZoom,
        });
    }, [reactFlow, animationDuration, minZoom, maxZoom]);
    // Reset zoom to default
    const resetZoom = (0, react_1.useCallback)(() => {
        reactFlow.setViewport({ x: 0, y: 0, zoom: defaultZoom }, { duration: animationDuration });
    }, [reactFlow, defaultZoom, animationDuration]);
    // Pan to specific position
    const panTo = (0, react_1.useCallback)((x, y) => {
        reactFlow.setViewport({ x, y, zoom: viewport.zoom }, { duration: animationDuration });
    }, [viewport.zoom, animationDuration, reactFlow]);
    // Pan by delta
    const panBy = (0, react_1.useCallback)((deltaX, deltaY) => {
        reactFlow.setViewport({
            x: viewport.x + deltaX,
            y: viewport.y + deltaY,
            zoom: viewport.zoom,
        }, { duration: 0 } // No animation for smooth dragging
        );
    }, [viewport, reactFlow]);
    // Center view
    const centerView = (0, react_1.useCallback)(() => {
        reactFlow.fitView({
            padding: 0.1,
            duration: animationDuration,
        });
    }, [reactFlow, animationDuration]);
    // Apply preset
    const applyPreset = (0, react_1.useCallback)((preset) => {
        if (preset.zoom === 'fit') {
            zoomToFit();
        }
        else {
            zoomTo(preset.zoom);
        }
    }, [zoomToFit, zoomTo]);
    // Check if can zoom in/out
    const canZoomIn = viewport.zoom < maxZoom;
    const canZoomOut = viewport.zoom > minZoom;
    return {
        zoom: viewport.zoom,
        zoomPercent: (0, gestureHandler_1.zoomToPercent)(viewport.zoom),
        viewport,
        zoomIn,
        zoomOut,
        zoomTo,
        zoomToFit,
        resetZoom,
        panTo,
        panBy,
        centerView,
        presets: DEFAULT_PRESETS,
        applyPreset,
        canZoomIn,
        canZoomOut,
    };
}
/**
 * Hook for keyboard shortcuts for zoom/pan
 */
function useZoomPanKeyboard(zoomPan) {
    const { zoomIn, zoomOut, zoomToFit, resetZoom } = zoomPan;
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Zoom in: Ctrl/Cmd + Plus/Equal
            if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                zoomIn();
            }
            // Zoom out: Ctrl/Cmd + Minus
            if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                zoomOut();
            }
            // Fit to screen: Ctrl/Cmd + 0
            if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                zoomToFit();
            }
            // Reset zoom: Ctrl/Cmd + 1
            if ((e.ctrlKey || e.metaKey) && e.key === '1') {
                e.preventDefault();
                resetZoom();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [zoomIn, zoomOut, zoomToFit, resetZoom]);
}
//# sourceMappingURL=useZoomPan.js.map