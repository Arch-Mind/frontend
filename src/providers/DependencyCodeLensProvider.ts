
import * as vscode from 'vscode';
import * as path from 'path';
import { LocalParser, LocalSymbol } from '../analyzer/localParser';
import { AnalysisService } from '../services/analysisService';

export class DependencyCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor(private analysisService: AnalysisService) {
        // Refresh lenses when analysis data changes
        this.analysisService.onDidAnalysisChange(() => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        // Only provide for supported languages
        const supportedLangs = ['typescript', 'javascript', 'python', 'rust', 'go'];
        if (!supportedLangs.includes(document.languageId)) return [];

        // Parse document locally to get symbols
        const parser = LocalParser.getInstance(vscode.Uri.file(document.fileName)); // URI doesn't matter much here for singleton
        // Note: parse() is async. CodeLens provider can return a detailed promise.
        // Ideally we should use a cached version or lightweight parse. 
        // logicalParser.parse might be expensive if called frequently, but it uses performant web-tree-sitter.

        const symbols = await parser.parse(document);
        const lenses: vscode.CodeLens[] = [];

        this.traverseSymbols(symbols, document.fileName, lenses);

        return lenses;
    }

    private traverseSymbols(symbols: LocalSymbol[], filePath: string, lenses: vscode.CodeLens[], parentName: string = '') {
        for (const symbol of symbols) {
            let lookupName = symbol.name;

            // Construct lookup name for methods (ClassName.MethodName)
            if (symbol.kind === 'method' && parentName) {
                lookupName = `${parentName}.${symbol.name}`;
            }

            if (symbol.kind === 'function' || symbol.kind === 'method') {
                this.createLensesForFunction(symbol, lookupName, filePath, lenses);
            }

            if (symbol.children) {
                // If this is a class, pass its name as parent for children
                const nextParentName = symbol.kind === 'class' ? symbol.name : parentName;
                this.traverseSymbols(symbol.children, filePath, lenses, nextParentName);
            }
        }
    }

    private createLensesForFunction(symbol: LocalSymbol, lookupName: string, filePath: string, lenses: vscode.CodeLens[]) {
        const startPos = new vscode.Position(symbol.startLine - 1, 0);
        const endPos = new vscode.Position(symbol.startLine - 1, 0); // Lens sits on the definition line
        const range = new vscode.Range(startPos, endPos);

        const callers = this.analysisService.getCallers(filePath, lookupName);
        const calls = this.analysisService.getCalls(filePath, lookupName);

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
