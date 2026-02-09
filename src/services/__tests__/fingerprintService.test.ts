import { FingerprintService } from '../fingerprintService';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
    },
}));

jest.mock('vscode', () => {
    return {
        ExtensionContext: jest.fn(),
        Memento: jest.fn(),
    };
}, { virtual: true });


describe('FingerprintService', () => {
    let context: vscode.ExtensionContext;
    let mockStorage: { get: jest.Mock, update: jest.Mock };

    beforeEach(() => {
        // Reset singleton
        (FingerprintService as any).instance = undefined;

        mockStorage = {
            get: jest.fn().mockReturnValue({}),
            update: jest.fn(),
        };

        context = {
            workspaceState: mockStorage as any,
        } as any;

        jest.clearAllMocks();
    });

    it('should initialize successfully', () => {
        const service = FingerprintService.getInstance(context);
        expect(service).toBeDefined();
        expect(mockStorage.get).toHaveBeenCalledWith('archmind.fileSnapshots', {});
    });

    it('should calculate SHA256 hash correctly', () => {
        const service = FingerprintService.getInstance(context);
        const content = 'hello world';
        const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

        expect(service.computeHash(content)).toBe(expectedHash);
    });

    it('should compute file hash from file system', async () => {
        const service = FingerprintService.getInstance(context);
        const filePath = '/test/file.ts';
        const content = 'file content';

        (fs.promises.readFile as jest.Mock).mockResolvedValue(content);

        const hash = await service.computeFileHash(filePath);

        expect(fs.promises.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
        expect(hash).toBe(service.computeHash(content));
    });

    it('should return null if file reading fails', async () => {
        const service = FingerprintService.getInstance(context);
        const filePath = '/test/nonexistent.ts';

        (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

        const hash = await service.computeFileHash(filePath);

        expect(hash).toBeNull();
    });

    it('should update and save file snapshot', async () => {
        const service = FingerprintService.getInstance(context);
        const filePath = '/test/file.ts';
        const hash = 'new-hash';

        await service.updateFileSnapshot(filePath, hash);

        expect(mockStorage.update).toHaveBeenCalledWith('archmind.fileSnapshots', expect.objectContaining({
            [filePath]: hash
        }));
    });

    it('should retrieve stored hash', () => {
        const service = FingerprintService.getInstance(context);
        const filePath = '/test/file.ts';
        const hash = 'stored-hash';

        // Directly manipulate internal state for testing since loadSnapshots uses the mock
        (service as any).currentSnapshots = { [filePath]: hash };

        expect(service.getStoredHash(filePath)).toBe(hash);
    });
});
