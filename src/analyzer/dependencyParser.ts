import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a symbol (function, class, etc.) found in a file
 */
export interface SymbolInfo {
    name: string;
    kind: 'function' | 'class' | 'method' | 'interface' | 'variable' | 'type';
    lineNumber: number;
    endLineNumber?: number;
    isExported: boolean;
}

/**
 * Detailed information about an import
 */
export interface ImportInfo {
    modulePath: string; // Resolved absolute path
    originalPath: string; // The string in the import statement
    specifiers: {
        name: string; // The imported name (e.g. "foo" in { foo })
        alias?: string; // The local alias (e.g. "bar" in { foo as bar })
        isDefault: boolean; // True for "import foo from ..."
        isNamespace: boolean; // True for "import * as foo from ..."
    }[];
}

/**
 * Represents a function call
 */
export interface FunctionCall {
    callerName: string; // Name of the function containing the call
    calleeName: string; // Name of the function being called
    importPath?: string; // If imported, the resolved path to the module
    lineNumber: number;
}

/**
 * Resolves an import path to a potential absolute file path.
 * 
 * @param currentFilePath - Absolute path of the file containing the import
 * @param importPath - The import path string (e.g., './utils', 'react')
 * @returns The resolved absolute path if found locally, or the original import if external/unresolvable
 */
