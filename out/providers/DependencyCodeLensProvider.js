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
exports.DependencyCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const localParser_1 = require("../analyzer/localParser");
class DependencyCodeLensProvider {
    constructor(analysisService) {
        this.analysisService = analysisService;
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
        // Refresh lenses when analysis data changes
        this.analysisService.onDidAnalysisChange(() => {
            this._onDidChangeCodeLenses.fire();
        });
    }
    async provideCodeLenses(document, token) {
        // Only provide for supported languages
        const supportedLangs = ['typescript', 'javascript', 'python', 'rust', 'go'];
        if (!supportedLangs.includes(document.languageId))
            return [];
        // Parse document locally to get symbols
        const parser = localParser_1.LocalParser.getInstance(vscode.Uri.file(document.fileName)); // URI doesn't matter much here for singleton
        // Note: parse() is async. CodeLens provider can return a detailed promise.
        // Ideally we should use a cached version or lightweight parse. 
        // logicalParser.parse might be expensive if called frequently, but it uses performant web-tree-sitter.
        const symbols = await parser.parse(document);
        const lenses = [];
        this.traverseSymbols(symbols, document.fileName, lenses);
        return lenses;
    }
    traverseSymbols(symbols, filePath, lenses) {
        for (const symbol of symbols) {
            if (symbol.kind === 'function' || symbol.kind === 'method') {
                this.createLensesForFunction(symbol, filePath, lenses);
            }
            if (symbol.children) {
                this.traverseSymbols(symbol.children, filePath, lenses);
            }
        }
    }
    createLensesForFunction(symbol, filePath, lenses) {
        const startPos = new vscode.Position(symbol.startLine - 1, 0);
        const endPos = new vscode.Position(symbol.startLine - 1, 0); // Lens sits on the definition line
        const range = new vscode.Range(startPos, endPos);
        const callers = this.analysisService.getCallers(filePath, symbol.name);
        const calls = this.analysisService.getCalls(filePath, symbol.name);
        // Callers Lens
        const callersCount = callers.length;
        const callersTitle = callersCount === 1 ? '1 caller' : `${callersCount} callers`;
        lenses.push(new vscode.CodeLens(range, {
            title: callersTitle,
            tooltip: 'Show incoming calls',
            command: 'archmind.showCallers',
            arguments: [filePath, symbol.name, callers]
        }));
        // Calls Lens
        const callsCount = calls.length;
        const callsTitle = callsCount === 1 ? '1 call' : `${callsCount} calls`;
        lenses.push(new vscode.CodeLens(range, {
            title: callsTitle,
            tooltip: 'Show outgoing calls',
            command: 'archmind.showCalls',
            arguments: [filePath, symbol.name, calls]
        }));
        // Coupling warning (High coupling)
        if (callersCount > 5 || callsCount > 10) {
            lenses.push(new vscode.CodeLens(range, {
                title: '⚠️ High Coupling',
                tooltip: 'This function has high coupling',
                command: '',
                arguments: []
            }));
        }
    }
}
exports.DependencyCodeLensProvider = DependencyCodeLensProvider;
//# sourceMappingURL=DependencyCodeLensProvider.js.map