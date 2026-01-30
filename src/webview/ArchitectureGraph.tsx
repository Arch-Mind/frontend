import React, { useCallback } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node
} from 'reactflow';

import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'src' } },
    { id: '2', position: { x: 0, y: 100 }, data: { label: 'extension.ts' } },
    { id: '3', position: { x: 200, y: 100 }, data: { label: 'webview' } },
];
const ArchitectureGraph: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    React.useEffect(() => {
        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'architectureData') {
                const { nodes: rawNodes, edges: rawEdges } = message.data;

                // Layout logic (simple grid/tree for now)
                const layoutedNodes = rawNodes.map((n: any, index: number) => ({
                    id: n.id,
                    data: { label: n.label },
                    position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 100 },
                }));

                setNodes(layoutedNodes);
                setEdges(rawEdges);
            }
        });

        // Request data
        // @ts-ignore
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'requestArchitecture' });

    }, []);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
        >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
        </ReactFlow>
    );
};

export default ArchitectureGraph;
