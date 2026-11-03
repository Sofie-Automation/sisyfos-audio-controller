import express from 'express'
import { Server } from 'http'
import { Server as SocketServer } from 'socket.io'

// Only creates the server objects. Must not import routes, as routes import socketServer
export const ROOT_PATH = process.env.ROOT_PATH ?? '/'
export const SERVER_PORT = 1176
const SOCKET_SERVER_PATH =
    ROOT_PATH + (ROOT_PATH.endsWith('/') ? '' : '/') + 'socket.io/'

export const app = express()
export const httpServer = new Server(app)
export const socketServer = new SocketServer(httpServer, {
    path: SOCKET_SERVER_PATH,
    cors: {
        origin: '*',
    },
})
