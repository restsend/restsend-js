import { resolve } from 'node:path'
import type { UserConfig } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import Vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }): UserConfig => {
    const env = loadEnv(mode, process.cwd())
    const server = env.VITE_API_SERVER || 'http://chat.ruzhila.cn'

    return {
        plugins: [Vue()],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
            },
        },
        server: {
            host:"0.0.0.0",
            port:80,
            open:true,
            proxy: {
                '/api/connect': {
                    target: server,
                    changeOrigin: true,
                    ws: true,
                },
                '/auth': {
                    target: server,
                    changeOrigin: true,
                },
                '/api': {
                    target: server,
                    changeOrigin: true,
                },
            },
        },
    }
})
