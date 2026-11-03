import http from 'http'
import path from 'path'
import { loadConfig } from './config'
import { createHttpServer } from './http/server'
import { logger } from './logger'
import { PresetStore } from './presets/PresetStore'
import { DeviceState } from './state/DeviceState'
import { VuMeterSimulator } from './vu/VuMeterSimulator'
import { WsServer } from './ws/WsServer'

async function main(): Promise<void> {
    const config = loadConfig()
    const state = new DeviceState(
        config.channelCount,
        config.inputSelectorCount,
        config.auxSendCount
    )
    const presetStore = new PresetStore(
        config.presetDir,
        config.channelCount,
        config.inputSelectorCount,
        config.auxSendCount
    )
    const vuSimulator = config.vuEnabled
        ? new VuMeterSimulator({
              channelCount: config.channelCount,
              intervalMs: config.vuIntervalMs,
              isMuted: (channel) => state.getChannel(channel).mute,
          })
        : undefined
    const wsServer = await WsServer.create(
        state,
        config.wsPort,
        undefined,
        presetStore,
        vuSimulator
    )
    const app = createHttpServer(wsServer, presetStore)

    const httpServer = http.createServer(app)
    await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject)
        httpServer.listen(config.httpPort, () => {
            httpServer.off('error', reject)
            resolve()
        })
    })

    logger.http(`listening on http://localhost:${config.httpPort}`)
    logger.ws(`listening on ws://localhost:${config.wsPort}`)
    logger.ws(
        `mock device ready (${config.channelCount} channels, presets in ${path.resolve(config.presetDir)}${config.vuEnabled ? `, vu @ ${config.vuIntervalMs}ms` : ''})`
    )

    let shuttingDown = false
    const shutdown = async (signal: string): Promise<void> => {
        if (shuttingDown) {
            return
        }
        shuttingDown = true
        logger.http(`${signal} received, shutting down...`)

        try {
            await wsServer.close()
        } catch (error) {
            logger.error('Error closing WebSocket server', error)
        }

        await new Promise<void>((resolve) => {
            httpServer.close(() => resolve())
        })

        // SIGTERM is used by tsx watch on hot reload — don't force exit;
        // let the process end once sockets are closed so the port is released.
        if (signal === 'SIGINT') {
            process.exit(0)
        }
    }

    process.on('SIGINT', () => void shutdown('SIGINT'))
    process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Failed to start mock device', message)
    if (message.includes('EADDRINUSE')) {
        logger.error(
            'Port already in use — stop other instances (yarn dev) before starting again'
        )
    }
    process.exit(1)
})
