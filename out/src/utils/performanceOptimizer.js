"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceOptimizer = exports.PerformanceMonitor = exports.GraphCache = exports.MemoCache = void 0;
exports.debounce = debounce;
exports.throttle = throttle;
exports.optimizeGraphData = optimizeGraphData;
exports.estimateMemoryUsage = estimateMemoryUsage;
exports.profile = profile;
/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout = null;
    return function executedFunction(...args) {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
/**
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle = false;
    return function executedFunction(...args) {
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
class MemoCache {
    constructor(maxSize = 100, ttl = 60000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }
    getKey(key) {
        return JSON.stringify(key);
    }
    get(key) {
        const stringKey = this.getKey(key);
        const cached = this.cache.get(stringKey);
        if (!cached)
            return undefined;
        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(stringKey);
            return undefined;
        }
        return cached.value;
    }
    set(key, value) {
        const stringKey = this.getKey(key);
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(stringKey, { value, timestamp: Date.now() });
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
}
exports.MemoCache = MemoCache;
/**
 * Graph cache for nodes and edges
 */
class GraphCache {
    constructor() {
        this.nodeCache = new MemoCache(500, 300000);
        this.edgeCache = new MemoCache(1000, 300000);
        this.layoutCache = new MemoCache(10, 600000);
    }
    getNode(nodeId) {
        return this.nodeCache.get(nodeId);
    }
    setNode(nodeId, node) {
        this.nodeCache.set(nodeId, node);
    }
    getEdge(edgeId) {
        return this.edgeCache.get(edgeId);
    }
    setEdge(edgeId, edge) {
        this.edgeCache.set(edgeId, edge);
    }
    getLayout(layoutKey) {
        return this.layoutCache.get(layoutKey);
    }
    setLayout(layoutKey, result) {
        this.layoutCache.set(layoutKey, result);
    }
    clearAll() {
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
exports.GraphCache = GraphCache;
/**
 * Performance monitor
 */
class PerformanceMonitor {
    constructor(maxSamples = 60) {
        this.metrics = new Map();
        this.maxSamples = maxSamples;
    }
    mark(metricName, value) {
        if (!this.metrics.has(metricName)) {
            this.metrics.set(metricName, []);
        }
        const samples = this.metrics.get(metricName);
        samples.push(value);
        if (samples.length > this.maxSamples) {
            samples.shift();
        }
    }
    getAverage(metricName) {
        const samples = this.metrics.get(metricName);
        if (!samples || samples.length === 0)
            return 0;
        return samples.reduce((a, b) => a + b, 0) / samples.length;
    }
    getStats(metricName) {
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
    clear() {
        this.metrics.clear();
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Optimize graph data
 */
function optimizeGraphData(nodes, edges) {
    const edgeMap = new Map();
    let duplicates = 0;
    for (const edge of edges) {
        const key = `${edge.source}-${edge.target}-${edge.type || 'default'}`;
        if (!edgeMap.has(key)) {
            edgeMap.set(key, edge);
        }
        else {
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
function estimateMemoryUsage(nodes, edges) {
    const formatBytes = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(2)} KB`;
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
exports.performanceOptimizer = {
    cache: new GraphCache(),
    monitor: new PerformanceMonitor(100),
};
/**
 * Profile function execution time
 */
function profile(fn, metricName) {
    return ((...args) => {
        const start = performance.now();
        const result = fn(...args);
        const end = performance.now();
        exports.performanceOptimizer.monitor.mark(metricName, end - start);
        return result;
    });
}
//# sourceMappingURL=performanceOptimizer.js.map