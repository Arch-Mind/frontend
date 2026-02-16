import React, { useEffect, useMemo, useState } from 'react';
import { ArchMindWebviewApiClient } from '../api/webviewClient';
import { ContributionsResponse, ModuleBoundariesResponse, ModuleBoundary } from '../api/types';
import { HeatmapLegend } from './HeatmapLegend';
import { buildHeatmap, HeatmapMode, HeatmapState, normalizePath } from './heatmapUtils';
import { RawNode } from './graphTypes';
import { getVsCodeApi } from '../utils/vscodeApi';

declare const acquireVsCodeApi: any;

interface BoundaryGroup {
    title: string;
    description: string;
    boundaries: ModuleBoundary[];
}

const boundaryTypeOrder = ['physical', 'logical', 'architectural'];

const boundaryTypeDescriptions: Record<string, string> = {
    physical: 'Workspaces, repos, and packages detected from manifests.',
    logical: 'Directory or namespace clusters inferred from structure.',
    architectural: 'Layered groupings inferred from heuristics.',
};

const layerStyles: Record<string, string> = {
    Presentation: 'layer-pill layer-presentation',
    BusinessLogic: 'layer-pill layer-business',
    DataAccess: 'layer-pill layer-data',
    Infrastructure: 'layer-pill layer-infra',
    Unknown: 'layer-pill layer-unknown',
};

function getBoundaryHeatmap(boundary: ModuleBoundary, heatmapState: HeatmapState): { color: string; tooltip: string; metric: number } | null {
    let hottest: { color: string; tooltip: string; metric: number } | null = null;
    boundary.files.forEach((file) => {
        const entry = heatmapState.entries.get(normalizePath(file));
        if (!entry) return;
        if (!hottest || entry.metric > hottest.metric) {
            hottest = { color: entry.color, tooltip: entry.tooltip, metric: entry.metric };
        }
    });
    return hottest;
}

interface ModuleBoundaryDiagramProps {
    heatmapMode: HeatmapMode;
    highlightNodeIds?: string[];
    repoId?: string | null;
    graphEngineUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    architectureData?: any;
}

