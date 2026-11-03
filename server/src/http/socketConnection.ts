import { Socket } from 'socket.io'
import { logger } from '../utils/logger'
import { socketSubscribeVu, socketUnsubscribeVu } from '../utils/vuServer'
import {
    socketSubscribeOutputLevel,
    socketUnsubscribeOutputLevel,
} from '../utils/outputLevelServer'

export const onSocketConnection = (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`)
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
}
