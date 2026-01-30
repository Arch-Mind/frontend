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
exports.analyzeWorkspace = analyzeWorkspace;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// File extension to language mapping for better visualization
const FILE_EXTENSIONS = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.scss': 'css',
    '.html': 'html',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
};
// Directories to ignore during traversal
const IGNORED_DIRECTORIES = new Set([
    'node_modules',
    'out',
    'dist',
    'build',
    '.git',
    '.vscode',
    'coverage',
    '__pycache__',
    'target',
    'vendor',
]);
/**
 * Determines if a file or directory should be ignored during analysis
 */
function shouldIgnore(name) {
    return name.startsWith('.') || IGNORED_DIRECTORIES.has(name);
}
/**
 * Extracts file extension and determines programming language
 */
function getFileMetadata(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (!ext)
        return {};
    return {
        extension: ext.slice(1), // Remove the dot
        language: FILE_EXTENSIONS[ext],
    };
}
/**
 * Analyzes a workspace directory and builds a graph representation
 * @param rootPath - The root directory path to analyze
 * @returns Promise containing graph data with nodes, edges, and statistics
 */
async function analyzeWorkspace(rootPath) {
    const nodes = [];
    const edges = [];
    const stats = {
        totalFiles: 0,
        totalDirectories: 0,
        filesByLanguage: {},
    };
    async function traverse(currentPath, depth, parentId) {
        let entries;
        try {
            entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        }
        catch (error) {
            // Skip directories we can't read (permission issues, etc.)
            console.warn(`Unable to read directory: ${currentPath}`);
            return;
        }
        // Sort entries: directories first, then files, both alphabetically
        entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory())
                return -1;
            if (!a.isDirectory() && b.isDirectory())
                return 1;
            return a.name.localeCompare(b.name);
        });
        for (const entry of entries) {
            if (shouldIgnore(entry.name)) {
                continue;
            }
            const fullPath = path.join(currentPath, entry.name);
            const id = fullPath;
            const label = entry.name;
            const isDirectory = entry.isDirectory();
            const type = isDirectory ? 'directory' : 'file';
            // Get file metadata for files
            const metadata = isDirectory ? {} : getFileMetadata(entry.name);
            // Update statistics
            if (isDirectory) {
                stats.totalDirectories++;
            }
            else {
                stats.totalFiles++;
                if (metadata.language) {
                    stats.filesByLanguage[metadata.language] =
                        (stats.filesByLanguage[metadata.language] || 0) + 1;
                }
            }
            nodes.push({
                id,
                label,
                type,
                parentId,
                depth,
                ...metadata,
            });
            if (parentId) {
                edges.push({
                    id: `e-${parentId}-${id}`,
                    source: parentId,
                    target: id,
                    type: 'contains',
                });
            }
            if (isDirectory) {
                await traverse(fullPath, depth + 1, id);
            }
        }
    }
    // Add root node
    const rootName = path.basename(rootPath);
    nodes.push({
        id: rootPath,
        label: rootName,
        type: 'directory',
        depth: 0,
    });
    stats.totalDirectories++;
    await traverse(rootPath, 1, rootPath);
    return { nodes, edges, stats };
}
//# sourceMappingURL=fileSystem.js.map