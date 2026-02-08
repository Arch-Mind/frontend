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
exports.FingerprintService = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
class FingerprintService {
    constructor(context) {
        this.currentSnapshots = {}; // Path -> Hash
        this.storage = context.workspaceState;
        this.loadSnapshots();
    }
    static getInstance(context) {
        if (!FingerprintService.instance) {
            if (!context) {
                throw new Error("FingerprintService not initialized. Pass context for first initialization.");
            }
            FingerprintService.instance = new FingerprintService(context);
        }
        return FingerprintService.instance;
    }
    computeHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    async computeFileHash(filePath) {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return this.computeHash(content);
        }
        catch (error) {
            console.error(`Failed to compute hash for ${filePath}:`, error);
            return null;
        }
    }
    loadSnapshots() {
        this.currentSnapshots = this.storage.get(FingerprintService.STORAGE_KEY, {});
    }
    async saveSnapshots(snapshots) {
        this.currentSnapshots = snapshots;
        await this.storage.update(FingerprintService.STORAGE_KEY, snapshots);
    }
    /**
     * Updates the snapshot for a single file (e.g. on save)
     */
    async updateFileSnapshot(filePath, hash) {
        this.currentSnapshots[filePath] = hash;
        await this.saveSnapshots(this.currentSnapshots);
    }
    getStoredHash(filePath) {
        return this.currentSnapshots[filePath];
    }
    getAllSnapshots() {
        return { ...this.currentSnapshots };
    }
}
exports.FingerprintService = FingerprintService;
FingerprintService.STORAGE_KEY = 'archmind.fileSnapshots';
//# sourceMappingURL=fingerprintService.js.map