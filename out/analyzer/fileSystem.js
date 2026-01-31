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
exports.analyzeWorkspace = analyzeWorkspace;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function getFileExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ext ? ext.substring(1) : '';
}
function determineNodeType(entry, extension) {
    if (entry.isDirectory()) {
        return 'directory';
    }
    // Treat index files as modules
    if (entry.name.startsWith('index.')) {
        return 'module';
    }
    return 'file';
}
async function analyzeWorkspace(rootPath) {
    const nodes = [];
    const edges = [];
    async function traverse(currentPath, parentId) {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'out') {
                continue;
            }
            const fullPath = path.join(currentPath, entry.name);
            const relativePath = path.relative(rootPath, fullPath);
            const id = fullPath;
            const label = entry.name;
            const fileExtension = getFileExtension(entry.name);
            const type = determineNodeType(entry, fileExtension);
            let size;
            if (!entry.isDirectory()) {
                try {
                    const stats = await fs.promises.stat(fullPath);
                    size = stats.size;
                }
                catch {
                    size = undefined;
                }
            }
            nodes.push({
                id,
                label,
                type,
                parentId,
                filePath: fullPath,
                relativePath,
                lineNumber: 1,
                fileExtension,
                size
            });
            if (parentId) {
                edges.push({
                    id: `e-${parentId}-${id}`,
                    source: parentId,
                    target: id
                });
            }
            if (entry.isDirectory()) {
                await traverse(fullPath, id);
            }
        }
    }
    await traverse(rootPath);
    return { nodes, edges };
}
//# sourceMappingURL=fileSystem.js.map