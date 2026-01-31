import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface GraphNode {
    id: string;
    label: string;
    type: 'file' | 'directory' | 'function' | 'class' | 'module';
    parentId?: string;
    filePath: string;
    relativePath: string;
    lineNumber?: number;
    fileExtension?: string;
    size?: number;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

function getFileExtension(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    return ext ? ext.substring(1) : '';
}

function determineNodeType(entry: fs.Dirent, extension: string): GraphNode['type'] {
    if (entry.isDirectory()) {
        return 'directory';
    }
    // Treat index files as modules
    if (entry.name.startsWith('index.')) {
        return 'module';
    }
    return 'file';
}

export async function analyzeWorkspace(rootPath: string): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    async function traverse(currentPath: string, parentId?: string) {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'out') {
                continue;
            }

            const fullPath = path.join(currentPath, entry.name);
            const relativePath = path.relative(rootPath, fullPath);
            const id = fullPath;
            const label = entry.name;
            const fileExtension = getFileExtension(entry.name);
            const type = determineNodeType(entry, fileExtension);

            let size: number | undefined;
            if (!entry.isDirectory()) {
                try {
                    const stats = await fs.promises.stat(fullPath);
                    size = stats.size;
                } catch {
                    size = undefined;
                }
            }

            nodes.push({
                id,
                label,
                type,
                parentId,
                filePath: fullPath,
                relativePath,
                lineNumber: 1,
                fileExtension,
                size
            });

            if (parentId) {
                edges.push({
                    id: `e-${parentId}-${id}`,
                    source: parentId,
                    target: id
                });
            }

            if (entry.isDirectory()) {
                await traverse(fullPath, id);
            }
        }
    }

    await traverse(rootPath);
    return { nodes, edges };
}
