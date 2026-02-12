import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
    Background,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    ReactFlowProvider,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { DependenciesResponse, DependencyRecord, ContributionsResponse } from '../api/types';
import { HeatmapMode, HeatmapState, buildHeatmap, normalizePath } from './heatmapUtils';
import { HeatmapLegend } from './HeatmapLegend';
import { dagreLayout, LayoutNode, LayoutEdge } from './layoutAlgorithms';
import { getVsCodeApi } from './vscode-api';

/**
 * Generate fallback dependencies from the architecture graph edges.
 * Handles local analysis data where node IDs are absolute file paths
 * and import targets may be relative module paths.
 */
function generateFallbackDependencies(graphData: any): DependenciesResponse {
    const nodesArray: any[] = graphData?.nodes || [];
    const edgesArray: any[] = graphData?.edges || [];

    // Find the workspace root for building short names
    const rootNode = nodesArray.find((n: any) => n.type === 'directory' && n.depth === 0);
    const rootPrefix = rootNode
        ? (rootNode.filePath || rootNode.id || '').replace(/\\/g, '/').replace(/\/?$/, '/')
        : '';

    function shortName(absPath: string): string {
        const normalized = absPath.replace(/\\/g, '/');
        return rootPrefix && normalized.startsWith(rootPrefix)
            ? normalized.slice(rootPrefix.length)
            : normalized;
    }

    // Build a set of known node IDs for resolution
    const nodeIds = new Set(nodesArray.map((n: any) => n.id));

    // Collect import and call edges
    const depEdges = edgesArray.filter((e: any) => e.type === 'imports' || e.type === 'calls');

    const dependencies: DependencyRecord[] = [];
    const seen = new Set<string>();

    for (const edge of depEdges) {
        const src = edge.source || '';
        const tgt = edge.target || '';
        const key = `${src}→${tgt}`;
        if (seen.has(key)) continue;
        seen.add(key);

        dependencies.push({
            source_file: shortName(src),
            source_language: '',
            target: shortName(tgt),
            target_type: nodeIds.has(tgt) ? 'file' : 'module',
            relationship: edge.type || 'imports',
            relationship_properties: {},
        });
    }

    // If no import/call edges found, generate lightweight dependencies 
    // from directory→file containment so the diagram shows *something*
    if (dependencies.length === 0) {
        const fileNodes = nodesArray.filter((n: any) => n.type === 'file');
        const dirNodes = nodesArray.filter((n: any) => n.type === 'directory' && n.depth > 0);

        for (const dir of dirNodes) {
            const children = fileNodes.filter((f: any) => f.parentId === dir.id);
            if (children.length > 1) {
                // Create dependencies between sibling files (they share a module)
                for (let i = 1; i < children.length; i++) {
                    dependencies.push({
                        source_file: shortName(children[0].id),
                        source_language: '',
                        target: shortName(children[i].id),
                        target_type: 'file',
                        relationship: 'sibling',
                        relationship_properties: { directory: shortName(dir.id) },
                    });
                }
            }
        }
    }

    return {
        repo_id: graphData?.repoId || graphData?.repo_id || '',
        total_dependencies: dependencies.length,
        dependencies,
    };
}

interface DependencyDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
}

