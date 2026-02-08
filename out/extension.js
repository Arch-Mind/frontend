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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const api_1 = require("./api");
const localParser_1 = require("./analyzer/localParser");
function activate(context) {
    console.log('ArchMind VS Code Extension is now active!');
    // Initialize LocalParser
    const localParser = localParser_1.LocalParser.getInstance(context.extensionUri);
    localParser.initialize();
    // Register active document change listeners
    const onActiveEditorChanged = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor && ArchitecturePanel.currentPanel) {
            await parseAndSendLocalData(editor.document, localParser);
        }
    });
    const onDocumentChanged = vscode.workspace.onDidChangeTextDocument(async (e) => {
        if (ArchitecturePanel.currentPanel && e.document === vscode.window.activeTextEditor?.document) {
            // Debounce logic could be added here, but for now we rely on fast parsing
            await parseAndSendLocalData(e.document, localParser);
        }
    });
    // Register main architecture view command
    let showArchitectureCmd = vscode.commands.registerCommand('archmind.showArchitecture', () => {
        ArchitecturePanel.createOrShow(context.extensionUri);
        // Trigger initial parse if editor is active
        if (vscode.window.activeTextEditor) {
            parseAndSendLocalData(vscode.window.activeTextEditor.document, localParser);
        }
    });
    // Register backend analysis command
    let analyzeRepositoryCmd = vscode.commands.registerCommand('archmind.analyzeRepository', async () => {
        await ArchitecturePanel.analyzeWithBackend(context.extensionUri);
    });
    // Register refresh command
    let refreshGraphCmd = vscode.commands.registerCommand('archmind.refreshGraph', async () => {
        if (ArchitecturePanel.currentPanel) {
            await ArchitecturePanel.currentPanel.refresh();
            // Also refresh local data
            if (vscode.window.activeTextEditor) {
                parseAndSendLocalData(vscode.window.activeTextEditor.document, localParser);
            }
        }
        else {
            vscode.window.showInformationMessage('No architecture panel is open. Run "ArchMind: Show Architecture" first.');
        }
    });
    // Register backend status check command
    let checkBackendStatusCmd = vscode.commands.registerCommand('archmind.checkBackendStatus', async () => {
        await checkBackendHealth();
    });
    // Listen for configuration changes
    let configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('archmind')) {
            (0, api_1.getApiClient)().refreshConfig();
            vscode.window.showInformationMessage('ArchMind configuration updated.');
        }
    });
    context.subscriptions.push(showArchitectureCmd, analyzeRepositoryCmd, refreshGraphCmd, checkBackendStatusCmd, configChangeListener, onActiveEditorChanged, onDocumentChanged);
}
async function parseAndSendLocalData(document, parser) {
    if (document.uri.scheme !== 'file')
        return;
    // Only parse supported languages
    const supportedLangs = ['typescript', 'javascript', 'python', 'rust', 'go'];
    if (!supportedLangs.includes(document.languageId))
        return;
    try {
        const symbols = await parser.parse(document);
        if (ArchitecturePanel.currentPanel) {
            ArchitecturePanel.currentPanel.sendLocalData(symbols, document.fileName);
        }
    }
    catch (error) {
        console.error('Error parsing local file:', error);
    }
}
function deactivate() {
    (0, api_1.resetApiClient)();
}
/**
 * Check backend health status
 */
