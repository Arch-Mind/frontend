import { Node, Edge } from 'reactflow';

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function executedFunction(...args: Parameters<T>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        }
    };
}

/**
 * Memoization cache with TTL
 */
export class MemoCache<K, V> {
    private cache: Map<string, { value: V; timestamp: number }>;
    private maxSize: number;
    private ttl: number;

    constructor(maxSize: number = 100, ttl: number = 60000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    private getKey(key: K): string {
        return JSON.stringify(key);
    }

    get(key: K): V | undefined {
        const stringKey = this.getKey(key);
        const cached = this.cache.get(stringKey);

        if (!cached) return undefined;

        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(stringKey);
            return undefined;
        }

        return cached.value;
    }

    set(key: K, value: V): void {
        const stringKey = this.getKey(key);

        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(stringKey, { value, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

/**
 * Graph cache for nodes and edges
 */
export class GraphCache {
    private nodeCache: MemoCache<string, Node>;
    private edgeCache: MemoCache<string, Edge>;
    private layoutCache: MemoCache<string, { nodes: Node[]; edges: Edge[] }>;

    constructor() {
        this.nodeCache = new MemoCache<string, Node>(500, 300000);
        this.edgeCache = new MemoCache<string, Edge>(1000, 300000);
        this.layoutCache = new MemoCache<string, { nodes: Node[]; edges: Edge[] }>(10, 600000);
    }

    getNode(nodeId: string): Node | undefined {
        return this.nodeCache.get(nodeId);
    }

    setNode(nodeId: string, node: Node): void {
        this.nodeCache.set(nodeId, node);
    }

    getEdge(edgeId: string): Edge | undefined {
        return this.edgeCache.get(edgeId);
    }

    setEdge(edgeId: string, edge: Edge): void {
        this.edgeCache.set(edgeId, edge);
    }

    getLayout(layoutKey: string): { nodes: Node[]; edges: Edge[] } | undefined {
        return this.layoutCache.get(layoutKey);
    }

    setLayout(layoutKey: string, result: { nodes: Node[]; edges: Edge[] }): void {
        this.layoutCache.set(layoutKey, result);
    }

    clearAll(): void {
        this.nodeCache.clear();
        this.edgeCache.clear();
        this.layoutCache.clear();
    }

    getStats() {
        return {
            nodes: this.nodeCache.size,
            edges: this.edgeCache.size,
            layouts: this.layoutCache.size,
        };
    }
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
    private metrics: Map<string, number[]>;
    private maxSamples: number;

    constructor(maxSamples: number = 60) {
        this.metrics = new Map();
        this.maxSamples = maxSamples;
    }

    mark(metricName: string, value: number): void {
        if (!this.metrics.has(metricName)) {
            this.metrics.set(metricName, []);
        }

        const samples = this.metrics.get(metricName)!;
        samples.push(value);

        if (samples.length > this.maxSamples) {
            samples.shift();
        }
    }

    getAverage(metricName: string): number {
        const samples = this.metrics.get(metricName);
        if (!samples || samples.length === 0) return 0;
        return samples.reduce((a, b) => a + b, 0) / samples.length;
    }

    getStats(metricName: string) {
        const samples = this.metrics.get(metricName);
        if (!samples || samples.length === 0) {
            return { average: 0, max: 0, min: 0, samples: 0 };
        }

        return {
            average: this.getAverage(metricName),
            max: Math.max(...samples),
            min: Math.min(...samples),
            samples: samples.length,
        };
    }

    clear(): void {
        this.metrics.clear();
    }
}

/**
 * Optimize graph data
 */
export function optimizeGraphData(nodes: Node[], edges: Edge[]): {
    nodes: Node[];
    edges: Edge[];
    savings: { duplicateEdgesRemoved: number; bytesEstimatedSaved: number };
} {
    const edgeMap = new Map<string, Edge>();
    let duplicates = 0;

    for (const edge of edges) {
        const key = `${edge.source}-${edge.target}-${edge.type || 'default'}`;
        if (!edgeMap.has(key)) {
            edgeMap.set(key, edge);
        } else {
            duplicates++;
        }
    }

    return {
        nodes,
        edges: Array.from(edgeMap.values()),
        savings: {
            duplicateEdgesRemoved: duplicates,
            bytesEstimatedSaved: duplicates * 200,
        },
    };
}

/**
 * Estimate memory usage
 */
export function estimateMemoryUsage(nodes: Node[], edges: Edge[]): {
    nodes: string;
    edges: string;
    total: string;
} {
    const formatBytes = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const nodeBytes = JSON.stringify(nodes).length;
    const edgeBytes = JSON.stringify(edges).length;

    return {
        nodes: formatBytes(nodeBytes),
        edges: formatBytes(edgeBytes),
        total: formatBytes(nodeBytes + edgeBytes),
    };
}

/**
 * Global optimizer instance
 */
export const performanceOptimizer = {
    cache: new GraphCache(),
    monitor: new PerformanceMonitor(100),
};

/**
 * Profile function execution time
 */
export function profile<T extends (...args: any[]) => any>(
    fn: T,
    metricName: string
): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
        const start = performance.now();
        const result = fn(...args);
        const end = performance.now();
        performanceOptimizer.monitor.mark(metricName, end - start);
        return result;
    }) as T;
}
