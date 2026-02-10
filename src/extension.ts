import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getApiClient, resetApiClient, ApiRequestError, TransformedGraphData } from './api';
import { LocalParser } from './analyzer/localParser';

import { AnalysisService } from './services/analysisService';
import { DependencyCodeLensProvider } from './providers/DependencyCodeLensProvider';
import { FingerprintService } from './services/fingerprintService';

class ArchMindViewsProvider implements vscode.TreeDataProvider<ArchMindViewItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<ArchMindViewItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: ArchMindViewItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<ArchMindViewItem[]> {
        return Promise.resolve([
            new ArchMindViewItem('Boundary Diagram', 'archmind.showBoundaryDiagram'),
            new ArchMindViewItem('Dependency Diagram', 'archmind.showDependencyDiagram'),
            new ArchMindViewItem('Communication Diagram', 'archmind.showCommunicationDiagram'),
            new ArchMindViewItem('Toggle Heatmap', 'archmind.toggleHeatmap'),
            new ArchMindViewItem('Analyze Live Architecture', 'archmind.analyzeLiveArchitecture'),
            new ArchMindViewItem('Configure Webhook', 'archmind.configureWebhook'),
        ]);
    }
}

class ArchMindViewItem extends vscode.TreeItem {
    constructor(label: string, commandId: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = { command: commandId, title: label };
        this.contextValue = 'archmindViewItem';
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('ArchMind VS Code Extension is now active!');

    // Initialize LocalParser
    const localParser = LocalParser.getInstance(context.extensionUri);
    localParser.initialize();

    // Initialize FingerprintService
    FingerprintService.getInstance(context);

    // Initialize AnalysisService
    const analysisService = AnalysisService.getInstance();

    // Register CodeLens Provider
    const codeLensProvider = new DependencyCodeLensProvider(analysisService);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            ['typescript', 'javascript', 'python', 'rust', 'go'],
            codeLensProvider
        )
    );

    // Register active document change listeners
    const onActiveEditorChanged = vscode.window.onDidChangeActiveTextEditor(async editor => {
        if (editor && ArchitecturePanel.currentPanel) {
            await parseAndSendLocalData(editor.document, localParser);
        }
    });

    const onDocumentChanged = vscode.workspace.onDidChangeTextDocument(async e => {
        if (ArchitecturePanel.currentPanel && e.document === vscode.window.activeTextEditor?.document) {
            // Debounce logic could be added here, but for now we rely on fast parsing
            await parseAndSendLocalData(e.document, localParser);
        }
    });

    // Register main architecture view command
    let showArchitectureCmd = vscode.commands.registerCommand('archmind.showArchitecture', async () => {
        ArchitecturePanel.createOrShow(context.extensionUri);

        // Trigger backend/full analysis via service if workspace is open
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            try {
                // Determine if we need to run analysis (if no data yet)
                if (!analysisService.getData()) {
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: "Analyzing workspace...",
                        cancellable: false
                    }, async () => {
                        await analysisService.analyze(rootPath);
                        // Panel will pick up data if it listens to service, or we push it
                        // For now, let's keep existing push mechanism in ArchitecturePanel for now
                        // But updated to use service data? 
                        // Actually, let's let the Panel handle its own loading invocation for now to avoid breaking existing flow,
                        // calling `analyzeWorkspace` directly. 
                        // Ideally checking `analysisService` first would be better.
                    });
                }
            } catch (e) {
                console.error("Analysis failed", e);
            }
        }

        // Trigger initial parse if editor is active
        if (vscode.window.activeTextEditor) {
            parseAndSendLocalData(vscode.window.activeTextEditor.document, localParser);
        }
    });

    let showBoundaryDiagramCmd = vscode.commands.registerCommand('archmind.showBoundaryDiagram', async () => {
        ArchitecturePanel.createOrShow(context.extensionUri);
        ArchitecturePanel.currentPanel?.switchView('boundary-diagram');
    });

    let showDependencyDiagramCmd = vscode.commands.registerCommand('archmind.showDependencyDiagram', async () => {
        ArchitecturePanel.createOrShow(context.extensionUri);
        ArchitecturePanel.currentPanel?.switchView('dependency-diagram');
    });

    let showCommunicationDiagramCmd = vscode.commands.registerCommand('archmind.showCommunicationDiagram', async () => {
        ArchitecturePanel.createOrShow(context.extensionUri);
        ArchitecturePanel.currentPanel?.switchView('communication');
    });

    let toggleHeatmapCmd = vscode.commands.registerCommand('archmind.toggleHeatmap', async () => {
        ArchitecturePanel.createOrShow(context.extensionUri);
        ArchitecturePanel.currentPanel?.toggleHeatmap();
    });

    let analyzeLiveArchitectureCmd = vscode.commands.registerCommand('archmind.analyzeLiveArchitecture', async () => {
        await ArchitecturePanel.analyzeWithBackend(context.extensionUri);
        vscode.window.showInformationMessage('Live architecture analysis triggered.');
    });

    let configureWebhookCmd = vscode.commands.registerCommand('archmind.configureWebhook', async () => {
        await configureWebhookSetup();
    });

    let showInBoundaryDiagramCmd = vscode.commands.registerCommand('archmind.showInBoundaryDiagram', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor to reveal in boundary diagram.');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        ArchitecturePanel.createOrShow(context.extensionUri);
        ArchitecturePanel.currentPanel?.switchView('boundary-diagram');
        ArchitecturePanel.currentPanel?.revealBoundaryFile(filePath);
    });

    // Register local analysis command
    let showLocalAnalysisCmd = vscode.commands.registerCommand('archmind.showLocalAnalysis', async () => {
        ArchitecturePanel.createOrShow(context.extensionUri);

        // Force local analysis of the entire workspace
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            // Trigger local workspace analysis
            if (ArchitecturePanel.currentPanel) {
                await ArchitecturePanel.currentPanel.sendLocalArchitecture();
            }
        } else {
            vscode.window.showWarningMessage('ArchMind: No workspace folder open. Please open a folder to analyze.');
        }

        // Also parse active file if available for detailed view
        if (vscode.window.activeTextEditor) {
            parseAndSendLocalData(vscode.window.activeTextEditor.document, localParser);
        }
    });

    // Register commands for CodeLens interactions
    vscode.commands.registerCommand('archmind.showCallers', (filePath: string, funcName: string, callers: any[]) => {
        // Show a quick pick or jump to location
        if (callers.length === 0) return;

        const items = callers.map(c => {
            // Edge ID format: e-source-target-line
            // We need source details. 
            // Ideally we should have the source node info available.
            // For now, let's just show the source ID
            return {
                label: c.source,
                description: `Line: ${c.id.split('-').pop()}`,
                detail: 'Click to navigate'
            };
        });

        vscode.window.showQuickPick(items, { placeHolder: `Callers of ${funcName}` }).then(selection => {
            if (selection) {
                // Navigate to file
                // Source ID usually is file path (for top level) or file#func
                // We need to parse it. 
                let targetPath = selection.label;
                if (targetPath.includes('#')) {
                    targetPath = targetPath.split('#')[0];
                }

                vscode.workspace.openTextDocument(targetPath).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });
    });

    vscode.commands.registerCommand('archmind.showCalls', (filePath: string, funcName: string, calls: any[]) => {
        const items = calls.map(c => {
            return {
                label: c.target,
                description: `Line: ${c.id.split('-').pop()}`,
                detail: 'Click to navigate'
            };
        });

        vscode.window.showQuickPick(items, { placeHolder: `Calls from ${funcName}` }).then(selection => {
            if (selection) {
                let targetPath = selection.label;
                if (targetPath.includes('#')) {
                    targetPath = targetPath.split('#')[0];
                }
                vscode.workspace.openTextDocument(targetPath).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });
    });

    // Register backend analysis command
    let analyzeRepositoryCmd = vscode.commands.registerCommand('archmind.analyzeRepository', async () => {
        await ArchitecturePanel.analyzeWithBackend(context.extensionUri);
    });

    // Register refresh command
    let refreshGraphCmd = vscode.commands.registerCommand('archmind.refreshGraph', async () => {
        // Trigger re-analysis via service
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Refreshing analysis...",
                cancellable: false
            }, async () => {
                await analysisService.analyze(rootPath);
            });
        }

        if (ArchitecturePanel.currentPanel) {
            await ArchitecturePanel.currentPanel.refresh();
            // Also refresh local data
            if (vscode.window.activeTextEditor) {
                parseAndSendLocalData(vscode.window.activeTextEditor.document, localParser);
            }
        } else {
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
            getApiClient().refreshConfig();
            vscode.window.showInformationMessage('ArchMind configuration updated.');
        }
    });

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('archmind.views', new ArchMindViewsProvider()),
        showArchitectureCmd,
        showLocalAnalysisCmd,
        analyzeRepositoryCmd,
        analyzeLiveArchitectureCmd,
        refreshGraphCmd,
        checkBackendStatusCmd,
        showBoundaryDiagramCmd,
        showDependencyDiagramCmd,
        showCommunicationDiagramCmd,
        toggleHeatmapCmd,
        configureWebhookCmd,
        showInBoundaryDiagramCmd,
        configChangeListener,
        onActiveEditorChanged,
        onDocumentChanged
    );
}

