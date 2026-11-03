import fs from 'fs'
import express, { Express } from 'express'
import path from 'path'
import { logger } from '../logger'
import { PresetStore } from '../presets/PresetStore'
import { WsServer } from '../ws/WsServer'

function resolveUiPath(): string | null {
    const candidates = [
        path.join(process.cwd(), 'dist', 'ui'),
        path.join(__dirname, '..', 'ui'),
    ]

    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, 'index.html'))) {
            return candidate
        }
    }

    return null
}

export function createHttpServer(
    wsServer: WsServer,
    presetStore?: PresetStore
): Express {
    const app = express()

    app.use((req, res, next) => {
        const start = Date.now()
        res.on('finish', () => {
            if (/\.(js|css|ico|png|svg|woff2?)$/i.test(req.path)) {
                return
            }
            const durationMs = Date.now() - start
            logger.http(
                `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`
            )
        })
        next()
    })

    app.get('/health', (_req, res) => {
        res.json({
            ok: true,
            clients: wsServer.getClientCount(),
            sisyfosConnected: wsServer.isSisyfosConnected(),
            sisyfosClients: wsServer.getSisyfosClientCount(),
        })
    })

    app.get('/presets', (_req, res) => {
        res.json({
            presets: presetStore?.list() ?? [],
        })
    })

    const uiPath = resolveUiPath()
    if (uiPath) {
        app.use(express.static(uiPath))
        app.get('*', (_req, res) => {
            res.sendFile(path.join(uiPath, 'index.html'))
        })
    } else {
        app.get('*', (_req, res) => {
            res.status(404).json({
                message:
                    'Web UI not built. Use the Vite dev server (yarn dev → http://localhost:5173) or run yarn build.',
            })
        })
    }

    return app
}
