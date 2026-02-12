"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHeatmap = buildHeatmap;
exports.getHeatmapColor = getHeatmapColor;
exports.normalizePath = normalizePath;
exports.getMetric = getMetric;
exports.formatHeatmapTooltip = formatHeatmapTooltip;
exports.formatHeatmapMetric = formatHeatmapMetric;
function buildHeatmap(contributions, mode) {
    if (mode === 'off') {
        return { mode, entries: new Map(), maxMetric: 0, minMetric: 0 };
    }
    let maxMetric = 0;
    let minMetric = Number.POSITIVE_INFINITY;
    const entries = new Map();
    contributions.forEach((contribution) => {
        const metric = getMetric(contribution, mode);
        maxMetric = Math.max(maxMetric, metric);
        minMetric = Math.min(minMetric, metric);
    });
    if (!Number.isFinite(minMetric)) {
        minMetric = 0;
    }
    contributions.forEach((contribution) => {
        const metric = getMetric(contribution, mode);
        const color = metric > 0 ? getHeatmapColor(metric, maxMetric) : 'var(--am-panel-bg)';
        entries.set(normalizePath(contribution.file_path), {
            metric,
            color,
            tooltip: formatHeatmapTooltip(contribution),
            contribution,
        });
    });
    return { mode, entries, maxMetric, minMetric };
}
function getHeatmapColor(metric, maxMetric) {
    if (maxMetric <= 0) {
        return 'var(--am-panel-bg)';
    }
    const ratio = Math.min(metric / maxMetric, 1);
    const hue = 120 - ratio * 120;
    return `hsl(${hue}, 70%, 50%)`;
}
function normalizePath(path) {
    return path.replace(/\\/g, '/').toLowerCase();
}
function getMetric(contribution, mode) {
    switch (mode) {
        case 'commit_count':
            return contribution.commit_count || 0;
        case 'author_count':
            return contribution.contributor_count || contribution.contributors?.length || 0;
        case 'last_modified':
            return parseTimestamp(contribution.last_commit_date);
        default:
            return 0;
    }
}
function formatHeatmapTooltip(contribution) {
    const total = contribution.commit_count || 0;
    if (total <= 0) {
        return 'No commits recorded';
    }
    const contributors = (contribution.contributors || [])
        .slice()
        .sort((a, b) => b.commit_count - a.commit_count);
    if (contributors.length === 0 && contribution.primary_author) {
        return `${total} commits by ${contribution.primary_author} (100%)`;
    }
    const top = contributors.slice(0, 2).map((contributor) => {
        const percent = Math.round((contributor.commit_count / total) * 100);
        const label = contributor.email || contributor.name || 'unknown';
        return `${label} (${percent}%)`;
    });
    const remainder = contributors.length > 2 ? `, +${contributors.length - 2} more` : '';
    return `${total} commits by ${top.join(', ')}${remainder}`;
}
function formatHeatmapMetric(mode, metric) {
    if (mode === 'last_modified') {
        if (!metric)
            return 'Unknown';
        const date = new Date(metric);
        return date.toISOString().split('T')[0];
    }
    return Math.round(metric).toString();
}
function parseTimestamp(value) {
    if (!value)
        return 0;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
}
//# sourceMappingURL=heatmapUtils.js.map