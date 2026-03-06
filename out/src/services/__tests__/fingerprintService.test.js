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
const fingerprintService_1 = require("../fingerprintService");
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
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
    let context;
    let mockStorage;
    beforeEach(() => {
        // Reset singleton
        fingerprintService_1.FingerprintService.instance = undefined;
        mockStorage = {
            get: jest.fn().mockReturnValue({}),
            update: jest.fn(),
        };
        context = {
            workspaceState: mockStorage,
        };
        jest.clearAllMocks();
    });
    it('should initialize successfully', () => {
        const service = fingerprintService_1.FingerprintService.getInstance(context);
        expect(service).toBeDefined();
        expect(mockStorage.get).toHaveBeenCalledWith('archmind.fileSnapshots', {});
    });
    it('should calculate SHA256 hash correctly', () => {
        const service = fingerprintService_1.FingerprintService.getInstance(context);
        const content = 'hello world';
        const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
        expect(service.computeHash(content)).toBe(expectedHash);
    });
    it('should compute file hash from file system', async () => {
        const service = fingerprintService_1.FingerprintService.getInstance(context);
        const filePath = '/test/file.ts';
        const content = 'file content';
        fs.promises.readFile.mockResolvedValue(content);
        const hash = await service.computeFileHash(filePath);
        expect(fs.promises.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
        expect(hash).toBe(service.computeHash(content));
    });
    it('should return null if file reading fails', async () => {
        const service = fingerprintService_1.FingerprintService.getInstance(context);
        const filePath = '/test/nonexistent.ts';
        fs.promises.readFile.mockRejectedValue(new Error('File not found'));
        const hash = await service.computeFileHash(filePath);
        expect(hash).toBeNull();
    });
    it('should update and save file snapshot', async () => {
        const service = fingerprintService_1.FingerprintService.getInstance(context);
        const filePath = '/test/file.ts';
        const hash = 'new-hash';
        await service.updateFileSnapshot(filePath, hash);
        expect(mockStorage.update).toHaveBeenCalledWith('archmind.fileSnapshots', expect.objectContaining({
            [filePath]: hash
        }));
    });
    it('should retrieve stored hash', () => {
        const service = fingerprintService_1.FingerprintService.getInstance(context);
        const filePath = '/test/file.ts';
        const hash = 'stored-hash';
        // Directly manipulate internal state for testing since loadSnapshots uses the mock
        service.currentSnapshots = { [filePath]: hash };
        expect(service.getStoredHash(filePath)).toBe(hash);
    });
});
//# sourceMappingURL=fingerprintService.test.js.map