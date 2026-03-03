import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CommitHistoryItem, CommitHistoryResponse } from '../api/types';

interface CommitDetailsProps {
    backendUrl: string;
    repoId?: string | null;
}

interface ContributorSummary {
    key: string;
    name: string;
    email: string;
    commits: number;
    filesChanged: number;
    uniqueFiles: number;
    lastAuthoredAt: string;
}

function formatTimestamp(value: string): string {
    if (!value) {
        return 'Unknown time';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString();
}

function shortSha(sha: string): string {
    return sha ? sha.slice(0, 8) : '';
}

export const CommitDetails: React.FC<CommitDetailsProps> = ({ backendUrl, repoId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [commits, setCommits] = useState<CommitHistoryItem[]>([]);

    const loadCommits = useCallback(async () => {
        if (!repoId) {
            setCommits([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `${backendUrl}/api/v1/commits/${encodeURIComponent(repoId)}?limit=200`
            );
            if (!response.ok) {
                const text = await response.text();
                let message = `Failed to load commit history (${response.status})`;
                if (text) {
                    try {
                        const parsed = JSON.parse(text) as { error?: string };
                        message = parsed.error || text;
                    } catch {
                        message = text;
                    }
                }
                throw new Error(message);
            }

            const payload: CommitHistoryResponse = await response.json();
            setCommits(payload.commits || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load commit history');
        } finally {
            setIsLoading(false);
        }
    }, [backendUrl, repoId]);

    useEffect(() => {
        loadCommits();
    }, [loadCommits]);

    useEffect(() => {
        const onGraphUpdated = () => {
            loadCommits();
        };
        window.addEventListener('archmind:graphUpdated', onGraphUpdated);
        return () => window.removeEventListener('archmind:graphUpdated', onGraphUpdated);
    }, [loadCommits]);

    const contributors = useMemo(() => {
        const map = new Map<string, ContributorSummary & { _files: Set<string> }>();

        for (const commit of commits) {
            const key = commit.author_email || commit.author_name || 'unknown';
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    name: commit.author_name || 'Unknown',
                    email: commit.author_email || 'Unknown',
                    commits: 0,
                    filesChanged: 0,
                    uniqueFiles: 0,
                    lastAuthoredAt: commit.authored_at || '',
                    _files: new Set<string>(),
                });
            }

            const summary = map.get(key)!;
            summary.commits += 1;
            summary.filesChanged += commit.files_changed_count || commit.changed_files?.length || 0;

            for (const file of commit.changed_files || []) {
                summary._files.add(file);
            }

            const currentTime = new Date(summary.lastAuthoredAt).getTime();
            const commitTime = new Date(commit.authored_at).getTime();
            if (!Number.isNaN(commitTime) && (Number.isNaN(currentTime) || commitTime > currentTime)) {
                summary.lastAuthoredAt = commit.authored_at;
            }
        }

        return Array.from(map.values())
            .map((item) => ({
                key: item.key,
                name: item.name,
                email: item.email,
                commits: item.commits,
                filesChanged: item.filesChanged,
                uniqueFiles: item._files.size,
                lastAuthoredAt: item.lastAuthoredAt,
            }))
            .sort((a, b) => b.commits - a.commits || b.filesChanged - a.filesChanged);
    }, [commits]);

    return (
        <div className="diagram-container commit-details">
            <div className="diagram-header">
                <div>
                    <h2>Repository Commits</h2>
                    <p>
                        Commit history and contributors from backend analysis and GitHub webhook-triggered
                        updates.
                    </p>
                </div>
                <div className="commit-controls">
                    <span className="diagram-pill">{repoId ? `Repo: ${repoId}` : 'Repo not available'}</span>
                    <button className="diagram-pill active" onClick={loadCommits} disabled={!repoId || isLoading}>
                        Refresh
                    </button>
                </div>
            </div>

            {!repoId && (
                <div className="diagram-state">
                    Analyze a repository with backend/webhook flow to load commit details.
                </div>
            )}

            {repoId && isLoading && <div className="diagram-state">Loading commit history...</div>}
            {repoId && error && <div className="diagram-state diagram-error">{error}</div>}

            {repoId && !isLoading && !error && commits.length === 0 && (
                <div className="diagram-state">
                    No commit data available yet. Trigger a backend analysis or let GitHub webhook processing finish.
                </div>
            )}

            {repoId && !isLoading && !error && commits.length > 0 && (
                <>
                    <section className="commit-section">
                        <h3>Top Contributors</h3>
                        <div className="commit-contributor-grid">
                            {contributors.map((contributor) => (
                                <article className="commit-contributor-card" key={contributor.key}>
                                    <div className="commit-contributor-name">{contributor.name}</div>
                                    <div className="commit-contributor-email">{contributor.email}</div>
                                    <div className="commit-contributor-meta">
                                        <span>{contributor.commits} commits</span>
                                        <span>{contributor.uniqueFiles} files</span>
                                        <span>{contributor.filesChanged} total file changes</span>
                                    </div>
                                    <div className="commit-contributor-time">
                                        Last commit: {formatTimestamp(contributor.lastAuthoredAt)}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="commit-section">
                        <h3>Recent Commits ({commits.length})</h3>
                        <div className="commit-list">
                            {commits.map((commit) => (
                                <article className="commit-card" key={commit.sha}>
                                    <div className="commit-card-header">
                                        <code>{shortSha(commit.sha)}</code>
                                        <span>{formatTimestamp(commit.authored_at)}</span>
                                    </div>
                                    <div className="commit-message">{commit.message || '(no message)'}</div>
                                    <div className="commit-meta">
                                        <span>{commit.author_name || 'Unknown author'}</span>
                                        <span>{commit.author_email || 'unknown'}</span>
                                        <span>
                                            {(commit.files_changed_count || commit.changed_files?.length || 0)} files
                                            changed
                                        </span>
                                    </div>
                                    {commit.changed_files && commit.changed_files.length > 0 && (
                                        <details className="commit-files">
                                            <summary>Changed files ({commit.changed_files.length})</summary>
                                            <ul>
                                                {commit.changed_files.map((file) => (
                                                    <li key={`${commit.sha}:${file}`}>{file}</li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};
