// Graph types shared between ArchitectureGraph and utilities

export interface RawNode {
    id: string;
    label: string;
    type: 'file' | 'directory' | 'function' | 'class' | 'module';
    parentId?: string;
    extension?: string;
    language?: string;
    depth: number;
    filePath?: string;
    lineNumber?: number;
    endLineNumber?: number;
    status?: 'unchanged' | 'modified' | 'added' | 'deleted';
}

export interface RawEdge {
    id: string;
    source: string;
    target: string;
    type: string;
}
