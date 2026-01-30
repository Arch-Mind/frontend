import React, { useCallback, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
    BackgroundVariant,
    NodeMouseHandler,
} from 'reactflow';

import 'reactflow/dist/style.css';

// Types matching the backend analyzer
interface RawNode {
    id: string;
    label: string;
    type: 'file' | 'directory';
    parentId?: string;
    extension?: string;
    language?: string;
    depth: number;
}

interface RawEdge {
    id: string;
    source: string;
    target: string;
    type: string;
}

interface GraphStats {
    totalFiles: number;
    totalDirectories: number;
    filesByLanguage: Record<string, number>;
}

interface ArchitectureData {
    nodes: RawNode[];
    edges: RawEdge[];
    stats: GraphStats;
}

// Color scheme for different node types
const NODE_COLORS: Record<string, string> = {
    directory: '#4a9eff',
    typescript: '#3178c6',
    javascript: '#f7df1e',
    json: '#292929',
    markdown: '#083fa1',
    css: '#264de4',
    python: '#3776ab',
    rust: '#dea584',
    go: '#00add8',
    default: '#6b7280',
};

// Get color based on node type/language
function getNodeColor(node: RawNode): string {
    if (node.type === 'directory') return NODE_COLORS.directory;
    if (node.language) return NODE_COLORS[node.language] || NODE_COLORS.default;
    return NODE_COLORS.default;
}

// Hierarchical layout algorithm
function calculateHierarchicalLayout(nodes: RawNode[], edges: RawEdge[]): Node[] {
    // Group nodes by depth
    const nodesByDepth: Map<number, RawNode[]> = new Map();
    nodes.forEach(node => {
        const depthNodes = nodesByDepth.get(node.depth) || [];
        depthNodes.push(node);
        nodesByDepth.set(node.depth, depthNodes);
    });

    const layoutedNodes: Node[] = [];
    const horizontalSpacing = 220;
    const verticalSpacing = 80;

    nodesByDepth.forEach((depthNodes, depth) => {
        const totalWidth = depthNodes.length * horizontalSpacing;
        const startX = -totalWidth / 2;

        depthNodes.forEach((node, index) => {
            const color = getNodeColor(node);
            layoutedNodes.push({
                id: node.id,
                data: {
                    label: node.label,
                    type: node.type,
                    language: node.language,
                    extension: node.extension,
                },
                position: {
                    x: startX + index * horizontalSpacing,
                    y: depth * verticalSpacing,
                },
                style: {
                    background: node.type === 'directory' 
                        ? `${color}20` 
                        : 'var(--vscode-editor-background)',
                    borderColor: color,
                    borderWidth: node.type === 'directory' ? 2 : 1,
                    borderRadius: node.type === 'directory' ? 8 : 4,
                },
            });
        });
    });

    return layoutedNodes;
}

// Format edges with proper styling
function formatEdges(rawEdges: RawEdge[]): Edge[] {
    return rawEdges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        style: {
            stroke: 'var(--vscode-editor-foreground)',
            strokeWidth: 1,
            opacity: 0.5,
        },
    }));
}

// Declare VS Code API type
declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

interface StatsDisplayProps {
    stats: GraphStats | null;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="stats-panel">
            <div className="stat-item">
                <span className="stat-label">Files:</span>
                <span className="stat-value">{stats.totalFiles}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">Directories:</span>
                <span className="stat-value">{stats.totalDirectories}</span>
            </div>
            {Object.entries(stats.filesByLanguage).length > 0 && (
                <div className="stat-languages">
                    {Object.entries(stats.filesByLanguage)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([lang, count]) => (
                            <span key={lang} className="language-badge" style={{
                                backgroundColor: NODE_COLORS[lang] || NODE_COLORS.default,
                            }}>
                                {lang}: {count}
                            </span>
                        ))}
                </div>
            )}
        </div>
    );
};

const ArchitectureGraph: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [stats, setStats] = useState<GraphStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
        setSelectedNode(node.id);
    }, []);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const data: ArchitectureData = message.data;
                const { nodes: rawNodes, edges: rawEdges, stats: graphStats } = data;

                // Apply hierarchical layout
                const layoutedNodes = calculateHierarchicalLayout(rawNodes, rawEdges);
                const formattedEdges = formatEdges(rawEdges);

                setNodes(layoutedNodes);
                setEdges(formattedEdges);
                setStats(graphStats);
                setIsLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request data from extension
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'requestArchitecture' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [setNodes, setEdges]);

    // Memoize minimap node color function
    const minimapNodeColor = useCallback((node: Node) => {
        if (node.data?.type === 'directory') return NODE_COLORS.directory;
        if (node.data?.language) return NODE_COLORS[node.data.language] || NODE_COLORS.default;
        return NODE_COLORS.default;
    }, []);

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p>Analyzing workspace structure...</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <StatsDisplay stats={stats} />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                }}
            >
                <Controls showInteractive={false} />
                <MiniMap 
                    nodeColor={minimapNodeColor}
                    maskColor="rgba(0, 0, 0, 0.8)"
                    style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                    }}
                />
                <Background 
                    variant={BackgroundVariant.Dots}
                    gap={16} 
                    size={1} 
                    color="var(--vscode-editor-foreground)"
                    style={{ opacity: 0.1 }}
                />
            </ReactFlow>
        </div>
    );
};

export default ArchitectureGraph;
