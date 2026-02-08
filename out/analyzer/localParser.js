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
exports.LocalParser = void 0;
const vscode = __importStar(require("vscode"));
const web_tree_sitter_1 = require("web-tree-sitter");
// Supported languages map: extension -> grammar
const LANGUAGE_MAP = {
    'typescript': 'tree-sitter-typescript',
    'javascript': 'tree-sitter-javascript',
    'python': 'tree-sitter-python',
    'rust': 'tree-sitter-rust',
    'go': 'tree-sitter-go'
};
class LocalParser {
    constructor(extensionUri) {
        this.parsers = new Map();
        this.isInitialized = false;
        this.extensionUri = extensionUri;
    }
    static getInstance(extensionUri) {
        if (!LocalParser.instance) {
            LocalParser.instance = new LocalParser(extensionUri);
        }
        return LocalParser.instance;
    }
    /**
     * Initialize web-tree-sitter and load grammars
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Initialize main web-tree-sitter
            const wasmPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'grammars', 'tree-sitter.wasm').fsPath;
            await web_tree_sitter_1.Parser.init({
                locateFile: () => wasmPath
            });
            this.isInitialized = true;
            console.log('LocalParser initialized');
        }
        catch (error) {
            console.error('Failed to initialize LocalParser:', error);
        }
    }
    /**
     * Get or load a parser for the given languageId
     */
    async getParser(languageId) {
        if (!this.isInitialized)
            await this.initialize();
        const grammarName = LANGUAGE_MAP[languageId];
        if (!grammarName)
            return undefined;
        if (this.parsers.has(languageId)) {
            return this.parsers.get(languageId);
        }
        try {
            const grammarPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'grammars', `${grammarName}.wasm`).fsPath;
            const lang = await web_tree_sitter_1.Language.load(grammarPath);
            const parser = new web_tree_sitter_1.Parser();
            parser.setLanguage(lang);
            this.parsers.set(languageId, parser);
            return parser;
        }
        catch (error) {
            console.error(`Failed to load grammar for ${languageId}:`, error);
            return undefined;
        }
    }
    /**
     * Parse text and return symbols
     */
    async parse(document) {
        const parser = await this.getParser(document.languageId);
        if (!parser)
            return []; // Language not supported
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
    extractSymbols(node) {
        const symbols = [];
        const symbol = this.getSymbolInfo(node);
        if (symbol) {
            // Recurse into children to find methods inside classes, etc.
            const childrenSymbols = [];
            for (const child of node.children) {
                childrenSymbols.push(...this.extractSymbols(child));
            }
            if (childrenSymbols.length > 0) {
                symbol.children = childrenSymbols;
            }
            symbols.push(symbol);
        }
        else {
            // If current node is not a symbol, just bubble up children symbols
            for (const child of node.children) {
                symbols.push(...this.extractSymbols(child));
            }
        }
        return symbols;
    }
    getSymbolInfo(node) {
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
    getNodeName(node) {
        // Tree-sitter grammars vary. 
        // JS/TS: 'name' field
        // Python: 'name' field
        // Go: 'name' field
        const nameNode = node.childForFieldName('name');
        if (nameNode)
            return nameNode.text;
        // Fallback: look for identifier child
        for (const child of node.children) {
            if (child.type === 'identifier' || child.type === 'type_identifier') {
                return child.text;
            }
        }
        return 'anonymous';
    }
}
exports.LocalParser = LocalParser;
//# sourceMappingURL=localParser.js.map