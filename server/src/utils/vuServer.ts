import { Socket } from 'socket.io'
import { VuType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

const sockets: Array<Socket> = []

export function socketSubscribeVu(socket: Socket) {
    const i = sockets.indexOf(socket)
    if (i === -1) {
        sockets.push(socket)
    }
}

export function socketUnsubscribeVu(socket: Socket) {
    const i = sockets.indexOf(socket)
    if (i >= 0) {
        sockets.splice(i, 1)
    }
}

export function sendVuLevel(
    faderIndex: number,
    type: VuType,
    channelIndex: number,
    level: number
) {
    sockets.forEach((socket) => {
        socket.emit(type, faderIndex, channelIndex, level)
    })
}
