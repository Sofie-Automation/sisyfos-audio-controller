import express from 'express'
import path from 'path'
import { logger } from '../utils/logger'
import { app, httpServer, socketServer, ROOT_PATH, SERVER_PORT } from './server'
import { apiRouter } from './routes'
import { onSocketConnection } from './socketConnection'

export const startServer = () => {
    logger.info('Initialising WebServer')

    const staticPath = path.join(
        path.dirname(require.resolve('client/package.json')),
        'dist'
    )
    logger.data(staticPath).debug('Express static file path:')
    app.use(ROOT_PATH, express.static(staticPath))
    app.use('/api', apiRouter)

    socketServer.on('connection', onSocketConnection)

    httpServer.listen(SERVER_PORT)
    logger.info(`Server started at http://localhost:${SERVER_PORT}${ROOT_PATH}`)
}
