import { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, Viewport } from 'reactflow';

export interface VirtualizationOptions {
    enabled: boolean;
    nodeThreshold: number;
    viewportPadding: number;
    maxVisibleNodes?: number;
}

export const DEFAULT_VIRTUALIZATION_OPTIONS: VirtualizationOptions = {
    enabled: true,
    nodeThreshold: 100,
    viewportPadding: 500,
    maxVisibleNodes: 200,
};

export interface VirtualizationResult {
    visibleNodes: Node[];
    visibleEdges: Edge[];
    totalNodes: number;
    totalEdges: number;
    isVirtualized: boolean;
    stats: {
        renderedNodes: number;
        culledNodes: number;
        renderedEdges: number;
        culledEdges: number;
    };
}

/**
 * Hook for virtualizing large graphs - only renders visible nodes
 */
export function useVirtualization(
    nodes: Node[],
    edges: Edge[],
    viewport: Viewport,
    options: Partial<VirtualizationOptions> = {}
): VirtualizationResult {
    const opts = { ...DEFAULT_VIRTUALIZATION_OPTIONS, ...options };
    const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());

    const isVirtualized = useMemo(() => {
        return opts.enabled && nodes.length >= opts.nodeThreshold;
    }, [opts.enabled, opts.nodeThreshold, nodes.length]);

    const viewportBounds = useMemo(() => {
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

    useEffect(() => {
        if (!isVirtualized) {
            setVisibleNodeIds(new Set(nodes.map(n => n.id)));
            return;
        }

        const visible = new Set<string>();
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

    const visibleNodes = useMemo(() => {
        if (!isVirtualized) return nodes;
        return nodes.filter(node => visibleNodeIds.has(node.id));
    }, [nodes, visibleNodeIds, isVirtualized]);

    const visibleEdges = useMemo(() => {
        if (!isVirtualized) return edges;
        return edges.filter(edge =>
            visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target)
        );
    }, [edges, visibleNodeIds, isVirtualized]);

    const stats = useMemo(() => ({
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
export function useProgressiveLoading(
    nodes: Node[],
    edges: Edge[],
    batchSize: number = 50,
    delayMs: number = 10
): {
    loadedNodes: Node[];
    loadedEdges: Edge[];
    isLoading: boolean;
    progress: number;
} {
    const [loadedCount, setLoadedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (loadedCount >= nodes.length) {
            setIsLoading(false);
            return;
        }

        const timer = setTimeout(() => {
            setLoadedCount(prev => Math.min(prev + batchSize, nodes.length));
        }, delayMs);

        return () => clearTimeout(timer);
    }, [loadedCount, nodes.length, batchSize, delayMs]);

    const loadedNodes = useMemo(() => nodes.slice(0, loadedCount), [nodes, loadedCount]);
    const loadedNodeIds = useMemo(() => new Set(loadedNodes.map(n => n.id)), [loadedNodes]);
    const loadedEdges = useMemo(() =>
        edges.filter(edge => loadedNodeIds.has(edge.source) && loadedNodeIds.has(edge.target)),
        [edges, loadedNodeIds]
    );

    const progress = nodes.length > 0 ? (loadedCount / nodes.length) * 100 : 100;

    return { loadedNodes, loadedEdges, isLoading, progress };
}

/**
 * Hook for level-of-detail rendering based on zoom
 */
export function useLevelOfDetail(
    viewport: Viewport,
    thresholds = { full: 0.75, simplified: 0.5, minimal: 0.25 }
): {
    detailLevel: 'full' | 'simplified' | 'minimal';
    shouldRenderLabels: boolean;
    shouldRenderIcons: boolean;
} {
    const { zoom } = viewport;

    const detailLevel: 'full' | 'simplified' | 'minimal' = useMemo(() => {
        if (zoom >= thresholds.full) return 'full';
        if (zoom >= thresholds.simplified) return 'simplified';
        return 'minimal';
    }, [zoom, thresholds]);

    return {
        detailLevel,
        shouldRenderLabels: zoom >= thresholds.simplified,
        shouldRenderIcons: zoom >= thresholds.full,
    };
}
