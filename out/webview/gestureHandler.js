"use strict";
/**
 * Gesture Handler Utility (Issue #20)
 * Handles touch gestures and mouse events for zoom/pan
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGestureHandlers = createGestureHandlers;
exports.clamp = clamp;
exports.zoomToPercent = zoomToPercent;
exports.percentToZoom = percentToZoom;
/**
 * Calculate distance between two touch points
 */
function getTouchDistance(touches) {
    if (touches.length < 2)
        return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
/**
 * Calculate center point between two touches
 */
function getTouchCenter(touches) {
    if (touches.length < 2)
        return null;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    };
}
/**
 * Create gesture handlers for zoom and pan
 */
function createGestureHandlers(callbacks, options = {}) {
    const { enableMousePan = true, enableTouchGestures = true, enableWheelZoom = true, zoomSensitivity = 0.01, panButton = 1, // Middle mouse button by default
     } = options;
    const state = {
        isPanning: false,
        isZooming: false,
        lastTouchDistance: 0,
        lastMousePosition: null,
    };
    // Mouse wheel zoom
    const onWheel = (event) => {
        if (!enableWheelZoom)
            return;
        event.preventDefault();
        // Normalize wheel delta (different browsers handle it differently)
        const delta = -event.deltaY * zoomSensitivity;
        // Get mouse position as zoom center
        const center = {
            x: event.clientX,
            y: event.clientY,
        };
        callbacks.onZoom(delta, center);
    };
    // Mouse pan (middle button or space+left button)
    const onMouseDown = (event) => {
        if (!enableMousePan)
            return;
        // Check if middle button or space+left button
        const shouldPan = event.button === panButton ||
            (event.button === 0 && event.shiftKey);
        if (shouldPan) {
            event.preventDefault();
            state.isPanning = true;
            state.lastMousePosition = {
                x: event.clientX,
                y: event.clientY,
            };
        }
    };
    const onMouseMove = (event) => {
        if (!enableMousePan || !state.isPanning || !state.lastMousePosition)
            return;
        const deltaX = event.clientX - state.lastMousePosition.x;
        const deltaY = event.clientY - state.lastMousePosition.y;
        callbacks.onPan(deltaX, deltaY);
        state.lastMousePosition = {
            x: event.clientX,
            y: event.clientY,
        };
    };
    const onMouseUp = (event) => {
        if (!enableMousePan)
            return;
        if (state.isPanning) {
            state.isPanning = false;
            state.lastMousePosition = null;
        }
    };
    // Touch gestures (pinch zoom + pan)
    const onTouchStart = (event) => {
        if (!enableTouchGestures)
            return;
        if (event.touches.length === 2) {
            // Two-finger pinch zoom
            event.preventDefault();
            state.isZooming = true;
            state.lastTouchDistance = getTouchDistance(event.touches);
        }
        else if (event.touches.length === 1) {
            // Single finger pan
            state.isPanning = true;
            state.lastMousePosition = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
            };
        }
    };
    const onTouchMove = (event) => {
        if (!enableTouchGestures)
            return;
        if (event.touches.length === 2 && state.isZooming) {
            // Pinch zoom
            event.preventDefault();
            const currentDistance = getTouchDistance(event.touches);
            const distanceDelta = currentDistance - state.lastTouchDistance;
            // Convert distance delta to zoom delta
            const zoomDelta = distanceDelta * 0.005;
            // Get center point as zoom focus
            const center = getTouchCenter(event.touches);
            callbacks.onZoom(zoomDelta, center || undefined);
            state.lastTouchDistance = currentDistance;
        }
        else if (event.touches.length === 1 && state.isPanning && state.lastMousePosition) {
            // Single finger pan
            const touch = event.touches[0];
            const deltaX = touch.clientX - state.lastMousePosition.x;
            const deltaY = touch.clientY - state.lastMousePosition.y;
            callbacks.onPan(deltaX, deltaY);
            state.lastMousePosition = {
                x: touch.clientX,
                y: touch.clientY,
            };
        }
    };
    const onTouchEnd = (event) => {
        if (!enableTouchGestures)
            return;
        if (event.touches.length < 2) {
            state.isZooming = false;
            state.lastTouchDistance = 0;
        }
        if (event.touches.length === 0) {
            state.isPanning = false;
            state.lastMousePosition = null;
        }
    };
    return {
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onWheel,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
}
/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
/**
 * Calculate zoom level as percentage
 */
function zoomToPercent(zoom) {
    return Math.round(zoom * 100);
}
/**
 * Convert percentage to zoom level
 */
function percentToZoom(percent) {
    return percent / 100;
}
//# sourceMappingURL=gestureHandler.js.map