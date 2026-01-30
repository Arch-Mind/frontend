const path = require('path');

module.exports = {
    entry: './src/webview/index.tsx', // Verify this path later
    output: {
        path: path.resolve(__dirname, 'out/webview'),
        filename: 'bundle.js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    devtool: 'nosources-source-map',
};
