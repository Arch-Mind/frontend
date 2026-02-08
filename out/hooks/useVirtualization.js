"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VIRTUALIZATION_OPTIONS = void 0;
exports.useVirtualization = useVirtualization;
exports.useProgressiveLoading = useProgressiveLoading;
exports.useLevelOfDetail = useLevelOfDetail;
const react_1 = require("react");
exports.DEFAULT_VIRTUALIZATION_OPTIONS = {
    enabled: true,
    nodeThreshold: 100,
    viewportPadding: 500,
    maxVisibleNodes: 200,
};
/**
 * Hook for virtualizing large graphs - only renders visible nodes
 */
function useVirtualization(nodes, edges, viewport, options = {}) {
    const opts = { ...exports.DEFAULT_VIRTUALIZATION_OPTIONS, ...options };
    const [visibleNodeIds, setVisibleNodeIds] = (0, react_1.useState)(new Set());
    const isVirtualized = (0, react_1.useMemo)(() => {
        return opts.enabled && nodes.length >= opts.nodeThreshold;
    }, [opts.enabled, opts.nodeThreshold, nodes.length]);
    const viewportBounds = (0, react_1.useMemo)(() => {
        const { x, y, zoom } = viewport;
        const padding = opts.viewportPadding;
        const width = (typeof window !== 'undefined' ? window.innerWidth : 1920) / zoom;
        const height = (typeof window !== 'undefined' ? window.innerHeight : 1080) / zoom;
        return {
            minX: -x / zoom - padding,
            maxX: (-x + width) / zoom + padding,
            minY: -y / zoom - padding,
            maxY: (-y + height) / zoom + padding,
        };
    }, [viewport, opts.viewportPadding]);
    (0, react_1.useEffect)(() => {
        if (!isVirtualized) {
            setVisibleNodeIds(new Set(nodes.map(n => n.id)));
            return;
        }
        const visible = new Set();
        const { minX, maxX, minY, maxY } = viewportBounds;
        for (const node of nodes) {
            const nodeWidth = node.width || 180;
            const nodeHeight = node.height || 40;
            const { x, y } = node.position;
            if (x + nodeWidth >= minX && x <= maxX && y + nodeHeight >= minY && y <= maxY) {
                visible.add(node.id);
            }
            if (opts.maxVisibleNodes && visible.size >= opts.maxVisibleNodes) {
                break;
            }
        }
        setVisibleNodeIds(visible);
    }, [nodes, viewportBounds, isVirtualized, opts.maxVisibleNodes]);
    const visibleNodes = (0, react_1.useMemo)(() => {
        if (!isVirtualized)
            return nodes;
        return nodes.filter(node => visibleNodeIds.has(node.id));
    }, [nodes, visibleNodeIds, isVirtualized]);
    const visibleEdges = (0, react_1.useMemo)(() => {
        if (!isVirtualized)
            return edges;
        return edges.filter(edge => visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target));
    }, [edges, visibleNodeIds, isVirtualized]);
    const stats = (0, react_1.useMemo)(() => ({
        renderedNodes: visibleNodes.length,
        culledNodes: nodes.length - visibleNodes.length,
        renderedEdges: visibleEdges.length,
        culledEdges: edges.length - visibleEdges.length,
    }), [visibleNodes.length, nodes.length, visibleEdges.length, edges.length]);
    return {
        visibleNodes,
        visibleEdges,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        isVirtualized,
        stats,
    };
}
/**
 * Hook for progressive loading of nodes in batches
 */
function useProgressiveLoading(nodes, edges, batchSize = 50, delayMs = 10) {
    const [loadedCount, setLoadedCount] = (0, react_1.useState)(0);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        if (loadedCount >= nodes.length) {
            setIsLoading(false);
            return;
        }
        const timer = setTimeout(() => {
            setLoadedCount(prev => Math.min(prev + batchSize, nodes.length));
        }, delayMs);
        return () => clearTimeout(timer);
    }, [loadedCount, nodes.length, batchSize, delayMs]);
    const loadedNodes = (0, react_1.useMemo)(() => nodes.slice(0, loadedCount), [nodes, loadedCount]);
    const loadedNodeIds = (0, react_1.useMemo)(() => new Set(loadedNodes.map(n => n.id)), [loadedNodes]);
    const loadedEdges = (0, react_1.useMemo)(() => edges.filter(edge => loadedNodeIds.has(edge.source) && loadedNodeIds.has(edge.target)), [edges, loadedNodeIds]);
    const progress = nodes.length > 0 ? (loadedCount / nodes.length) * 100 : 100;
    return { loadedNodes, loadedEdges, isLoading, progress };
}
/**
 * Hook for level-of-detail rendering based on zoom
 */
function useLevelOfDetail(viewport, thresholds = { full: 0.75, simplified: 0.5, minimal: 0.25 }) {
    const { zoom } = viewport;
    const detailLevel = (0, react_1.useMemo)(() => {
        if (zoom >= thresholds.full)
            return 'full';
        if (zoom >= thresholds.simplified)
            return 'simplified';
        return 'minimal';
    }, [zoom, thresholds]);
    return {
        detailLevel,
        shouldRenderLabels: zoom >= thresholds.simplified,
        shouldRenderIcons: zoom >= thresholds.full,
    };
}
//# sourceMappingURL=useVirtualization.js.map