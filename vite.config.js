const path = require('path')
const { defineConfig } = require('vite');

module.exports = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/main.js'),
            name: 'restsend-sdk',
            fileName: (format) => `restsend-sdk.${format}.js`
        }
    },
    test: {
        setupFiles: 'tests/setup.js',
    }
});