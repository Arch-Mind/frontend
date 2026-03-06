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
exports.AnalysisService = void 0;
const vscode = __importStar(require("vscode"));
const fileSystem_1 = require("../analyzer/fileSystem");
class AnalysisService {
    constructor() {
        this.data = null;
        this.isAnalyzing = false;
        this._onDidAnalysisChange = new vscode.EventEmitter();
        this.onDidAnalysisChange = this._onDidAnalysisChange.event;
    }
    static getInstance() {
        if (!AnalysisService.instance) {
            AnalysisService.instance = new AnalysisService();
        }
        return AnalysisService.instance;
    }
    async analyze(rootPath) {
        if (this.isAnalyzing) {
            // Return existing data if available, or wait? 
            // For now, simple lock preventing concurrent full analysis
            if (this.data)
                return this.data;
            throw new Error('Analysis already in progress');
        }
        this.isAnalyzing = true;
        try {
            const result = await (0, fileSystem_1.analyzeWorkspace)(rootPath);
            this.data = {
                ...result,
                timestamp: Date.now()
            };
            this._onDidAnalysisChange.fire(this.data);
            return this.data;
        }
        finally {
            this.isAnalyzing = false;
        }
    }
    getData() {
        return this.data;
    }
    /**
     * Get incoming calls (callers) for a specific function/symbol
     */
    getCallers(filePath, functionName) {
        if (!this.data)
            return [];
        // Find the node ID for this function
        // The ID format in fileSystem.ts depends on how it's constructed.
        // Usually it's the file path for files.
        // For functions, implementation in fileSystem.ts:
        // const id = `${fullPath}#${symbol.name}`;
        // Let's try to find the node matching the file path and function name
        // Or construct the ID if we know the convention
        const expectedId = `${filePath}#${functionName}`;
        // Check if node exists (optional, but good for validation)
        const node = this.data.nodes.find(n => n.id === expectedId);
        // If we can't find by ID directly, we might need to search by properties
        // But assuming the convention from fileSystem.ts holds:
        return this.data.edges.filter(edge => edge.target === expectedId && edge.type === 'calls');
    }
    /**
     * Get outgoing calls from a specific function
     */
    getCalls(filePath, functionName) {
        if (!this.data)
            return [];
        const expectedId = `${filePath}#${functionName}`;
        return this.data.edges.filter(edge => edge.source === expectedId && edge.type === 'calls');
    }
}
exports.AnalysisService = AnalysisService;
//# sourceMappingURL=analysisService.js.map