export const ModuleBoundaryDiagram: React.FC<ModuleBoundaryDiagramProps> = ({
    heatmapMode,
    highlightNodeIds = [],
    repoId: initialRepoId = null,
    graphEngineUrl,
    architectureData,
}) => {
    console.log('ModuleBoundaryDiagram: Mounted', { repoId: initialRepoId, hasArchData: !!architectureData });

    console.log('ModuleBoundaryDiagram: Mounted', { repoId: initialRepoId, hasArchData: !!architectureData });

    const vscode = useMemo(() => getVsCodeApi(), []);
    const apiClient = useMemo(
        () => new ArchMindWebviewApiClient(graphEngineUrl || 'https://graph-engine-production-90f5.up.railway.app'),
        [graphEngineUrl]
    );

    const [repoId, setRepoId] = useState<string | null>(initialRepoId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ModuleBoundariesResponse | null>(null);
    const [expandedBoundaryId, setExpandedBoundaryId] = useState<string | null>(null);
    const [contributions, setContributions] = useState<ContributionsResponse | null>(null);

    const heatmapState = useMemo<HeatmapState>(
        () => buildHeatmap(contributions?.contributions || [], heatmapMode),
        [contributions, heatmapMode]
    );

    const highlightSet = useMemo(
        () => new Set(highlightNodeIds.map((id) => normalizePath(id.replace(/^file:/, '')))),
        [highlightNodeIds]
    );

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message?.command === 'architectureData') {
                const extractedRepoId = message.data?.repo_id || message.data?.repoId;
                if (extractedRepoId) {
                    setRepoId(String(extractedRepoId));
                }
            }
        };

        window.addEventListener('message', handler);
        window.addEventListener('message', handler);
        if (vscode) {
            vscode.postMessage({ command: 'requestArchitecture' });
        }

        return () => window.removeEventListener('message', handler);
    }, [vscode]);

    useEffect(() => {
        if (initialRepoId) {
            setRepoId(initialRepoId);
        }
    }, [initialRepoId]);

    const loadBoundaries = async () => {
        if (!repoId) return;
        try {
            setIsLoading(true);
            setError(null);

            try {
                const response = await apiClient.getModuleBoundaries(repoId);
                if (response && response.boundaries.length > 0) {
                    setData(response);
                } else {
                    console.warn('ModuleBoundaryDiagram: Backend returned empty boundaries');
                    throw new Error('No boundaries returned from backend');
                }
            } catch (backendError) {
                console.warn('ModuleBoundaryDiagram: Backend fetch failed', backendError);

                // Fallback: Derive from architectureData if available
                if (architectureData && architectureData.nodes) {
                    console.log('ModuleBoundaryDiagram: Using fallback data');
                    const files = architectureData.nodes.filter((n: RawNode) => n.type === 'file');
                    // Group by directory
                    const dirMap = new Map<string, string[]>();

                    files.forEach((node: RawNode) => {
                        const pathParts = (node.filePath || node.id).split('/');
                        const dir = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
                        if (!dirMap.has(dir)) dirMap.set(dir, []);
                        dirMap.get(dir)?.push(node.filePath || node.id);
                    });

                    const derivedBoundaries: ModuleBoundary[] = Array.from(dirMap.entries()).map(([dir, files], index) => ({
                        id: `physical-${index}`,
                        name: dir,
                        path: dir,
                        type: 'physical',
                        files: files,
                        file_count: files.length,
                        layer: 'Unknown'
                    }));

                    setData({
                        boundaries: derivedBoundaries,
                        total_boundaries: derivedBoundaries.length,
                        repo_id: repoId
                    });
                } else {
                    throw backendError;
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load boundaries');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!repoId) return;
        let active = true;

        const run = async () => {
            if (!active) return;
            await loadBoundaries();
        };

        run();
        return () => {
            active = false;
        };
    }, [repoId, architectureData]);

    useEffect(() => {
        if (!repoId || heatmapMode === 'off') {
            setContributions(null);
            return;
        }

        let active = true;
        const load = async () => {
            try {
                const response = await apiClient.getContributions(repoId);
                if (active) {
                    setContributions(response);
                }
            } catch {
                if (active) {
                    setContributions(null);
                }
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [apiClient, repoId, heatmapMode]);

    const groups = useMemo<BoundaryGroup[]>(() => {
        const boundaries = data?.boundaries || [];
        const grouped: Record<string, ModuleBoundary[]> = {};

        boundaries.forEach(boundary => {
            const key = boundary.type || 'unknown';
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(boundary);
        });

        return boundaryTypeOrder
            .filter(type => grouped[type]?.length)
            .map(type => ({
                title: type[0].toUpperCase() + type.slice(1),
                description: boundaryTypeDescriptions[type] || '',
                boundaries: grouped[type] || [],
            }));
    }, [data]);

    const totalBoundaries = data?.total_boundaries ?? 0;

    return (
        <div className="boundary-view">
            <div className="boundary-header">
                <div>
                    <h2 className="boundary-title">Module Boundaries</h2>
                    <p className="boundary-subtitle">Detected boundaries grouped by type.</p>
                </div>
                <div className="boundary-actions">
                    <button
                        className="boundary-refresh"
                        onClick={loadBoundaries}
                        disabled={!repoId || isLoading}
                    >
                        Refresh
                    </button>
                </div>
            </div>
            {heatmapMode !== 'off' && heatmapState.maxMetric > 0 && (
                <HeatmapLegend
                    mode={heatmapMode}
                    minMetric={heatmapState.minMetric}
                    maxMetric={heatmapState.maxMetric}
                />
            )}

            {isLoading && (
                <div className="boundary-state">Loading boundaries...</div>
            )}
            {error && (
                <div className="boundary-state boundary-error">{error}</div>
            )}
            {!isLoading && !error && !repoId && (
                <div className="boundary-state">
                    Backend repository context is not available. Run backend analysis first.
                </div>
            )}

            {!isLoading && !error && !!repoId && totalBoundaries === 0 && (
                <div className="boundary-state">No boundaries available yet.</div>
            )}

            {!isLoading && !error && !!repoId && totalBoundaries > 0 && (
                <div className="boundary-summary">
                    <span className="boundary-pill">{totalBoundaries} boundaries</span>
                    {repoId && <span className="boundary-pill muted">Repo: {repoId}</span>}
                </div>
            )}

            <div className="boundary-grid">
                {groups.map(group => (
                    <div key={group.title} className="boundary-column">
                        <div className="boundary-column-header">
                            <h3>{group.title}</h3>
                            <p>{group.description}</p>
                        </div>
                        <div className="boundary-cards">
                            {group.boundaries.map(boundary => {
                                const isExpanded = expandedBoundaryId === boundary.id;
                                const layerClass = layerStyles[boundary.layer || 'Unknown'] || layerStyles.Unknown;
                                const heatmap = heatmapMode === 'off' ? null : getBoundaryHeatmap(boundary, heatmapState);
                                const isHighlighted = boundary.files.some(file => highlightSet.has(normalizePath(file)));
                                return (
                                    <div
                                        key={boundary.id}
                                        className="boundary-card"
                                        style={{
                                            borderColor: heatmap?.color,
                                            boxShadow: isHighlighted ? '0 0 0 2px rgba(249, 115, 22, 0.75)' : undefined,
                                        }}
                                        title={heatmap?.tooltip || ''}
                                    >
                                        <div className="boundary-card-header">
                                            <div>
                                                <div className="boundary-name">{boundary.name}</div>
                                                {boundary.path && <div className="boundary-path">{boundary.path}</div>}
                                            </div>
                                            {boundary.layer && (
                                                <span className={layerClass}>{boundary.layer}</span>
                                            )}
                                        </div>
                                        <div className="boundary-card-meta">
                                            <span>{boundary.file_count} files</span>
                                            <button
                                                className="boundary-toggle"
                                                onClick={() => setExpandedBoundaryId(isExpanded ? null : boundary.id)}
                                            >
                                                {isExpanded ? 'Hide files' : 'Show files'}
                                            </button>
                                        </div>
                                        {isExpanded && (
                                            <ul className="boundary-files">
                                                {boundary.files.slice(0, 15).map(file => (
                                                    <li key={file}>{file}</li>
                                                ))}
                                                {boundary.files.length > 15 && (
                                                    <li className="boundary-more">+{boundary.files.length - 15} more</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