async function checkBackendHealth() {
    const apiClient = (0, api_1.getApiClient)();
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Checking ArchMind Backend Status...',
        cancellable: false
    }, async (progress) => {
        const results = [];
        // Check API Gateway
        try {
            progress.report({ message: 'Checking API Gateway...' });
            const gatewayHealth = await apiClient.checkGatewayHealth();
            results.push(`✅ API Gateway: ${gatewayHealth.status}`);
            results.push(`   - Redis: ${gatewayHealth.services.redis}`);
            results.push(`   - PostgreSQL: ${gatewayHealth.services.postgres}`);
        }
        catch (error) {
            const err = error;
            results.push(`❌ API Gateway: ${err.getUserMessage()}`);
        }
        // Check Graph Engine
        try {
            progress.report({ message: 'Checking Graph Engine...' });
            const graphHealth = await apiClient.checkGraphEngineHealth();
            results.push(`✅ Graph Engine: ${graphHealth.status}`);
            results.push(`   - Neo4j: ${graphHealth.services.neo4j}`);
        }
        catch (error) {
            const err = error;
            results.push(`❌ Graph Engine: ${err.getUserMessage()}`);
        }
        // Show results
        const message = results.join('\n');
        vscode.window.showInformationMessage('ArchMind Backend Status', { modal: true, detail: message });
    });
}
/**
 * Detect Git repository URL from workspace
 */
async function detectRepositoryUrl() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return undefined;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;
    const gitConfigPath = path.join(rootPath, '.git', 'config');
    try {
        const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
        // Parse remote origin URL from git config
        const remoteMatch = gitConfig.match(/\[remote "origin"\][^[]*url\s*=\s*(.+)/);
        if (remoteMatch) {
            let url = remoteMatch[1].trim();
            // Convert SSH URL to HTTPS if needed
            if (url.startsWith('git@github.com:')) {
                url = url.replace('git@github.com:', 'https://github.com/');
            }
            // Ensure .git suffix
            if (!url.endsWith('.git')) {
                url += '.git';
            }
            return url;
        }
    }
    catch {
        // Git config not found or unreadable
    }
    return undefined;
}
/**
 * Get repository URL from config or detect from workspace
 */
