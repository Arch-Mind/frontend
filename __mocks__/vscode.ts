const vscode = {
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        activeTextEditor: undefined,
    },
    workspace: {
        getConfiguration: jest.fn().mockImplementation(() => ({
            get: jest.fn(),
            update: jest.fn(),
        })),
        workspaceFolders: [],
        openTextDocument: jest.fn(),
    },
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn(),
    },
    Uri: {
        file: (path: string) => ({ fsPath: path, scheme: 'file' }),
        parse: (url: string) => ({ fsPath: url, scheme: 'https' }),
    },
    Range: jest.fn(),
    Position: jest.fn(),
    Selection: jest.fn(),
    EventEmitter: jest.fn().mockImplementation(() => ({
        event: jest.fn(),
        fire: jest.fn(),
    })),
};

module.exports = vscode;
