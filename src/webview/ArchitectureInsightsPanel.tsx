// src/webview/ArchitectureInsightsPanel.tsx
import React from 'react';
import {
    ArchitectureInsightsResponse,
    ModuleInsight,
    PatternInsight,
    AntipatternItem,
} from '../api/types';

interface Props {
    repoId: string | null;
    insights: ArchitectureInsightsResponse | null;
    isLoading: boolean;
    onRefresh: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function severityColor(severity: AntipatternItem['severity']): string {
    switch (severity) {
        case 'critical': return '#ff4d4f';
        case 'high':     return '#ff7a00';
        case 'medium':   return '#faad14';
        default:         return '#8c8c8c';
    }
}

function couplingColor(concern: ModuleInsight['coupling_concern']): string {
    switch (concern) {
        case 'high':   return '#ff4d4f';
        case 'medium': return '#faad14';
        default:       return '#52c41a';
    }
}

function confidenceLabel(v: number | null): string {
    if (v === null || v === undefined) return '';
    const pct = Math.round(v * 100);
    return `${pct}% confidence`;
}

// ── sub-components ────────────────────────────────────────────────────────────

const PatternBanner: React.FC<{ pattern: PatternInsight }> = ({ pattern }) => (
    <div className="ai-pattern-banner">
        <div className="ai-pattern-header">
            <span className="ai-pattern-type">{pattern.pattern_type.toUpperCase()}</span>
            {pattern.confidence !== null && (
                <span className="ai-confidence-badge">{confidenceLabel(pattern.confidence)}</span>
            )}
        </div>
        <p className="ai-pattern-summary">{pattern.summary}</p>

        {pattern.patterns_found.length > 0 && (
            <div className="ai-tags-row">
                {pattern.patterns_found.map((p) => (
                    <span key={p} className="ai-tag ai-tag--green">{p}</span>
                ))}
            </div>
        )}
    </div>
);

const AntipatternCard: React.FC<{ item: AntipatternItem }> = ({ item }) => (
    <div className="ai-antipattern-card" style={{ borderLeftColor: severityColor(item.severity) }}>
        <div className="ai-antipattern-header">
            <span className="ai-antipattern-name">{item.name}</span>
            <span
                className="ai-severity-badge"
                style={{ background: severityColor(item.severity) }}
            >
                {item.severity}
            </span>
        </div>
        <p className="ai-antipattern-desc">{item.description}</p>
    </div>
);

const ModuleCard: React.FC<{ module: ModuleInsight }> = ({ module }) => (
    <div className="ai-module-card">
        <div className="ai-module-header">
            <span className="ai-module-name" title={module.file_path || module.name}>
                {module.name}
            </span>
            <div className="ai-module-chips">
                {module.role && module.role !== 'unknown' && (
                    <span className="ai-tag ai-tag--blue">{module.role}</span>
                )}
                <span
                    className="ai-tag"
                    style={{ background: couplingColor(module.coupling_concern), color: '#fff' }}
                >
                    {module.coupling_concern} coupling
                </span>
            </div>
        </div>
        {module.language && (
            <span className="ai-module-lang">{module.language}</span>
        )}
        <p className="ai-module-summary">{module.summary}</p>
    </div>
);

const LoadingSkeleton: React.FC = () => (
    <div className="ai-skeleton-wrap">
        <div className="ai-skeleton ai-skeleton--banner" />
        <div className="ai-skeleton ai-skeleton--row" />
        <div className="ai-skeleton ai-skeleton--row" />
        <div className="ai-skeleton ai-skeleton--row ai-skeleton--short" />
    </div>
);

// ── main component ────────────────────────────────────────────────────────────

export const ArchitectureInsightsPanel: React.FC<Props> = ({
    repoId,
    insights,
    isLoading,
    onRefresh,
}) => {
    if (!repoId) {
        return (
            <div className="ai-empty-state">
                <span className="ai-empty-icon">🏗️</span>
                <p>No repository loaded. Analyse a repository first.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="ai-panel">
                <div className="ai-toolbar">
                    <span className="ai-toolbar-title">AI Insights</span>
                    <button className="ai-refresh-btn" disabled>Generating…</button>
                </div>
                <LoadingSkeleton />
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="ai-panel">
                <div className="ai-toolbar">
                    <span className="ai-toolbar-title">AI Insights</span>
                    <button className="ai-refresh-btn" onClick={onRefresh}>
                        Generate Insights
                    </button>
                </div>
                <div className="ai-empty-state">
                    <span className="ai-empty-icon">✨</span>
                    <p>Click <strong>Generate Insights</strong> to analyse your architecture with Gemini AI.</p>
                </div>
            </div>
        );
    }

    const { pattern, modules, generated_at, cached } = insights;

    return (
        <div className="ai-panel">
            <div className="ai-toolbar">
                <span className="ai-toolbar-title">AI Insights</span>
                <div className="ai-toolbar-right">
                    {generated_at && (
                        <span className="ai-timestamp">
                            {cached ? '📦 cached · ' : ''}
                            {new Date(generated_at).toLocaleString()}
                        </span>
                    )}
                    <button className="ai-refresh-btn" onClick={onRefresh}>
                        ↻ Refresh
                    </button>
                </div>
            </div>

            <div className="ai-scroll-area">
                {/* Overall pattern */}
                <PatternBanner pattern={pattern} />

                {/* Recommendations */}
                {pattern.recommendations.length > 0 && (
                    <section className="ai-section">
                        <h3 className="ai-section-title">Recommendations</h3>
                        <ul className="ai-recommendations">
                            {pattern.recommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Anti-patterns */}
                {pattern.antipatterns.length > 0 && (
                    <section className="ai-section">
                        <h3 className="ai-section-title">⚠️ Anti-patterns Detected</h3>
                        <div className="ai-antipatterns-list">
                            {pattern.antipatterns.map((ap, i) => (
                                <AntipatternCard key={i} item={ap} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Module / file summaries */}
                {modules.length > 0 && (
                    <section className="ai-section">
                        <h3 className="ai-section-title">
                            {modules[0].file_path ? 'File Summaries' : 'Module Summaries'}
                        </h3>
                        <div className="ai-modules-grid">
                            {modules.map((m, i) => (
                                <ModuleCard key={i} module={m} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ArchitectureInsightsPanel;
