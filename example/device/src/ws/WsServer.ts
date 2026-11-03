import { WebSocket, WebSocketServer } from 'ws'
import { logger, summarizeInbound, summarizeOutbound } from '../logger'
import { PresetStore } from '../presets/PresetStore'
import { DeviceState } from '../state/DeviceState'
import {
    ClientStatusMessage,
    ClientType,
    FeedbackMessage,
    OutboundMessage,
    VuLevelMessage,
} from '../state/types'
import { VuMeterSimulator } from '../vu/VuMeterSimulator'
import { buildSnapshot, handleInboundMessage } from './protocol'

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAddrInUse(error: unknown): boolean {
    return (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'EADDRINUSE'
    )
}

function parseSubscribeClientType(raw: string): ClientType | null {
    try {
        const parsed = JSON.parse(raw) as {
            type?: string
            clientType?: unknown
        }
        if (parsed.type !== 'subscribe') {
            return null
        }
        if (parsed.clientType === undefined) {
            return 'sisyfos'
        }
        if (parsed.clientType === 'ui' || parsed.clientType === 'sisyfos') {
            return parsed.clientType
        }
        return null
    } catch {
        return null
    }
}

export class WsServer {
    private readonly wss: WebSocketServer
    private readonly clients = new Set<WebSocket>()
    private readonly clientTypes = new Map<WebSocket, ClientType>()
    private readonly clientIds = new Map<WebSocket, number>()
    private nextClientId = 1
    private readonly onFeedback = (message: FeedbackMessage): void => {
        this.broadcast(message)
    }
    private readonly onVuLevel = (message: VuLevelMessage): void => {
        this.broadcast(message, false)
    }
    private readonly ready: Promise<void>
    private closed = false

    static async create(
        state: DeviceState,
        port: number,
        host?: string,
        presetStore?: PresetStore,
        vuSimulator?: VuMeterSimulator,
        maxAttempts = 8
    ): Promise<WsServer> {
        let lastError: unknown

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const server = new WsServer(
                state,
                port,
                host,
                presetStore,
                vuSimulator
            )
            try {
                await server.whenReady()
                return server
            } catch (error) {
                lastError = error
                await server.close().catch(() => undefined)
                if (!isAddrInUse(error) || attempt === maxAttempts) {
                    throw error
                }
                await delay(attempt * 150)
            }
        }

        throw lastError
    }

    constructor(
        private readonly state: DeviceState,
        port: number,
        host?: string,
        private readonly presetStore?: PresetStore,
        private readonly vuSimulator?: VuMeterSimulator
    ) {
        this.wss = new WebSocketServer({ port, host, clientTracking: true })
        this.ready = new Promise((resolve, reject) => {
            this.wss.once('listening', () => resolve())
            this.wss.once('error', reject)
        })
        this.wss.on('connection', (ws) => this.handleConnection(ws))
        this.wss.on('error', (error) => {
            logger.error('WebSocket server error', error)
        })
        this.state.on('feedback', this.onFeedback)
        this.vuSimulator?.start(this.onVuLevel)
    }

    async whenReady(): Promise<void> {
        await this.ready
    }

    getPort(): number {
        const address = this.wss.address()
        if (typeof address === 'object' && address !== null) {
            return address.port
        }
        throw new Error('WebSocket server address unavailable')
    }

    getClientCount(): number {
        return this.clients.size
    }

    getSisyfosClientCount(): number {
        return this.countClientsByType('sisyfos')
    }

    isSisyfosConnected(): boolean {
        return this.getSisyfosClientCount() > 0
    }

    buildClientStatus(): ClientStatusMessage {
        const uiClients = this.countClientsByType('ui')
        const sisyfosClients = this.countClientsByType('sisyfos')
        return {
            type: 'clientStatus',
            sisyfosConnected: sisyfosClients > 0,
            sisyfosClients,
            uiClients,
            totalClients: this.clients.size,
        }
    }

    close(): Promise<void> {
        if (this.closed) {
            return Promise.resolve()
        }
        this.closed = true
        this.state.off('feedback', this.onFeedback)
        this.vuSimulator?.stop()

        for (const client of this.clients) {
            client.close()
        }
        this.clients.clear()
        this.clientTypes.clear()
        this.clientIds.clear()

        return new Promise((resolve, reject) => {
            this.wss.close((error) => {
                if (error) {
                    reject(error)
                    return
                }
                resolve()
            })
        })
    }

    private countClientsByType(clientType: ClientType): number {
        let count = 0
        for (const client of this.clients) {
            if (this.clientTypes.get(client) === clientType) {
                count++
            }
        }
        return count
    }

    private removeClient(ws: WebSocket): void {
        const clientId = this.clientIds.get(ws)
        const wasPresent = this.clients.delete(ws)
        this.clientTypes.delete(ws)
        this.clientIds.delete(ws)
        if (wasPresent) {
            logger.ws(
                `#${clientId ?? '?'} disconnected (${this.clients.size} client${this.clients.size === 1 ? '' : 's'} remaining)`
            )
            this.broadcastClientStatus()
        }
    }

    private handleConnection(ws: WebSocket): void {
        const clientId = this.nextClientId++
        this.clientIds.set(ws, clientId)
        this.clients.add(ws)
        logger.ws(
            `#${clientId} connected (${this.clients.size} client${this.clients.size === 1 ? '' : 's'})`
        )
        this.send(ws, { type: 'online', online: true })
        this.send(ws, this.buildClientStatus())

        ws.on('message', (data) => {
            const raw = data.toString()
            logger.ws(`#${clientId} ${summarizeInbound(raw)}`)
            const subscribeClientType = parseSubscribeClientType(raw)
            const result = handleInboundMessage(
                this.state,
                raw,
                this.presetStore
            )

            if ('type' in result) {
                this.send(ws, result)
                return
            }

            switch (result.kind) {
                case 'snapshot':
                case 'pong':
                case 'error':
                    this.send(ws, result.message)
                    break
                case 'noop':
                    break
            }

            if (result.kind === 'snapshot' && subscribeClientType !== null) {
                this.clientTypes.set(ws, subscribeClientType)
                logger.ws(`#${clientId} registered as ${subscribeClientType}`)
                this.broadcastClientStatus()
            }
        })

        ws.on('close', () => {
            this.removeClient(ws)
        })

        ws.on('error', (error) => {
            logger.error(`WebSocket client #${clientId} error`, error)
            ws.close()
        })
    }

    private send(ws: WebSocket, message: OutboundMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            const clientId = this.clientIds.get(ws)
            logger.ws(`#${clientId ?? '?'} ${summarizeOutbound(message)}`)
            ws.send(JSON.stringify(message))
        }
    }

    private broadcast(message: OutboundMessage, log = true): void {
        const openClients = [...this.clients].filter(
            (client) => client.readyState === WebSocket.OPEN
        ).length
        if (log && openClients > 0) {
            logger.ws(
                `broadcast ${summarizeOutbound(message)} to ${openClients} client${openClients === 1 ? '' : 's'}`
            )
        }
        const payload = JSON.stringify(message)
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload)
            }
        }
    }

    private broadcastClientStatus(): void {
        this.broadcast(this.buildClientStatus())
    }

    sendSnapshot(ws: WebSocket): void {
        this.send(ws, buildSnapshot(this.state))
    }
}
