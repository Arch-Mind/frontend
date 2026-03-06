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
exports.GitAnalysisService = void 0;
const cp = __importStar(require("child_process"));
const path = __importStar(require("path"));
class GitAnalysisService {
    constructor() { }
    static getInstance() {
        if (!GitAnalysisService.instance) {
            GitAnalysisService.instance = new GitAnalysisService();
        }
        return GitAnalysisService.instance;
    }
    /**
     * Execute a git command in the given directory
     */
    async runGitCommand(args, cwd) {
        return new Promise((resolve, reject) => {
            cp.exec(`git ${args.join(' ')}`, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(stdout.trim());
                }
            });
        });
    }
    /**
     * Get git stats for a specific file
     */
    async getFileStats(filePath, rootPath) {
        try {
            const relativePath = path.relative(rootPath, filePath);
            // Get commit count
            const countOutput = await this.runGitCommand(['rev-list', '--count', 'HEAD', '--', relativePath], rootPath);
            const commitCount = parseInt(countOutput, 10);
            if (isNaN(commitCount) || commitCount === 0) {
                return null;
            }
            // Get last modified and created timestamps
            const datesOutput = await this.runGitCommand(['log', '--format=%at', '--', relativePath], rootPath);
            const timestamps = datesOutput.split('\n').map(t => parseInt(t, 10)).filter(t => !isNaN(t));
            const lastModified = timestamps.length > 0 ? timestamps[0] * 1000 : 0;
            const created = timestamps.length > 0 ? timestamps[timestamps.length - 1] * 1000 : 0;
            // Get authors
            const authorsOutput = await this.runGitCommand(['shortlog', '-s', '-n', '-e', 'HEAD', '--', relativePath], rootPath);
            const authors = authorsOutput.split('\n').filter(line => line.trim() !== '').map(line => {
                const match = line.match(/\s*(\d+)\s+(.+)\s+<(.+)>/);
                if (match) {
                    return {
                        count: parseInt(match[1], 10),
                        name: match[2].trim(),
                        email: match[3].trim()
                    };
                }
                return null;
            }).filter((a) => a !== null);
            return {
                filePath: relativePath,
                commitCount,
                authors,
                lastModified,
                created
            };
        }
        catch (error) {
            console.error(`Failed to get git stats for ${filePath}:`, error);
            return null;
        }
    }
    /**
     * Get stats for all files in the repository (bulk optimization)
     */
    async getRepoStats(rootPath) {
        const stats = [];
        try {
            // 1. Get all files tracked by git
            const filesOutput = await this.runGitCommand(['ls-files'], rootPath);
            const files = filesOutput.split('\n').filter(f => f.trim() !== '');
            // For a large repo, doing per-file commands is too slow.
            // We'll use a simplified approach for bulk: 
            // - Get total commit count per file (git log --name-only --format="") -> rudimentary
            // - OR rely on `git log --numstat` parsing.
            // Better approach for bulk heatmap:
            // Parse the entire log once? No, that's huge.
            // We will limit to the last N commits or just do per-file for the active viewport (not possible here easily).
            // Let's try a bulk `git log --name-only` approach to build stats map.
            // This is memory intensive but faster than N processes.
            // Limit to last 1000 commits for performance? Or unlimited?
            // "git log --name-only --format='%aN <%aE> %at'"
            // Output:
            // Author Name <email> timestamp
            // file1.ts
            // file2.ts
            const maxCommits = 2000; // Limit for performance
            const logOutput = await this.runGitCommand(['log', `-n ${maxCommits}`, '--name-only', '--format="###%aN|%aE|%at"'], rootPath);
            const lines = logOutput.split('\n');
            const fileMap = new Map();
            let currentAuthorName = '';
            let currentAuthorEmail = '';
            let currentTimestamp = 0;
            for (const line of lines) {
                if (line.startsWith('###')) {
                    const parts = line.substring(3).split('|');
                    currentAuthorName = parts[0];
                    currentAuthorEmail = parts[1];
                    currentTimestamp = parseInt(parts[2], 10) * 1000;
                    continue;
                }
                const filePath = line.trim();
                if (!filePath)
                    continue;
                // Normalize path separator
                const normalizedPath = filePath.replace(/\\/g, '/');
                if (!fileMap.has(normalizedPath)) {
                    fileMap.set(normalizedPath, {
                        commitCount: 0,
                        authors: new Map(),
                        lastModified: currentTimestamp, // First time we see it (latest commit)
                        created: currentTimestamp
                    });
                }
                const entry = fileMap.get(normalizedPath);
                entry.commitCount++;
                entry.created = currentTimestamp; // Last time we see it will be the oldest (creation)
                const authorKey = `${currentAuthorName}|${currentAuthorEmail}`;
                entry.authors.set(authorKey, (entry.authors.get(authorKey) || 0) + 1);
            }
            // Convert map to results
            for (const [filePath, data] of fileMap) {
                const authorsList = Array.from(data.authors.entries()).map(([key, count]) => {
                    const [name, email] = key.split('|');
                    return { name, email, count };
                }).sort((a, b) => b.count - a.count);
                stats.push({
                    filePath,
                    commitCount: data.commitCount,
                    authors: authorsList,
                    lastModified: data.lastModified,
                    created: data.created
                });
            }
        }
        catch (error) {
            console.warn('Bulk git stats failed, falling back or partial', error);
        }
        return stats;
    }
}
exports.GitAnalysisService = GitAnalysisService;
//# sourceMappingURL=gitAnalysisService.js.map