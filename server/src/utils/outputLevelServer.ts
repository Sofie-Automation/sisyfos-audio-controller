import { Socket } from 'socket.io'

const sockets: Array<Socket> = []

export function socketSubscribeOutputLevel(socket: Socket) {
    const i = sockets.indexOf(socket)
    if (i === -1) {
        sockets.push(socket)
    }
}

export function socketUnsubscribeOutputLevel(socket: Socket) {
    const i = sockets.indexOf(socket)
    if (i >= 0) {
        sockets.splice(i, 1)
    }
}

export function sendChLevelsToOuputServer(
    mixerIndex: number,
    channelIndex: number,
    level: number
) {
    sockets.forEach((socket) => {
        socket.emit('outputLevel', mixerIndex, channelIndex, level)
    })
}