async function getRepositoryUrl() {
    const config = vscode.workspace.getConfiguration('archmind');
    let repoUrl = config.get('repositoryUrl', '');
    if (!repoUrl) {
        repoUrl = await detectRepositoryUrl() || '';
    }
    if (!repoUrl) {
        // Prompt user for repository URL
        const input = await vscode.window.showInputBox({
            prompt: 'Enter the Git repository URL for analysis',
            placeHolder: 'https://github.com/owner/repository.git',
            validateInput: (value) => {
                if (!value) {
                    return 'Repository URL is required';
                }
                if (!value.includes('github.com')) {
                    return 'Currently only GitHub repositories are supported';
                }
                return undefined;
            }
        });
        repoUrl = input || '';
    }
    return repoUrl || undefined;
}
class ArchitecturePanel {
    /**
     * Analyze repository using backend API
     */
    static async analyzeWithBackend(extensionUri) {
        // Create or show panel first
        ArchitecturePanel.createOrShow(extensionUri);
        const panel = ArchitecturePanel.currentPanel;
        if (!panel) {
            return;
        }
        await panel._analyzeWithBackend();
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (ArchitecturePanel.currentPanel) {
            ArchitecturePanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(ArchitecturePanel.viewType, 'Architecture Intelligence', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out/webview')],
            retainContextWhenHidden: true
        });
        ArchitecturePanel.currentPanel = new ArchitecturePanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'requestArchitecture':
                    await this._sendArchitecture();
                    return;
                case 'requestBackendArchitecture':
                    await this._sendBackendArchitecture();
                    return;
                case 'analyzeRepository':
                    await this._analyzeWithBackend();
                    return;
                case 'refreshGraph':
                    await this.refresh();
                    return;
                case 'openFile':
                    await this._openFile(message.filePath, message.lineNumber);
                    return;
                case 'goToDefinition':
                    await this._goToDefinition(message.filePath, message.lineNumber);
                    return;
                case 'findReferences':
                    await this._findReferences(message.filePath, message.lineNumber);
                    return;
                case 'revealInExplorer':
                    await this._revealInExplorer(message.filePath);
                    return;
                case 'copyPath':
                    await this._copyPath(message.filePath);
                    return;
                case 'getImpactAnalysis':
                    await this._getImpactAnalysis(message.nodeId);
                    return;
            }
        }, null, this._disposables);
    }
    /**
     * Opens a file in the editor and optionally navigates to a specific line
     */
    async _openFile(filePath, lineNumber) {
        try {
            const uri = vscode.Uri.file(filePath);
            // Check if it's a binary/image file that can't be opened as text
            const binaryExtensions = [
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp', '.svg',
                '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                '.zip', '.rar', '.7z', '.tar', '.gz',
                '.exe', '.dll', '.so', '.dylib',
                '.ttf', '.otf', '.woff', '.woff2',
                '.bin', '.dat'
            ];
            const ext = path.extname(filePath).toLowerCase();
            if (binaryExtensions.includes(ext)) {
                // Open binary files with the default system application or VS Code's binary viewer
                await vscode.commands.executeCommand('vscode.open', uri);
                return;
            }
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
            });
            if (lineNumber && lineNumber > 0) {
                const position = new vscode.Position(lineNumber - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
            console.error(error);
        }
    }
    /**
     * Goes to the definition at the specified location
     */
    async _goToDefinition(filePath, lineNumber) {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
            });
            const position = new vscode.Position((lineNumber || 1) - 1, 0);
            // Execute go to definition command
            await vscode.commands.executeCommand('editor.action.revealDefinition', uri, position);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to go to definition: ${filePath}`);
            console.error(error);
        }
    }
    /**
     * Finds all references at the specified location
     */
    async _findReferences(filePath, lineNumber) {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
            });
            const position = new vscode.Position((lineNumber || 1) - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            // Execute find references command
            await vscode.commands.executeCommand('references-view.findReferences', uri, position);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to find references: ${filePath}`);
            console.error(error);
        }
    }
    /**
     * Reveals the file in the Explorer sidebar
     */
    async _revealInExplorer(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.commands.executeCommand('revealInExplorer', uri);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to reveal in explorer: ${filePath}`);
            console.error(error);
        }
    }
    /**
     * Copies the file path to clipboard
     */
    async _copyPath(filePath) {
        try {
            await vscode.env.clipboard.writeText(filePath);
            vscode.window.showInformationMessage(`Copied path: ${filePath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to copy path: ${filePath}`);
            console.error(error);
        }
    }
    /**
     * Send architecture data to webview
     * Uses backend or local analysis based on configuration
     */
    async _sendArchitecture() {
        const config = vscode.workspace.getConfiguration('archmind');
        const useBackend = config.get('useBackendAnalysis', false);
        if (useBackend) {
            await this._sendBackendArchitecture();
        }
        else {
            await this._sendLocalArchitecture();
        }
    }
    /**
     * Send local file system architecture data to webview
     */
    async _sendLocalArchitecture() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        const rootPath = workspaceFolders[0].uri.fsPath;
        try {
            this._panel.webview.postMessage({
                command: 'loading',
                message: 'Analyzing workspace...'
            });
            const { analyzeWorkspace } = require('./analyzer/fileSystem');
            const data = await analyzeWorkspace(rootPath);
            // Add source indicator
            const enrichedData = { ...data, source: 'local' };
            this._panel.webview.postMessage({ command: 'architectureData', data: enrichedData });
        }
        catch (error) {
            console.error(error);
            this._sendError('Failed to analyze workspace locally');
        }
    }
    /**
     * Send backend-fetched architecture data to webview
     */
    async _sendBackendArchitecture() {
        try {
            // If we have a previous repo ID, fetch that
            if (this._lastRepoId) {
                this._panel.webview.postMessage({
                    command: 'loading',
                    message: 'Fetching graph data from backend...'
                });
                const apiClient = (0, api_1.getApiClient)();
                const data = await apiClient.fetchExistingGraph(this._lastRepoId);
                this._panel.webview.postMessage({ command: 'architectureData', data });
            }
            else {
                // Prompt to analyze first
                this._panel.webview.postMessage({
                    command: 'noData',
                    message: 'No repository has been analyzed yet. Use "ArchMind: Analyze Repository (Backend)" to start.'
                });
            }
        }
        catch (error) {
            console.error(error);
            if (error instanceof api_1.ApiRequestError) {
                this._sendError(error.getUserMessage());
            }
            else {
                this._sendError('Failed to fetch architecture data from backend');
            }
        }
    }
    /**
     * Trigger backend analysis for a repository
     */
    async _analyzeWithBackend() {
        const repoUrl = await getRepositoryUrl();
        if (!repoUrl) {
            vscode.window.showWarningMessage('Repository URL is required for backend analysis');
            return;
        }
        const config = vscode.workspace.getConfiguration('archmind');
        const branch = config.get('defaultBranch', 'main');
        const apiClient = (0, api_1.getApiClient)();
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'ArchMind Analysis',
                cancellable: true
            }, async (progress, token) => {
                // Allow cancellation
                token.onCancellationRequested(() => {
                    apiClient.cancelRequests();
                });
                progress.report({ message: 'Triggering analysis...', increment: 10 });
                this._panel.webview.postMessage({
                    command: 'loading',
                    message: 'Starting repository analysis...'
                });
                // Use analyzeAndFetchGraph for complete workflow
                const data = await apiClient.analyzeAndFetchGraph(repoUrl, branch, (status, job) => {
                    progress.report({ message: status });
                    this._panel.webview.postMessage({
                        command: 'loading',
                        message: status
                    });
                });
                // Store repo ID for future refreshes
                this._lastRepoId = data.repoId;
                progress.report({ message: 'Rendering graph...', increment: 90 });
                this._panel.webview.postMessage({ command: 'architectureData', data });
                vscode.window.showInformationMessage(`Analysis complete: ${data.stats.totalFiles} files, ${data.stats.totalFunctions} functions found`);
            });
        }
        catch (error) {
            console.error(error);
            if (error instanceof api_1.ApiRequestError) {
                this._sendError(error.getUserMessage());
                vscode.window.showErrorMessage(`Analysis failed: ${error.getUserMessage()}`);
            }
            else {
                this._sendError('An unexpected error occurred during analysis');
                vscode.window.showErrorMessage('Analysis failed: An unexpected error occurred');
            }
        }
    }
    /**
     * Refresh the current graph
     */
    async refresh() {
        const config = vscode.workspace.getConfiguration('archmind');
        const useBackend = config.get('useBackendAnalysis', false);
        if (useBackend && this._lastRepoId) {
            await this._sendBackendArchitecture();
        }
        else {
            await this._sendLocalArchitecture();
        }
    }
    /**
     * Send local parsed data to webview
     */
    sendLocalData(symbols, fileName) {
        this._panel.webview.postMessage({
            command: 'localData',
            data: { symbols, fileName }
        });
    }
    /**
     * Get impact analysis for a specific node
     */
    async _getImpactAnalysis(nodeId) {
        try {
            const apiClient = (0, api_1.getApiClient)();
            const impact = await apiClient.getImpactAnalysis(nodeId);
            this._panel.webview.postMessage({
                command: 'impactAnalysis',
                data: impact
            });
        }
        catch (error) {
            console.error(error);
            if (error instanceof api_1.ApiRequestError) {
                vscode.window.showErrorMessage(`Impact analysis failed: ${error.getUserMessage()}`);
            }
        }
    }
    /**
     * Send error message to webview
     */
    _sendError(message) {
        this._panel.webview.postMessage({
            command: 'error',
            message
        });
    }
    dispose() {
        ArchitecturePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.title = "Architecture Intelligence";
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'out/webview', 'bundle.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Architecture Intelligence</title>
				<style>
					body, html, #root {
						height: 100%;
						margin: 0;
						overflow: hidden;
						background-color: var(--am-bg, var(--vscode-editor-background));
						color: var(--am-fg, var(--vscode-editor-foreground));
					}
				</style>
			</head>
			<body>
				<div id="root"></div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}
ArchitecturePanel.viewType = 'archmindArchitecture';
//# sourceMappingURL=extension.js.map