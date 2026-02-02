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
const fileSystem_1 = require("./src/analyzer/fileSystem");
const path = __importStar(require("path"));
async function test() {
    const rootPath = path.resolve(__dirname, 'src');
    console.log(`Analyzing: ${rootPath}`);
    const data = await (0, fileSystem_1.analyzeWorkspace)(rootPath);
    console.log('Nodes:', data.nodes.length);
    console.log('Edges:', data.edges.length);
    // Check for import edges
    const importEdges = data.edges.filter((e) => e.type === 'imports');
    console.log('Import Edges:', importEdges.length);
    if (importEdges.length > 0) {
        console.log('Sample Import Edge:', importEdges[0]);
    }
    else {
        console.warn('No import edges found!');
    }
}
test().catch(console.error);
//# sourceMappingURL=test_parsing.js.map