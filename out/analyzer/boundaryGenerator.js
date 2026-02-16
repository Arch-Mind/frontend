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
exports.generateLocalBoundaries = generateLocalBoundaries;
const path = __importStar(require("path"));
/**
 * Generates local module boundaries based on file system structure and heuristics.
 * @param nodes - List of graph nodes from local analysis
 * @param rootPath - Root path of the workspace
 * @returns ModuleBoundariesResponse containing detected boundaries
 */
function generateLocalBoundaries(nodes, rootPath) {
    const boundaries = [];
    const files = nodes.filter(n => n.type === 'file');
    // Helper to get relative path
    const getRelativePath = (filePath) => path.relative(rootPath, filePath);
    // 1. Physical Boundaries (Top-level directories and packages)
    // We treat top-level directories as physical boundaries
    const topLevelDirs = new Set();
    const rootFiles = [];
    files.forEach(file => {
        const relPath = getRelativePath(file.filePath || file.id);
        const parts = relPath.split(path.sep);
        if (parts.length > 1) {
            topLevelDirs.add(parts[0]);
        }
        else {
            rootFiles.push(file.filePath || file.id);
        }
    });
    // Create a boundary for the root
    if (rootFiles.length > 0) {
        boundaries.push({
            id: 'boundary-root',
            name: 'Root',
            type: 'physical',
            path: '.',
            layer: null,
            file_count: rootFiles.length,
            files: rootFiles
        });
    }
    // Create boundaries for top-level directories
    topLevelDirs.forEach(dir => {
        const dirFiles = files.filter(f => {
            const rel = getRelativePath(f.filePath || f.id);
            return rel.startsWith(dir + path.sep);
        }).map(f => f.filePath || f.id);
        if (dirFiles.length > 0) {
            boundaries.push({
                id: `boundary-${dir}`,
                name: dir,
                type: 'physical',
                path: dir,
                layer: inferLayer(dir),
                file_count: dirFiles.length,
                files: dirFiles
            });
        }
    });
    // 2. Architectural/Logical Boundaries (Sub-directories in src/)
    // If 'src' exists, we look inside it for more granular boundaries
    if (topLevelDirs.has('src')) {
        const srcFiles = files.filter(f => {
            const rel = getRelativePath(f.filePath || f.id);
            return rel.startsWith('src' + path.sep);
        });
        const srcSubDirs = new Set();
        srcFiles.forEach(f => {
            const rel = getRelativePath(f.filePath || f.id);
            const parts = rel.split(path.sep);
            // src/subdir/... -> parts[0]='src', parts[1]='subdir'
            if (parts.length > 2) {
                srcSubDirs.add(parts[1]);
            }
        });
        srcSubDirs.forEach(subDir => {
            const subDirFiles = srcFiles.filter(f => {
                const rel = getRelativePath(f.filePath || f.id);
                return rel.startsWith(path.join('src', subDir) + path.sep);
            }).map(f => f.filePath || f.id);
            if (subDirFiles.length > 0) {
                // Add as architectural boundary
                boundaries.push({
                    id: `boundary-src-${subDir}`,
                    name: subDir,
                    type: 'architectural',
                    path: path.join('src', subDir),
                    layer: inferLayer(subDir),
                    file_count: subDirFiles.length,
                    files: subDirFiles
                });
            }
        });
    }
    return {
        repo_id: 'local',
        total_boundaries: boundaries.length,
        boundaries
    };
}
/**
 * Infers the architectural layer based on directory name
 */
function inferLayer(name) {
    const lower = name.toLowerCase();
    if (['components', 'views', 'pages', 'ui', 'frontend', 'webview'].some(k => lower.includes(k))) {
        return 'Presentation';
    }
    if (['services', 'logic', 'domain', 'core', 'business', 'managers'].some(k => lower.includes(k))) {
        return 'BusinessLogic';
    }
    if (['api', 'controllers', 'routes', 'handlers'].some(k => lower.includes(k))) {
        return 'Presentation'; // Or BusinessLogic depending on arch
    }
    if (['db', 'database', 'models', 'entities', 'repositories', 'store', 'data'].some(k => lower.includes(k))) {
        return 'DataAccess';
    }
    if (['utils', 'helpers', 'common', 'shared', 'lib', 'infra', 'infrastructure', 'config'].some(k => lower.includes(k))) {
        return 'Infrastructure';
    }
    return null;
}
//# sourceMappingURL=boundaryGenerator.js.map