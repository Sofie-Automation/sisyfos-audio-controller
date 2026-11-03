import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    root: path.resolve(__dirname),
    build: {
        outDir: path.resolve(__dirname, '../dist/ui'),
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        proxy: {
            '/presets': 'http://localhost:8081',
            '/health': 'http://localhost:8081',
        },
    },
})
