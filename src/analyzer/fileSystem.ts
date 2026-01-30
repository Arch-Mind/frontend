import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface GraphNode {
    id: string;
    label: string;
    type: 'file' | 'directory';
    parentId?: string;
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
            const id = fullPath; // Use full path as ID for simplicity
            const label = entry.name;
            const type = entry.isDirectory() ? 'directory' : 'file';

            nodes.push({ id, label, type, parentId });

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
