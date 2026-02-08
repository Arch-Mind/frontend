
const fs = require('fs');
const https = require('https');
const path = require('path');

const grammars = [
    { name: 'tree-sitter-typescript', url: 'https://unpkg.com/tree-sitter-typescript@latest/tree-sitter-typescript.wasm' },
    { name: 'tree-sitter-javascript', url: 'https://unpkg.com/tree-sitter-javascript@latest/tree-sitter-javascript.wasm' },
    { name: 'tree-sitter-python', url: 'https://unpkg.com/tree-sitter-python@latest/tree-sitter-python.wasm' },
    { name: 'tree-sitter-rust', url: 'https://unpkg.com/tree-sitter-rust@latest/tree-sitter-rust.wasm' },
    { name: 'tree-sitter-go', url: 'https://unpkg.com/tree-sitter-go@latest/tree-sitter-go.wasm' },
];

const outputDir = path.join(__dirname, 'resources', 'grammars');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                download(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${path.basename(dest)}`);
                resolve();
            });
        });

        request.on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function main() {
    // Copy main tree-sitter.wasm
    const mainWasmSource = path.join(__dirname, 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm');
    const mainWasmDest = path.join(outputDir, 'tree-sitter.wasm');

    if (fs.existsSync(mainWasmSource)) {
        fs.copyFileSync(mainWasmSource, mainWasmDest);
        console.log('Copied tree-sitter.wasm');
    } else {
        console.warn('Could not find tree-sitter.wasm in node_modules');
    }

    for (const g of grammars) {
        try {
            const dest = path.join(outputDir, `${g.name}.wasm`);
            console.log(`Downloading ${g.name}...`);
            await download(g.url, dest);
        } catch (e) {
            console.error(e.message);
        }
    }
}

main();
