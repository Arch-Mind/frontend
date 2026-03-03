"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitDetails = void 0;
const react_1 = __importStar(require("react"));
function formatTimestamp(value) {
    if (!value) {
        return 'Unknown time';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString();
}
function shortSha(sha) {
    return sha ? sha.slice(0, 8) : '';
}
const CommitDetails = ({ backendUrl, repoId }) => {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [commits, setCommits] = (0, react_1.useState)([]);
    const loadCommits = (0, react_1.useCallback)(async () => {
        if (!repoId) {
            setCommits([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const normalizedUrl = (backendUrl ?? '').replace(/\/+$/, '');
            const response = await fetch(`${normalizedUrl}/api/v1/commits/${encodeURIComponent(repoId)}?limit=200`);
            if (!response.ok) {
                const text = await response.text();
                let message = `Failed to load commit history (${response.status})`;
                if (text) {
                    try {
                        const parsed = JSON.parse(text);
                        message = parsed.error || text;
                    }
                    catch {
                        message = text;
                    }
                }
                throw new Error(message);
            }
            const payload = await response.json();
            setCommits(payload.commits || []);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load commit history');
        }
        finally {
            setIsLoading(false);
        }
    }, [backendUrl, repoId]);
    (0, react_1.useEffect)(() => {
        loadCommits();
    }, [loadCommits]);
    (0, react_1.useEffect)(() => {
        const onGraphUpdated = () => {
            loadCommits();
        };
        window.addEventListener('archmind:graphUpdated', onGraphUpdated);
        return () => window.removeEventListener('archmind:graphUpdated', onGraphUpdated);
    }, [loadCommits]);
    const contributors = (0, react_1.useMemo)(() => {
        const map = new Map();
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
                    _files: new Set(),
                });
            }
            const summary = map.get(key);
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
    return (react_1.default.createElement("div", { className: "diagram-container commit-details" },
        react_1.default.createElement("div", { className: "diagram-header" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", null, "Repository Commits"),
                react_1.default.createElement("p", null, "Commit history and contributors from backend analysis and GitHub webhook-triggered updates.")),
            react_1.default.createElement("div", { className: "commit-controls" },
                react_1.default.createElement("span", { className: "diagram-pill" }, repoId ? `Repo: ${repoId}` : 'Repo not available'),
                react_1.default.createElement("button", { className: "diagram-pill active", onClick: loadCommits, disabled: !repoId || isLoading }, "Refresh"))),
        !repoId && (react_1.default.createElement("div", { className: "diagram-state" }, "Analyze a repository with backend/webhook flow to load commit details.")),
        repoId && isLoading && react_1.default.createElement("div", { className: "diagram-state" }, "Loading commit history..."),
        repoId && error && react_1.default.createElement("div", { className: "diagram-state diagram-error" }, error),
        repoId && !isLoading && !error && commits.length === 0 && (react_1.default.createElement("div", { className: "diagram-state" }, "No commit data available yet. Trigger a backend analysis or let GitHub webhook processing finish.")),
        repoId && !isLoading && !error && commits.length > 0 && (react_1.default.createElement(react_1.default.Fragment, null,
            react_1.default.createElement("section", { className: "commit-section" },
                react_1.default.createElement("h3", null, "Top Contributors"),
                react_1.default.createElement("div", { className: "commit-contributor-grid" }, contributors.map((contributor) => (react_1.default.createElement("article", { className: "commit-contributor-card", key: contributor.key },
                    react_1.default.createElement("div", { className: "commit-contributor-name" }, contributor.name),
                    react_1.default.createElement("div", { className: "commit-contributor-email" }, contributor.email),
                    react_1.default.createElement("div", { className: "commit-contributor-meta" },
                        react_1.default.createElement("span", null,
                            contributor.commits,
                            " commits"),
                        react_1.default.createElement("span", null,
                            contributor.uniqueFiles,
                            " files"),
                        react_1.default.createElement("span", null,
                            contributor.filesChanged,
                            " total file changes")),
                    react_1.default.createElement("div", { className: "commit-contributor-time" },
                        "Last commit: ",
                        formatTimestamp(contributor.lastAuthoredAt))))))),
            react_1.default.createElement("section", { className: "commit-section" },
                react_1.default.createElement("h3", null,
                    "Recent Commits (",
                    commits.length,
                    ")"),
                react_1.default.createElement("div", { className: "commit-list" }, commits.map((commit) => (react_1.default.createElement("article", { className: "commit-card", key: commit.sha },
                    react_1.default.createElement("div", { className: "commit-card-header" },
                        react_1.default.createElement("code", null, shortSha(commit.sha)),
                        react_1.default.createElement("span", null, formatTimestamp(commit.authored_at))),
                    react_1.default.createElement("div", { className: "commit-message" }, commit.message || '(no message)'),
                    react_1.default.createElement("div", { className: "commit-meta" },
                        react_1.default.createElement("span", null, commit.author_name || 'Unknown author'),
                        react_1.default.createElement("span", null, commit.author_email || 'unknown'),
                        react_1.default.createElement("span", null,
                            (commit.files_changed_count || commit.changed_files?.length || 0),
                            " files changed")),
                    commit.changed_files && commit.changed_files.length > 0 && (react_1.default.createElement("details", { className: "commit-files" },
                        react_1.default.createElement("summary", null,
                            "Changed files (",
                            commit.changed_files.length,
                            ")"),
                        react_1.default.createElement("ul", null, commit.changed_files.map((file) => (react_1.default.createElement("li", { key: `${commit.sha}:${file}` }, file)))))))))))))));
};
exports.CommitDetails = CommitDetails;
//# sourceMappingURL=CommitDetails.js.map