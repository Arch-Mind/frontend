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
exports.resolveImportPath = resolveImportPath;
exports.parseFileDependencies = parseFileDependencies;
exports.parseFileSymbols = parseFileSymbols;
const ts = __importStar(require("typescript"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Resolves an import path to a potential absolute file path.
 *
 * @param currentFilePath - Absolute path of the file containing the import
 * @param importPath - The import path string (e.g., './utils', 'react')
 * @returns The resolved absolute path if found locally, or the original import if external/unresolvable
 */
function resolveImportPath(currentFilePath, importPath) {
    // Return null for non-relative imports (likely node_modules)
    // We can choose to return "node_modules/<package>" if we want to visualize external deps later
    if (!importPath.startsWith('.')) {
        return null;
    }
    const currentDir = path.dirname(currentFilePath);
    const resolvedPath = path.resolve(currentDir, importPath);
    // Extensions to probe
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
    // Check exact file + extension
    for (const ext of extensions) {
        const probePath = resolvedPath + ext;
        if (fs.existsSync(probePath)) {
            return probePath;
        }
    }
    // Check directory / index file
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        for (const ext of extensions) {
            const probeIndex = path.join(resolvedPath, 'index' + ext);
            if (fs.existsSync(probeIndex)) {
                return probeIndex;
            }
        }
    }
    // If exact match (rare for imports but possible)
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        return resolvedPath;
    }
    return null;
}
/**
 * Parses a TypeScript/JavaScript file to extract its imports.
 *
 * @param filePath - Absolute path to the file
 * @returns List of resolved absolute paths to imported files
 */
function parseFileDependencies(filePath) {
    const dependencies = [];
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    }
    catch (err) {
        console.warn(`Failed to read file for parsing: ${filePath}`);
        return [];
    }
    // Create a SourceFile
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true // setParentNodes
    );
    function visit(node) {
        // Handle Import Declarations: import ... from '...'
        if (ts.isImportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const importPath = node.moduleSpecifier.text;
                const resolved = resolveImportPath(filePath, importPath);
                if (resolved) {
                    dependencies.push(resolved);
                }
            }
        }
        // Handle Export Declarations: export ... from '...'
        else if (ts.isExportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const importPath = node.moduleSpecifier.text;
                const resolved = resolveImportPath(filePath, importPath);
                if (resolved) {
                    dependencies.push(resolved);
                }
            }
        }
        // Handle require calls: require('...') - simplistic check
        // We look for CallExpression where expression is identifier 'require' and has 1 string arg
        else if (ts.isCallExpression(node)) {
            if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
                const args = node.arguments;
                if (args.length > 0 && ts.isStringLiteral(args[0])) {
                    const importPath = args[0].text;
                    const resolved = resolveImportPath(filePath, importPath);
                    if (resolved) {
                        dependencies.push(resolved);
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    // Remove duplicates
    return Array.from(new Set(dependencies));
}
/**
 * Parses a TypeScript/JavaScript file to extract symbols (functions, classes, etc.)
 *
 * @param filePath - Absolute path to the file
 * @returns List of symbols found in the file
 */
function parseFileSymbols(filePath) {
    const symbols = [];
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    }
    catch (err) {
        console.warn(`Failed to read file for symbol parsing: ${filePath}`);
        return [];
    }
    // Create a SourceFile
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true // setParentNodes
    );
    /**
     * Gets the line number (1-based) for a position in the source file
     */
    function getLineNumber(pos) {
        return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
    }
    /**
     * Checks if a node has export modifiers
     */
    function isExported(node) {
        if (!ts.canHaveModifiers(node))
            return false;
        const modifiers = ts.getModifiers(node);
        return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }
    function visit(node) {
        // Function declarations: function foo() {}
        if (ts.isFunctionDeclaration(node) && node.name) {
            symbols.push({
                name: node.name.getText(sourceFile),
                kind: 'function',
                lineNumber: getLineNumber(node.getStart(sourceFile)),
                endLineNumber: getLineNumber(node.getEnd()),
                isExported: isExported(node),
            });
        }
        // Class declarations: class Foo {}
        else if (ts.isClassDeclaration(node) && node.name) {
            symbols.push({
                name: node.name.getText(sourceFile),
                kind: 'class',
                lineNumber: getLineNumber(node.getStart(sourceFile)),
                endLineNumber: getLineNumber(node.getEnd()),
                isExported: isExported(node),
            });
            // Also extract methods from the class
            node.members.forEach(member => {
                if (ts.isMethodDeclaration(member) && member.name) {
                    symbols.push({
                        name: `${node.name.getText(sourceFile)}.${member.name.getText(sourceFile)}`,
                        kind: 'method',
                        lineNumber: getLineNumber(member.getStart(sourceFile)),
                        endLineNumber: getLineNumber(member.getEnd()),
                        isExported: false,
                    });
                }
            });
        }
        // Interface declarations: interface Foo {}
        else if (ts.isInterfaceDeclaration(node) && node.name) {
            symbols.push({
                name: node.name.getText(sourceFile),
                kind: 'interface',
                lineNumber: getLineNumber(node.getStart(sourceFile)),
                endLineNumber: getLineNumber(node.getEnd()),
                isExported: isExported(node),
            });
        }
        // Type alias declarations: type Foo = ...
        else if (ts.isTypeAliasDeclaration(node) && node.name) {
            symbols.push({
                name: node.name.getText(sourceFile),
                kind: 'type',
                lineNumber: getLineNumber(node.getStart(sourceFile)),
                endLineNumber: getLineNumber(node.getEnd()),
                isExported: isExported(node),
            });
        }
        // Variable declarations with arrow functions: const foo = () => {}
        else if (ts.isVariableStatement(node)) {
            const declarations = node.declarationList.declarations;
            for (const decl of declarations) {
                if (decl.name && ts.isIdentifier(decl.name) && decl.initializer) {
                    // Check if initializer is an arrow function or function expression
                    if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
                        symbols.push({
                            name: decl.name.getText(sourceFile),
                            kind: 'function',
                            lineNumber: getLineNumber(node.getStart(sourceFile)),
                            endLineNumber: getLineNumber(node.getEnd()),
                            isExported: isExported(node),
                        });
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return symbols;
}
//# sourceMappingURL=dependencyParser.js.map