async function parseAndSendLocalData(document: vscode.TextDocument, parser: LocalParser) {
    if (document.uri.scheme !== 'file') return;

    // Only parse supported languages
    const supportedLangs = ['typescript', 'javascript', 'python', 'rust', 'go'];
    if (!supportedLangs.includes(document.languageId)) return;

    try {
        const symbols = await parser.parse(document);
        if (ArchitecturePanel.currentPanel) {
            ArchitecturePanel.currentPanel.sendLocalData(symbols, document.fileName);
        }
    } catch (error) {
        console.error('Error parsing local file:', error);
    }
}

export function deactivate() {
    resetApiClient();
}

/**
 * Check backend health status
 */
async function checkBackendHealth(): Promise<void> {
    const apiClient = getApiClient();

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Checking ArchMind Backend Status...',
        cancellable: false
    }, async (progress) => {
        const results: string[] = [];

        // Check API Gateway
        try {
            progress.report({ message: 'Checking API Gateway...' });
            const gatewayHealth = await apiClient.checkGatewayHealth();
            results.push(`✅ API Gateway: ${gatewayHealth.status}`);
            results.push(`   - Redis: ${gatewayHealth.services.redis}`);
            results.push(`   - PostgreSQL: ${gatewayHealth.services.postgres}`);
        } catch (error) {
            const err = error as ApiRequestError;
            results.push(`❌ API Gateway: ${err.getUserMessage()}`);
        }

        // Check Graph Engine
        try {
            progress.report({ message: 'Checking Graph Engine...' });
            const graphHealth = await apiClient.checkGraphEngineHealth();
            results.push(`✅ Graph Engine: ${graphHealth.status}`);
            results.push(`   - Neo4j: ${graphHealth.services.neo4j}`);
        } catch (error) {
            const err = error as ApiRequestError;
            results.push(`❌ Graph Engine: ${err.getUserMessage()}`);
        }

        // Show results
        const message = results.join('\n');
        vscode.window.showInformationMessage(
            'ArchMind Backend Status',
            { modal: true, detail: message }
        );
    });
}

