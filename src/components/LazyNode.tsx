import React, { memo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';

export interface LazyNodeData {
    label: string;
    type?: string;
    icon?: string;
    color?: string;
    isHighlighted?: boolean;
    detailLevel?: 'full' | 'simplified' | 'minimal';
}

/**
 * Lazy-loaded node with intersection observer
 */
export const LazyNode: React.FC<NodeProps<LazyNodeData>> = memo(({ data, selected }) => {
    const [isVisible, setIsVisible] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!nodeRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    setIsVisible(entry.isIntersecting);
                });
            },
            { rootMargin: '100px', threshold: 0.01 }
        );

        observer.observe(nodeRef.current);

        return () => {
            if (nodeRef.current) {
                observer.unobserve(nodeRef.current);
            }
        };
    }, []);

    const detailLevel = data.detailLevel || 'full';

    // Minimal dot when not visible or zoomed out
    if (!isVisible || detailLevel === 'minimal') {
        return (
            <div
                ref={nodeRef}
                style={{
                    width: 10,
                    height: 10,
                    background: data.color || '#4a9eff',
                    borderRadius: '50%',
                    border: selected ? '2px solid #ffd700' : 'none',
                }}
            >
                <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
                <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
            </div>
        );
    }

    // Simplified rendering
    if (detailLevel === 'simplified') {
        return (
            <div
                ref={nodeRef}
                style={{
                    padding: '6px 12px',
                    background: data.color || '#2d2d2d',
                    border: `2px solid ${selected ? '#ffd700' : data.isHighlighted ? '#ff6b6b' : '#4a9eff'}`,
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                <Handle type="target" position={Position.Top} />
                {data.label}
                <Handle type="source" position={Position.Bottom} />
            </div>
        );
    }

    // Full rendering
    return (
        <div
            ref={nodeRef}
            style={{
                padding: '12px 16px',
                background: data.color || '#2d2d2d',
                border: `2px solid ${selected ? '#ffd700' : data.isHighlighted ? '#ff6b6b' : '#4a9eff'}`,
                borderRadius: '6px',
                boxShadow: selected ? '0 4px 12px rgba(74, 158, 255, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
                minWidth: '150px',
                maxWidth: '250px',
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: '#4a9eff', width: 8, height: 8 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {data.icon && <span style={{ fontSize: '16px' }}>{data.icon}</span>}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                        style={{
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: selected ? 600 : 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {data.label}
                    </div>
                    {data.type && (
                        <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
                            {data.type}
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} style={{ background: '#4a9eff', width: 8, height: 8 }} />
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.selected === nextProps.selected &&
        prevProps.data.label === nextProps.data.label &&
        prevProps.data.isHighlighted === nextProps.data.isHighlighted &&
        prevProps.data.detailLevel === nextProps.data.detailLevel
    );
});

LazyNode.displayName = 'LazyNode';

/**
 * Placeholder node during loading
 */
export const PlaceholderNode: React.FC<NodeProps> = memo(() => {
    return (
        <div
            style={{
                width: '150px',
                height: '40px',
                background: '#1e1e1e',
                border: '1px solid #444',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite',
            }}
        >
            <style>
                {`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }`}
            </style>
            <div style={{ color: '#666', fontSize: '11px' }}>Loading...</div>
        </div>
    );
});

PlaceholderNode.displayName = 'PlaceholderNode';
