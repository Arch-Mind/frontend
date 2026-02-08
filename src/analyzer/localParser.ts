
import * as vscode from 'vscode';
import * as path from 'path';
import { Parser, Language, Tree, Node } from 'web-tree-sitter';

// Supported languages map: extension -> grammar
const LANGUAGE_MAP: Record<string, string> = {
    'typescript': 'tree-sitter-typescript',
    'javascript': 'tree-sitter-javascript',
    'python': 'tree-sitter-python',
    'rust': 'tree-sitter-rust',
    'go': 'tree-sitter-go'
};

export interface LocalSymbol {
    name: string;
    kind: 'function' | 'class' | 'method' | 'variable';
    startLine: number;
    endLine: number;
    children?: LocalSymbol[];
}

export class LocalParser {
    private static instance: LocalParser;
    private parsers: Map<string, Parser> = new Map();
    private isInitialized = false;
    private extensionUri: vscode.Uri;

    private constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    public static getInstance(extensionUri: vscode.Uri): LocalParser {
        if (!LocalParser.instance) {
            LocalParser.instance = new LocalParser(extensionUri);
        }
        return LocalParser.instance;
    }

    /**
     * Initialize web-tree-sitter and load grammars
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Initialize main web-tree-sitter
            const wasmPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'grammars', 'tree-sitter.wasm').fsPath;
            await Parser.init({
                locateFile: () => wasmPath
            });

            this.isInitialized = true;
            console.log('LocalParser initialized');
        } catch (error) {
            console.error('Failed to initialize LocalParser:', error);
        }
    }

    /**
     * Get or load a parser for the given languageId
     */
    private async getParser(languageId: string): Promise<Parser | undefined> {
        if (!this.isInitialized) await this.initialize();

        const grammarName = LANGUAGE_MAP[languageId];
        if (!grammarName) return undefined;

        if (this.parsers.has(languageId)) {
            return this.parsers.get(languageId);
        }

        try {
            const grammarPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'grammars', `${grammarName}.wasm`).fsPath;
            const lang = await Language.load(grammarPath);
            const parser = new Parser();
            parser.setLanguage(lang);
            this.parsers.set(languageId, parser);
            return parser;
        } catch (error) {
            console.error(`Failed to load grammar for ${languageId}:`, error);
            return undefined;
        }
    }

    /**
     * Parse text and return symbols
     */
    public async parse(document: vscode.TextDocument): Promise<LocalSymbol[]> {
        const parser = await this.getParser(document.languageId);
        if (!parser) return []; // Language not supported

        const start = performance.now();
        const tree = parser.parse(document.getText());

        if (!tree) {
            console.error('Failed to parse document');
            return [];
        }

        const duration = performance.now() - start;
        console.log(`Parsed ${document.fileName} in ${duration.toFixed(2)}ms`);

        const symbols = this.extractSymbols(tree.rootNode);

        // Don't forget to delete the tree to free memory
        tree.delete();

        return symbols;
    }

    private extractSymbols(node: Node): LocalSymbol[] {
        const symbols: LocalSymbol[] = [];
        const symbol = this.getSymbolInfo(node);

        if (symbol) {
            // Recurse into children to find methods inside classes, etc.
            const childrenSymbols: LocalSymbol[] = [];
            for (const child of node.children) {
                childrenSymbols.push(...this.extractSymbols(child));
            }
            if (childrenSymbols.length > 0) {
                symbol.children = childrenSymbols;
            }
            symbols.push(symbol);
        } else {
            // If current node is not a symbol, just bubble up children symbols
            for (const child of node.children) {
                symbols.push(...this.extractSymbols(child));
            }
        }

        return symbols;
    }

    private getSymbolInfo(node: Node): LocalSymbol | null {
        switch (node.type) {
            case 'function_declaration':
            case 'function_definition':
            case 'func_def':
            case 'method_definition':
            case 'method_declaration':
                return {
                    name: this.getNodeName(node),
                    kind: node.type.includes('method') ? 'method' : 'function',
                    startLine: node.startPosition.row + 1,
                    endLine: node.endPosition.row + 1
                };
            case 'class_declaration':
            case 'class_definition':
                return {
                    name: this.getNodeName(node),
                    kind: 'class',
                    startLine: node.startPosition.row + 1,
                    endLine: node.endPosition.row + 1
                };
            // Python/Go specific checks might be needed here
        }
        return null;
    }

    private getNodeName(node: Node): string {
        // Tree-sitter grammars vary. 
        // JS/TS: 'name' field
        // Python: 'name' field
        // Go: 'name' field
        const nameNode = node.childForFieldName('name');
        if (nameNode) return nameNode.text;

        // Fallback: look for identifier child
        for (const child of node.children) {
            if (child.type === 'identifier' || child.type === 'type_identifier') {
                return child.text;
            }
        }
        return 'anonymous';
    }
}
