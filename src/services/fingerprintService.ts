
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';

export type FileStatus = 'unchanged' | 'modified' | 'added' | 'deleted';

export class FingerprintService {
    private static instance: FingerprintService;
    private storage: vscode.Memento;
    private static STORAGE_KEY = 'archmind.fileSnapshots';
    private currentSnapshots: Record<string, string> = {}; // Path -> Hash

    private constructor(context: vscode.ExtensionContext) {
        this.storage = context.workspaceState;
        this.loadSnapshots();
    }

    public static getInstance(context?: vscode.ExtensionContext): FingerprintService {
        if (!FingerprintService.instance) {
            if (!context) {
                throw new Error("FingerprintService not initialized. Pass context for first initialization.");
            }
            FingerprintService.instance = new FingerprintService(context);
        }
        return FingerprintService.instance;
    }

    public computeHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    public async computeFileHash(filePath: string): Promise<string | null> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return this.computeHash(content);
        } catch (error) {
            console.error(`Failed to compute hash for ${filePath}:`, error);
            return null;
        }
    }

    private loadSnapshots() {
        this.currentSnapshots = this.storage.get(FingerprintService.STORAGE_KEY, {});
    }

    public async saveSnapshots(snapshots: Record<string, string>) {
        this.currentSnapshots = snapshots;
        await this.storage.update(FingerprintService.STORAGE_KEY, snapshots);
    }

    /**
     * Updates the snapshot for a single file (e.g. on save)
     */
    public async updateFileSnapshot(filePath: string, hash: string) {
        this.currentSnapshots[filePath] = hash;
        await this.saveSnapshots(this.currentSnapshots);
    }

    public getStoredHash(filePath: string): string | undefined {
        return this.currentSnapshots[filePath];
    }

    public getAllSnapshots(): Record<string, string> {
        return { ...this.currentSnapshots };
    }
}
