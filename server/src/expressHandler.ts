import { logger } from './utils/logger'
import { socketSubscribeVu, socketUnsubscribeVu } from './utils/vuServer'
import {
    socketSubscribeOutputLevel,
    socketUnsubscribeOutputLevel,
} from './utils/outputLevelServer'
import {
    STORAGE_FOLDER,
    saveMixerPreset,
    deleteMixerPreset,
    saveCustomPages,
    getCustomPages,
} from './utils/SettingsStorage'
import { SOCKET_RETURN_PAGES_LIST } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

import express from 'express'
import path from 'path'
import { Server } from 'http'
import { Server as SocketServer } from 'socket.io'
const ROOT_PATH = process.env.ROOT_PATH ?? '/'
const SOCKET_SERVER_PATH =
    ROOT_PATH + (ROOT_PATH.endsWith('/') ? '' : '/') + 'socket.io/'
const app = express()
const server = new Server(app)
const socketServer = new SocketServer(server, {
    path: SOCKET_SERVER_PATH,
    cors: {
        origin: '*',
    },
})
const SERVER_PORT = 1176
const staticPath = path.join(
    path.dirname(require.resolve('client/package.json')),
    'dist'
)
logger.data(staticPath).debug('Express static file path:')
app.use(ROOT_PATH, express.static(staticPath))

// Mixer preset file management HTTP endpoints
app.get(
    '/api/mixer-preset/:filename',
    (req: express.Request, res: express.Response) => {
        const filename = path.basename(req.params.filename)
        const filePath = path.join(STORAGE_FOLDER, filename)
        res.download(filePath, filename, (err: any) => {
            if (err && !res.headersSent) {
                logger.error(`Error downloading preset ${filename}: ${err}`)
                res.status(404).send('File not found')
            }
        })
    }
)

app.put(
    '/api/mixer-preset/:filename',
    express.raw({ type: '*/*', limit: '50mb' }),
    async (req: express.Request, res: express.Response) => {
        const filename = path.basename(req.params.filename)
        if (!filename) {
            res.status(400).send('filename required')
            return
        }
        try {
            await saveMixerPreset(filename, req.body as Buffer)
            res.status(200).send('OK')
        } catch (error: any) {
            logger.data(error).error(`Error saving mixer preset: ${filename}`)
            res.status(500).send('Error saving file')
        }
    }
)

app.delete(
    '/api/mixer-preset/:filename',
    async (req: express.Request, res: express.Response) => {
        const filename = path.basename(req.params.filename)
        try {
            await deleteMixerPreset(filename)
            res.status(200).send('OK')
        } catch (error: any) {
            logger.data(error).error(`Error deleting mixer preset: ${filename}`)
            res.status(404).send('File not found')
        }
    }
)

// Pages HTTP endpoints
app.get('/api/pages', (_req: express.Request, res: express.Response) => {
    const pages = getCustomPages()
    res.setHeader('Content-Disposition', 'attachment; filename="pages.json"')
    res.json(pages)
})

app.put(
    '/api/pages',
    express.json({ limit: '1mb' }),
    async (req: express.Request, res: express.Response) => {
        const pages = req.body
        if (
            !Array.isArray(pages) ||
            !pages.every(
                (p: any) =>
                    typeof p.id === 'string' &&
                    typeof p.label === 'string' &&
                    Array.isArray(p.faders)
            )
        ) {
            res.status(400).send('Invalid pages format')
            return
        }
        try {
            await saveCustomPages(pages)
            socketServer.emit(SOCKET_RETURN_PAGES_LIST, pages)
            res.status(200).send('OK')
        } catch (error: any) {
            logger.data(error).error('Error saving pages')
            res.status(500).send('Error saving pages')
        }
    }
)

server.listen(SERVER_PORT)
logger.info(`Server started at http://localhost:${SERVER_PORT}${ROOT_PATH}`)

socketServer.on('connection', (socket: any) => {
    logger.info(`Client connected: ${socket.client.id}`)
    global.mainThreadHandler.socketServerHandlers(socket)

    socket.on('subscribe-vu-meter', () => {
        logger.debug('Socket subscribe vu')
        socketSubscribeVu(socket)
    })
    socket.on('subscribe-output-level', () => {
        logger.debug('Socket subscribe output')
        socketSubscribeOutputLevel(socket)
    })
    socket.on('disconnect', () => {
        socketUnsubscribeVu(socket)
        socketUnsubscribeOutputLevel(socket)
    })
})

export const expressInit = () => {
    logger.info('Initialising WebServer')
}

export { socketServer }
