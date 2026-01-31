import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

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
 * @returns List of resolved absolute paths to imported files
 */
export function parseFileDependencies(filePath: string): string[] {
    const dependencies: string[] = [];
    let content: string;

    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.warn(`Failed to read file for parsing: ${filePath}`);
        return [];
    }

    // Create a SourceFile
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true // setParentNodes
    );

    function visit(node: ts.Node) {
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
