import * as path from 'path';
import * as fs from 'fs';
import { parseFileDependencies } from './dependencyParser';

// File extension to language mapping for better visualization
const FILE_EXTENSIONS: Record<string, string> = {
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

export type NodeType = 'file' | 'directory';

export interface GraphNode {
    id: string;
    label: string;
    type: NodeType;
    parentId?: string;
    /** File extension without the dot (e.g., 'ts', 'js') */
    extension?: string;
    /** Programming language detected from extension */
    language?: string;
    /** Depth level in the directory tree (root = 0) */
    depth: number;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    /** Relationship type for future expansion */
    type: 'contains' | 'imports' | 'calls';
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    /** Statistics about the analyzed workspace */
    stats: {
        totalFiles: number;
        totalDirectories: number;
        filesByLanguage: Record<string, number>;
    };
}

/**
 * Determines if a file or directory should be ignored during analysis
 */
function shouldIgnore(name: string): boolean {
    return name.startsWith('.') || IGNORED_DIRECTORIES.has(name);
}

/**
 * Extracts file extension and determines programming language
 */
function getFileMetadata(filename: string): { extension?: string; language?: string } {
    const ext = path.extname(filename).toLowerCase();
    if (!ext) return {};

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
export async function analyzeWorkspace(rootPath: string): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const stats = {
        totalFiles: 0,
        totalDirectories: 0,
        filesByLanguage: {} as Record<string, number>,
    };

    async function traverse(currentPath: string, depth: number, parentId?: string): Promise<void> {
        let entries: fs.Dirent[];

        try {
            entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        } catch (error) {
            // Skip directories we can't read (permission issues, etc.)
            console.warn(`Unable to read directory: ${currentPath}`);
            return;
        }

        // Sort entries: directories first, then files, both alphabetically
        entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
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
            const type: NodeType = isDirectory ? 'directory' : 'file';

            // Get file metadata for files
            const metadata = isDirectory ? {} : getFileMetadata(entry.name);

            // Update statistics
            if (isDirectory) {
                stats.totalDirectories++;
            } else {
                stats.totalFiles++;
                if (metadata.language) {
                    stats.filesByLanguage[metadata.language] =
                        (stats.filesByLanguage[metadata.language] || 0) + 1;
                }

                // Analyze dependencies for supported files
                if (['typescript', 'javascript'].includes(metadata.language || '')) {
                    const dependencies = parseFileDependencies(fullPath);
                    for (const depPath of dependencies) {
                        edges.push({
                            id: `e-${id}-${depPath}`,
                            source: id,
                            target: depPath,
                            type: 'imports',
                        });
                    }
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