export function resolveImportPath(currentFilePath: string, importPath: string): string | null {
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
 * @returns List of detailed import information
 */
export function parseFileDependencies(filePath: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    let content: string;

    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.warn(`Failed to read file for parsing: ${filePath}`);
        return [];
    }

    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
    );

    function visit(node: ts.Node) {
        if (ts.isImportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const importPathStr = node.moduleSpecifier.text;
                const resolved = resolveImportPath(filePath, importPathStr);

                if (resolved) {
                    const specifiers: ImportInfo['specifiers'] = [];

                    if (node.importClause) {
                        // Default import: import foo from 'bar'
                        if (node.importClause.name) {
                            specifiers.push({
                                name: 'default',
                                alias: node.importClause.name.text,
                                isDefault: true,
                                isNamespace: false
                            });
                        }

                        // Named imports: import { foo, bar as baz } from 'bar'
                        if (node.importClause.namedBindings) {
                            if (ts.isNamedImports(node.importClause.namedBindings)) {
                                node.importClause.namedBindings.elements.forEach(element => {
                                    specifiers.push({
                                        name: element.propertyName ? element.propertyName.text : element.name.text,
                                        alias: element.name.text,
                                        isDefault: false,
                                        isNamespace: false
                                    });
                                });
                            }
                            // Namespace import: import * as foo from 'bar'
                            else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                                specifiers.push({
                                    name: '*',
                                    alias: node.importClause.namedBindings.name.text,
                                    isDefault: false,
                                    isNamespace: true
                                });
                            }
                        }
                    }

                    imports.push({
                        modulePath: resolved,
                        originalPath: importPathStr,
                        specifiers
                    });
                }
            }
        }
        // Handle Export Declarations with module specifier: export ... from '...'
        else if (ts.isExportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const importPathStr = node.moduleSpecifier.text;
                const resolved = resolveImportPath(filePath, importPathStr);

                if (resolved) {
                    // Start with empty specifiers
                    const specifiers: ImportInfo['specifiers'] = [];

                    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                        node.exportClause.elements.forEach(element => {
                            specifiers.push({
                                name: element.propertyName ? element.propertyName.text : element.name.text,
                                alias: element.name.text,
                                isDefault: false,
                                isNamespace: false
                            });
                        });
                    }

                    imports.push({
                        modulePath: resolved,
                        originalPath: importPathStr,
                        specifiers
                    });
                }
            }
        }
        else if (ts.isCallExpression(node)) {
            if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
                const args = node.arguments;
                if (args.length > 0 && ts.isStringLiteral(args[0])) {
                    const importPathStr = args[0].text;
                    const resolved = resolveImportPath(filePath, importPathStr);
                    if (resolved) {
                        // require usually returns the whole module or any
                        imports.push({
                            modulePath: resolved,
                            originalPath: importPathStr,
                            specifiers: [] // require is dynamic, hard to track specifiers statically simply
                        });
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return imports;
}

/**
 * Parses a TypeScript/JavaScript file to extract function calls.
 */
export function parseFunctionCalls(filePath: string, imports: ImportInfo[]): FunctionCall[] {
    const calls: FunctionCall[] = [];
    let content: string;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        return [];
    }

    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
    );

    // Build a map of local aliases to imported modules
    // alias -> { modulePath, name }
    const importMap = new Map<string, { modulePath: string, name: string }>();
    imports.forEach(imp => {
        imp.specifiers.forEach(spec => {
            const alias = spec.alias || spec.name;
            importMap.set(alias, { modulePath: imp.modulePath, name: spec.name });
        });
    });

    let currentCaller = 'global';

    function getCallerName(node: ts.Node): string {
        let parent = node.parent;
        while (parent) {
            if (ts.isFunctionDeclaration(parent) && parent.name) {
                return parent.name.text;
            } else if (ts.isMethodDeclaration(parent) && parent.name) {
                // Approximate method name
                return parent.name.getText(sourceFile);
            } else if (ts.isClassDeclaration(parent) && parent.name) {
                return parent.name.text; // Constructor or field init
            } else if (ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) {
                // Try to find variable name assignment
                const varDecl = findParentVariableDeclaration(parent);
                if (varDecl) return varDecl;
                return 'anonymous';
            }
            parent = parent.parent;
        }
        return 'global';
    }

    function findParentVariableDeclaration(node: ts.Node): string | undefined {
        let p = node.parent;
        while (p) {
            if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
                return p.name.text;
            }
            if (ts.isBlock(p) || ts.isSourceFile(p)) break;
            p = p.parent;
        }
        return undefined;
    }

    function visit(node: ts.Node) {
        // Track current scope roughly (not perfect for nested)
        if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
            const prevCaller = currentCaller;
            currentCaller = getCallerName(node.body || node);
            ts.forEachChild(node, visit);
            currentCaller = prevCaller;
            return;
        }

        if (ts.isCallExpression(node)) {
            // Simple calls: foo()
            if (ts.isIdentifier(node.expression)) {
                const calleeName = node.expression.text;
                const imported = importMap.get(calleeName);

                calls.push({
                    callerName: currentCaller,
                    calleeName: imported ? imported.name : calleeName,
                    importPath: imported ? imported.modulePath : undefined,
                    lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
                });
            }
            // Property access calls: obj.foo()
            else if (ts.isPropertyAccessExpression(node.expression)) {
                const propAccess = node.expression;
                // Case: ImportedModule.foo() (Namespace import)
                if (ts.isIdentifier(propAccess.expression)) {
                    const objName = propAccess.expression.text;
                    const methodName = propAccess.name.text;

                    const importedObj = importMap.get(objName);
                    if (importedObj && importedObj.name === '*') { // Namespace import
                        calls.push({
                            callerName: currentCaller,
                            calleeName: methodName,
                            importPath: importedObj.modulePath,
                            lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
                        });
                    } else {
                        // Method call on object: obj.method()
                        // Hard to resolve obj type without full type checker
                        // We record it as method call
                        calls.push({
                            callerName: currentCaller,
                            calleeName: `${objName}.${methodName}`,
                            importPath: undefined, // Cannot easily determine definition file
                            lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
                        });
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return calls;
}


/**
 * Parses a TypeScript/JavaScript file to extract symbols (functions, classes, etc.)
 * 
 * @param filePath - Absolute path to the file
 * @returns List of symbols found in the file
 */
export function parseFileSymbols(filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    let content: string;

    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.warn(`Failed to read file for symbol parsing: ${filePath}`);
        return [];
    }

    // Create a SourceFile
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true // setParentNodes
    );

    /**
     * Gets the line number (1-based) for a position in the source file
     */
    function getLineNumber(pos: number): number {
        return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
    }

    /**
     * Checks if a node has export modifiers
     */
    function isExported(node: ts.Node): boolean {
        if (!ts.canHaveModifiers(node)) return false;
        const modifiers = ts.getModifiers(node);
        return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }

    function visit(node: ts.Node) {
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
                        name: `${node.name!.getText(sourceFile)}.${member.name.getText(sourceFile)}`,
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