const DependencyDiagramInner: React.FC<DependencyDiagramProps> = ({ heatmapMode, highlightNodeIds = [] }) => {
    const vscode = useMemo(() => getVsCodeApi(), []);
    const apiClient = useMemo(() => new ArchMindWebviewApiClient(), []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const [repoId, setRepoId] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dependencyData, setDependencyData] = useState<DependenciesResponse | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);
    const [graphData, setGraphData] = useState<any>(null);

    const heatmapState = useMemo<HeatmapState>(
        () => buildHeatmap(contributions?.contributions || [], heatmapMode),
        [contributions, heatmapMode]
    );

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                setInitialLoading(false);
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(extractedRepoId);
                }
                if (message.data) {
                    setGraphData(message.data);
                }
            }
            if (message?.command === 'loading') {
                setInitialLoading(false);
                setIsLoading(true);
                setError(null);
            }
            if (message?.command === 'error') {
                setInitialLoading(false);
                setError(message.message || 'An error occurred');
                setIsLoading(false);
            }
            if (message?.command === 'noData') {
                setInitialLoading(false);
            }
        };
        window.addEventListener('message', handler);
        vscode.postMessage({ command: 'requestArchitecture' });
        return () => window.removeEventListener('message', handler);
    }, [vscode]);

    useEffect(() => {
        if (!repoId) {
            // No repoId — try fallback from graph data
            if (graphData) {
                const fallback = generateFallbackDependencies(graphData);
                if (fallback.dependencies.length > 0) {
                    setDependencyData(fallback);
                }
            }
            return;
        }
        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await apiClient.getDependencies(repoId);
                if (response && response.dependencies && response.dependencies.length > 0) {
                    setDependencyData(response);
                } else {
                    console.warn('Dependency API returned empty, using fallback');
                    const fallback = generateFallbackDependencies(graphData);
                    setDependencyData(fallback.dependencies.length > 0 ? fallback : response);
                }
            } catch (err) {
                console.error("Failed to load dependencies:", err);
                if (graphData) {
                    const fallback = generateFallbackDependencies(graphData);
                    if (fallback.dependencies.length > 0) {
                        setDependencyData(fallback);
                        setError(null);
                    } else {
                        setError("Failed to load dependency data. Backend may be unavailable.");
                    }
                } else {
                    setError("Failed to load dependency data. Backend may be unavailable.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [repoId, apiClient, graphData]);

    useEffect(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }
        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) setContributions(response);
            } catch (err) {
                console.error("Failed to load contributions:", err);
            }
        };
        load();
        return () => { active = false; };
    }, [repoId, heatmapMode, apiClient]);

    useEffect(() => {
        if (!dependencyData) return;

        const uniqueNodes = new Map<string, Node>();
        const newEdges: Edge[] = [];

        dependencyData.dependencies.forEach((dep, index) => {
            // Source Node
            if (!uniqueNodes.has(dep.source_file)) {
                uniqueNodes.set(dep.source_file, {
                    id: dep.source_file,
                    data: { label: dep.source_file.split('/').pop(), type: 'file' },
                    position: { x: 0, y: 0 },
                    style: { background: 'var(--am-panel-bg)', color: 'var(--am-fg)', border: '1px solid var(--am-border)', borderRadius: 4, padding: 8, width: 180 },
                });
            }

            // Target Node
            if (!uniqueNodes.has(dep.target)) {
                uniqueNodes.set(dep.target, {
                    id: dep.target,
                    data: { label: dep.target.split('/').pop(), type: dep.target_type },
                    position: { x: 0, y: 0 },
                    style: { background: 'var(--am-panel-bg)', color: 'var(--am-fg)', border: '1px solid var(--am-border)', borderRadius: 4, padding: 8, width: 180 },
                });
            }

            // Edge
            newEdges.push({
                id: `e-${index}`,
                source: dep.source_file,
                target: dep.target,
                label: dep.relationship,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: 'var(--am-fg)', opacity: 0.6 },
            });
        });

        // Apply Heatmap
        let processedNodes = Array.from(uniqueNodes.values());
        if (heatmapMode !== 'off') {
            processedNodes = processedNodes.map(node => {
                const entry = heatmapState.entries.get(normalizePath(node.id));
                if (entry) {
                    return {
                        ...node,
                        style: { ...node.style, background: entry.color },
                        data: { ...node.data, heatmapTooltip: entry.tooltip }
                    };
                }
                return node;
            });
        }

        // Apply Layout
        const layoutNodes: LayoutNode[] = processedNodes.map(n => ({ id: n.id, width: 180, height: 40 }));
        const layoutEdgesWrapper: LayoutEdge[] = newEdges.map(e => ({ id: e.id, source: e.source, target: e.target }));

        const layoutResult = dagreLayout(layoutNodes, layoutEdgesWrapper, 'TB');

        const finalNodes = processedNodes.map(node => {
            const pos = layoutResult.nodes.get(node.id) || { x: 0, y: 0 };
            return { ...node, position: pos };
        });

        setNodes(finalNodes);
        setEdges(newEdges);

    }, [dependencyData, heatmapState, heatmapMode, setNodes, setEdges]);

    // Show "initializing" spinner while waiting for first architectureData
    if (initialLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                Initializing dependency diagram...
            </div>
        );
    }

    if (!repoId && !dependencyData) {
        return (
            <div className="diagram-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h3>No Repository Analyzed</h3>
                <p style={{ opacity: 0.8, maxWidth: '400px', marginBottom: '24px' }}>
                    Run backend analysis to visualize dependencies, or open a workspace for local analysis.
                </p>
                <button
                    className="diagram-pill active"
                    onClick={() => vscode.postMessage({ command: 'analyzeRepository' })}
                >
                    Analyze Repository
                </button>
            </div>
        );
    }
    if (isLoading) {
        return <div className="loading-container"><div className="loading-spinner" />Loading dependencies...</div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>{error}</p>
                <div className="error-actions">
                    <button className="retry-button" onClick={() => {
                        setError(null);
                        if (repoId) {
                            setIsLoading(true);
                            apiClient.getDependencies(repoId)
                                .then(r => { setDependencyData(r); setIsLoading(false); })
                                .catch(() => { setError('Retry failed'); setIsLoading(false); });
                        }
                    }}>Retry</button>
                </div>
            </div>
        );
    }

    // Empty state
    if (!isLoading && !error && (!dependencyData || dependencyData.total_dependencies === 0)) {
        return (
            <div className="loading-container">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>No Dependencies Found</h3>
                <p style={{ opacity: 0.8, maxWidth: '400px', textAlign: 'center' }}>
                    Run analysis to detect dependencies.
                </p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            {heatmapMode !== 'off' && (
                <div className="heatmap-legend-floating">
                    <HeatmapLegend
                        mode={heatmapMode}
                        minMetric={heatmapState.minMetric}
                        maxMetric={heatmapState.maxMetric}
                    />
                </div>
            )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background color="var(--am-border)" gap={16} />
            </ReactFlow>
        </div>
    );
};

export const DependencyDiagram = (props: DependencyDiagramProps) => (
    <ReactFlowProvider>
        <DependencyDiagramInner {...props} />
    </ReactFlowProvider>
);
