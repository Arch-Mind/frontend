import React, { useState, useEffect } from 'react';
import { ReverseImpactAnalysisResponse } from '../api/types';

export interface ReverseImpactAnalysisProps {
    filePath: string | null;
    backendUrl: string;
    repoId?: string | null;
    onClose: () => void;
    onNodeClick?: (nodeId: string) => void;
}

export const ReverseImpactAnalysisPanel: React.FC<ReverseImpactAnalysisProps> = ({
    filePath,
    backendUrl,
    repoId,
    onClose,
    onNodeClick,
}) => {
    const { data, isLoading, error } = useReverseImpactAnalysis(filePath, backendUrl, repoId);
    const [expandedTier, setExpandedTier] = useState<boolean>(true);

    if (!filePath) return null;

    const getSeverityColor = (tier: string): string => {
        switch (tier) {
            case 'Critical': return '#e74c3c'; // Red
            case 'High': return '#e67e22';     // Orange
            case 'Medium': return '#f39c12';   // Yellow
            case 'Low': return '#2ecc71';      // Green
            default: return '#3498db';         // Default blue
        }
    };

    return (
        <div className="impact-analysis-panel reverse-impact-panel">
            <div className="impact-header">
                <div className="impact-title">
                    <span className="impact-icon">🎯</span>
                    <span>Reverse Impact Analysis</span>
                </div>
                <button className="impact-close-btn" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            {isLoading && (
                <div className="impact-loading">
                    <div className="loading-spinner"></div>
                    <span>Analyzing impact...</span>
                </div>
            )}

            {error && (
                <div className="impact-error">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {data && (
                <>
                    <div className="impact-summary">
                        <div className="impact-stat">
                            <span className="stat-label">Target File:</span>
                            <span className="stat-value" title={data.target_file}>
                                {data.target_file.split(/[/\\]/).pop() || data.target_file}
                            </span>
                        </div>
                        <div className="impact-stat">
                            <span className="stat-label">Total Impact:</span>
                            <span className="stat-value">{data.impact_count} dependents</span>
                        </div>
                    </div>

                    <div className="severity-section" style={{
                        marginTop: '15px',
                        padding: '12px',
                        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                        borderRadius: '6px',
                        borderLeft: `4px solid ${getSeverityColor(data.severity_tier)}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Severity:</span>
                                <span style={{
                                    color: getSeverityColor(data.severity_tier),
                                    textTransform: 'uppercase',
                                    fontWeight: '800'
                                }}>{data.severity_tier}</span>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                {data.severity_score} <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>/ 100</span>
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', display: 'flex', gap: '15px', color: 'var(--vscode-descriptionForeground)' }}>
                            <span>Churn: {data.metrics?.churn || 0}</span>
                            <span>PageRank: {(data.metrics?.pagerank || 0).toFixed(4)}</span>
                        </div>
                    </div>

                    <div className="impact-levels" style={{ marginTop: '15px' }}>
                        <div className="impact-level">
                            <div
                                className="impact-level-header"
                                onClick={() => setExpandedTier(!expandedTier)}
                            >
                                <div
                                    className="level-indicator"
                                    style={{ backgroundColor: getSeverityColor(data.severity_tier) }}
                                ></div>
                                <div className="level-info">
                                    <span className="level-distance">Upstream Dependencies</span>
                                    <span className="level-count">{data.upstream_dependencies?.length || 0} node{(data.upstream_dependencies?.length || 0) !== 1 ? 's' : ''}</span>
                                </div>
                                <span className="level-toggle">{expandedTier ? '▼' : '▶'}</span>
                            </div>

                            {expandedTier && data.upstream_dependencies && data.upstream_dependencies.length > 0 && (
                                <div className="impact-level-nodes">
                                    {data.upstream_dependencies.map((dep, index) => (
                                        <div
                                            key={`${dep.id}-${index}`}
                                            className="impact-node-item"
                                            onClick={() => onNodeClick?.(dep.id)}
                                        >
                                            <span className="node-type-badge" title={`Depth: ${dep.depth}`}>
                                                {dep.depth === 1 ? '←' : '⤶'}
                                            </span>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span className="node-id">{dep.id.split('/').pop() || dep.id}</span>
                                                <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>
                                                    {dep.type} • Distance: {dep.depth}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandedTier && (!data.upstream_dependencies || data.upstream_dependencies.length === 0) && (
                                <div className="impact-level-nodes" style={{ padding: '10px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic', fontSize: '12px' }}>
                                    No upstream dependencies found.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <div className="impact-actions">
                <button className="impact-btn" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

/**
 * Hook for fetching reverse impact analysis data
 */
export function useReverseImpactAnalysis(
    filePath: string | null,
    backendUrl: string,
    repoId?: string | null
): {
    data: ReverseImpactAnalysisResponse | null;
    isLoading: boolean;
    error: string | null;
    fetchReverseImpact: (path: string) => Promise<void>;
} {
    const [data, setData] = useState<ReverseImpactAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatToRelativeUnixPath = (absolutePath: string): string => {
        if (!absolutePath) return '';
        // 1. Replace all Windows backslashes with forward slashes
        let unixPath = absolutePath.replace(/\\/g, '/');

        // 2. Strip away everything before the root of the actual project 
        // (matches local paths like .../FULL STACK/MathVerse/... or ArchMind...)
        const match = unixPath.match(/.*\/(?:MathVerse|ArchMind-Frontend|ArchMind-Backend)\/(.*)/);
        if (match && match[1]) {
            return match[1];
        }

        // 3. Generic fallback: extract from 'src/' or 'backend/' onwards
        const srcIndex = unixPath.indexOf('/src/');
        if (srcIndex !== -1) {
            return unixPath.substring(srcIndex + 1);
        }

        return unixPath;
    };

    const fetchReverseImpact = async (targetPath: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const relativeUnixPath = formatToRelativeUnixPath(targetPath);
            let url = `${backendUrl}/api/v1/analyze/impact?file_path=${encodeURIComponent(relativeUnixPath)}`;

            if (repoId) {
                url += `&repo_id=${encodeURIComponent(repoId)}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch reverse impact analysis';
            setError(errorMsg);
            console.error('Reverse impact analysis error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (filePath && backendUrl) {
            fetchReverseImpact(filePath);
        }
    }, [filePath, backendUrl]);

    return { data, isLoading, error, fetchReverseImpact };
}