/**
 * Detect Git repository URL from workspace
 */
async function detectRepositoryUrl(): Promise<string | undefined> {
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
    } catch {
        // Git config not found or unreadable
    }

    return undefined;
}

/**
 * Get repository URL from config or detect from workspace
 */
async function getRepositoryUrl(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('archmind');
    let repoUrl = config.get<string>('repositoryUrl', '');

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

async function configureWebhookSetup(): Promise<void> {
    const config = vscode.workspace.getConfiguration('archmind');
    const backendUrl = config.get<string>('backendUrl', 'http://localhost:8080');
    const webhookSecret = config.get<string>('webhookSecret', '');

    const choices = [
        { label: 'Copy Webhook URL', description: `${backendUrl}/webhooks/github` },
        { label: 'Copy Webhook Secret', description: webhookSecret ? 'Use configured secret' : 'No secret configured' },
        { label: 'Open GitHub Webhook Settings', description: 'Open repository webhook settings in browser' },
        { label: 'Set Webhook Secret', description: 'Update archmind.webhookSecret setting' },
    ];

    const selection = await vscode.window.showQuickPick(choices, {
        placeHolder: 'Configure GitHub webhook for ArchMind',
    });

    if (!selection) return;

    if (selection.label === 'Copy Webhook URL') {
        await vscode.env.clipboard.writeText(`${backendUrl}/webhooks/github`);
        vscode.window.showInformationMessage('Webhook URL copied to clipboard.');
        return;
    }

    if (selection.label === 'Copy Webhook Secret') {
        if (!webhookSecret) {
            vscode.window.showWarningMessage('No webhook secret configured.');
            return;
        }
        await vscode.env.clipboard.writeText(webhookSecret);
        vscode.window.showInformationMessage('Webhook secret copied to clipboard.');
        return;
    }

    if (selection.label === 'Set Webhook Secret') {
        const value = await vscode.window.showInputBox({
            prompt: 'Enter GitHub webhook secret',
            password: true,
            placeHolder: 'secret',
        });
        if (value !== undefined) {
            await config.update('webhookSecret', value, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Webhook secret updated.');
        }
        return;
    }

    if (selection.label === 'Open GitHub Webhook Settings') {
        const repoUrl = await getRepositoryUrl();
        if (!repoUrl) {
            vscode.window.showWarningMessage('Unable to detect repository URL.');
            return;
        }
        const httpsUrl = repoUrl.replace(/\.git$/, '');
        const settingsUrl = `${httpsUrl}/settings/hooks`;
        vscode.env.openExternal(vscode.Uri.parse(settingsUrl));
        return;
    }
}

class ArchitecturePanel {
    public static currentPanel: ArchitecturePanel | undefined;
    public static readonly viewType = 'archmindArchitecture';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _lastRepoId: string | undefined;

    /**
     * Analyze repository using backend API
     */
    public static async analyzeWithBackend(extensionUri: vscode.Uri): Promise<void> {
        // Create or show panel first
        ArchitecturePanel.createOrShow(extensionUri);

        const panel = ArchitecturePanel.currentPanel;
        if (!panel) {
            return;
        }

        await panel._analyzeWithBackend();
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ArchitecturePanel.currentPanel) {
            ArchitecturePanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ArchitecturePanel.viewType,
            'Architecture Intelligence',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out/webview')],
                retainContextWhenHidden: true
            }
        );

        ArchitecturePanel.currentPanel = new ArchitecturePanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;


        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
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
                    case 'saveFile':
                        await this._saveFile(message.data, message.filename, message.mimeType);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public switchView(view: string) {
        this._panel.webview.postMessage({ command: 'switchView', view });
    }

    public toggleHeatmap() {
        this._panel.webview.postMessage({ command: 'toggleHeatmap' });
    }

    public revealBoundaryFile(filePath: string) {
        this._panel.webview.postMessage({ command: 'revealBoundaryFile', filePath });
    }

    /**
     * Opens a file in the editor and optionally navigates to a specific line
     */
    private async _openFile(filePath: string, lineNumber?: number) {
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
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
            console.error(error);
        }
    }

    /**
     * Goes to the definition at the specified location
     */
    private async _goToDefinition(filePath: string, lineNumber?: number) {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
            });

            const position = new vscode.Position((lineNumber || 1) - 1, 0);

            // Execute go to definition command
            await vscode.commands.executeCommand(
                'editor.action.revealDefinition',
                uri,
                position
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to go to definition: ${filePath}`);
            console.error(error);
        }
    }

    /**
     * Finds all references at the specified location
     */
    private async _findReferences(filePath: string, lineNumber?: number) {
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to find references: ${filePath}`);
            console.error(error);
        }
    }

    /**
     * Reveals the file in the Explorer sidebar
     */
    private async _revealInExplorer(filePath: string) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.commands.executeCommand('revealInExplorer', uri);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to reveal in explorer: ${filePath}`);
            console.error(error);
        }
    }

    /**
     * Copies the file path to clipboard
     */
    private async _copyPath(filePath: string) {
        try {
            await vscode.env.clipboard.writeText(filePath);
            vscode.window.showInformationMessage(`Copied path: ${filePath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to copy path: ${filePath}`);
            console.error(error);
        }
    }

    /**
     * Send architecture data to webview
     * Uses backend or local analysis based on configuration
     */
    private async _sendArchitecture() {
        const config = vscode.workspace.getConfiguration('archmind');
        const useBackend = config.get<boolean>('useBackendAnalysis', false);

        if (useBackend) {
            await this._sendBackendArchitecture();
        } else {
            await this._sendLocalArchitecture();
        }
    }

    /**
     * Send local file system architecture data to webview (public method)
     */
    public async sendLocalArchitecture() {
        await this._sendLocalArchitecture();
    }

    /**
     * Send local file system architecture data to webview
     */
    private async _sendLocalArchitecture() {
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
        } catch (error) {
            console.error(error);
            this._sendError('Failed to analyze workspace locally');
        }
    }

    /**
     * Send backend-fetched architecture data to webview
     */
    private async _sendBackendArchitecture() {
        try {
            // If we have a previous repo ID, fetch that
            if (this._lastRepoId) {
                this._panel.webview.postMessage({
                    command: 'loading',
                    message: 'Fetching graph data from backend...'
                });

                const apiClient = getApiClient();
                const data = await apiClient.fetchExistingGraph(this._lastRepoId);
                this._panel.webview.postMessage({ command: 'architectureData', data });
            } else {
                // Prompt to analyze first
                this._panel.webview.postMessage({
                    command: 'noData',
                    message: 'No repository has been analyzed yet. Use "ArchMind: Analyze Repository (Backend)" to start.'
                });
            }
        } catch (error) {
            console.error(error);
            if (error instanceof ApiRequestError) {
                this._sendError(error.getUserMessage());
            } else {
                this._sendError('Failed to fetch architecture data from backend');
            }
        }
    }

    /**
     * Trigger backend analysis for a repository
     */
    private async _analyzeWithBackend() {
        const repoUrl = await getRepositoryUrl();
        if (!repoUrl) {
            vscode.window.showWarningMessage('Repository URL is required for backend analysis');
            return;
        }

        const config = vscode.workspace.getConfiguration('archmind');
        const branch = config.get<string>('defaultBranch', 'main');
        const apiClient = getApiClient();

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
                const data = await apiClient.analyzeAndFetchGraph(
                    repoUrl,
                    branch,
                    (status, job) => {
                        progress.report({ message: status });
                        this._panel.webview.postMessage({
                            command: 'loading',
                            message: status
                        });
                    }
                );

                // Store repo ID for future refreshes
                this._lastRepoId = data.repoId;

                progress.report({ message: 'Rendering graph...', increment: 90 });
                this._panel.webview.postMessage({ command: 'architectureData', data });

                vscode.window.showInformationMessage(
                    `Analysis complete: ${data.stats.totalFiles} files, ${data.stats.totalFunctions} functions found`
                );
            });
        } catch (error) {
            console.error(error);
            if (error instanceof ApiRequestError) {
                this._sendError(error.getUserMessage());
                vscode.window.showErrorMessage(`Analysis failed: ${error.getUserMessage()}`);
            } else {
                this._sendError('An unexpected error occurred during analysis');
                vscode.window.showErrorMessage('Analysis failed: An unexpected error occurred');
            }
        }
    }

    /**
     * Refresh the current graph
     */
    public async refresh() {
        const config = vscode.workspace.getConfiguration('archmind');
        const useBackend = config.get<boolean>('useBackendAnalysis', false);

        if (useBackend && this._lastRepoId) {
            await this._sendBackendArchitecture();
        } else {
            await this._sendLocalArchitecture();
        }
    }

    /**
     * Send local parsed data to webview
     */
    public sendLocalData(symbols: any[], fileName: string) {
        this._panel.webview.postMessage({
            command: 'localData',
            data: { symbols, fileName }
        });
    }

    /**
     * Get impact analysis for a specific node
     */
    private async _getImpactAnalysis(nodeId: string) {
        try {
            const apiClient = getApiClient();
            const impact = await apiClient.getImpactAnalysis(nodeId);

            this._panel.webview.postMessage({
                command: 'impactAnalysis',
                data: impact
            });
        } catch (error) {
            console.error(error);
            if (error instanceof ApiRequestError) {
                vscode.window.showErrorMessage(`Impact analysis failed: ${error.getUserMessage()}`);
            }
        }
    }

    /**
     * Send error message to webview
     */
    private _sendError(message: string) {
        this._panel.webview.postMessage({
            command: 'error',
            message
        });
    }

    /**
     * Save file to disk from webview
     */
    private async _saveFile(data: string, filename: string, mimeType: string): Promise<void> {
        try {
            // Show save dialog
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(require('os').homedir(), 'Downloads', filename)),
                filters: this._getFileFilters(filename)
            });

            if (!uri) {
                // User cancelled
                this._panel.webview.postMessage({
                    command: 'fileSaveCancelled'
                });
                return;
            }

            // Convert base64 or plain text data to buffer
            let buffer: Buffer;
            if (data.startsWith('data:')) {
                // It's a data URL (like from canvas)
                const base64Data = data.split(',')[1];
                buffer = Buffer.from(base64Data, 'base64');
            } else {
                // It's plain text (like JSON or SVG)
                buffer = Buffer.from(data, 'utf8');
            }

            // Write file
            await vscode.workspace.fs.writeFile(uri, buffer);

            // Show success message
            vscode.window.showInformationMessage(`Graph exported to ${uri.fsPath}`);

            // Notify webview
            this._panel.webview.postMessage({
                command: 'fileSaveSuccess',
                path: uri.fsPath
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save file: ${errorMessage}`);

            this._panel.webview.postMessage({
                command: 'fileSaveError',
                error: errorMessage
            });
        }
    }

    /**
     * Get file filters for save dialog based on filename
     */
    private _getFileFilters(filename: string): { [name: string]: string[] } {
        const ext = path.extname(filename).toLowerCase();
        
        switch (ext) {
            case '.json':
                return { 'JSON': ['json'] };
            case '.png':
                return { 'PNG Images': ['png'] };
            case '.jpg':
            case '.jpeg':
                return { 'JPEG Images': ['jpg', 'jpeg'] };
            case '.webp':
                return { 'WebP Images': ['webp'] };
            case '.svg':
                return { 'SVG Images': ['svg'] };
            case '.pdf':
                return { 'PDF Documents': ['pdf'] };
            case '.md':
                return { 'Markdown': ['md'] };
            default:
                return { 'All Files': ['*'] };
        }
    }

    public dispose() {
        ArchitecturePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = "Architecture Intelligence";
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const vendorsPath = vscode.Uri.joinPath(this._extensionUri, 'out/webview', 'vendors.bundle.js');
        const vendorsUri = webview.asWebviewUri(vendorsPath);
        const mainPath = vscode.Uri.joinPath(this._extensionUri, 'out/webview', 'main.bundle.js');
        const mainUri = webview.asWebviewUri(mainPath);

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
				<script src="${vendorsUri}"></script>
				<script src="${mainUri}"></script>
			</body>
			</html>`;
    }
}
