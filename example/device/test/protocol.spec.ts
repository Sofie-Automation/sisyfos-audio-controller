import fs from 'fs'
import os from 'os'
import path from 'path'
import WebSocket from 'ws'
import { PresetStore } from '../src/presets/PresetStore'
import { DeviceState } from '../src/state/DeviceState'
import { VuMeterSimulator } from '../src/vu/VuMeterSimulator'
import { WsServer } from '../src/ws/WsServer'

function waitForMessage(ws: WebSocket): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for message'))
        }, 3000)

        ws.once('message', (data) => {
            clearTimeout(timeout)
            resolve(JSON.parse(data.toString()))
        })
    })
}

function waitForMessageType(ws: WebSocket, type: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timed out waiting for message type: ${type}`))
        }, 3000)

        const handler = (data: WebSocket.RawData) => {
            const message = JSON.parse(data.toString()) as { type?: string }
            if (message.type === type) {
                clearTimeout(timeout)
                ws.off('message', handler)
                resolve(message)
            }
        }

        ws.on('message', handler)
    })
}

function send(ws: WebSocket, message: unknown): void {
    ws.send(JSON.stringify(message))
}

async function connectClient(port: number): Promise<WebSocket> {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`)
    const onlinePromise = waitForMessageType(ws, 'online')
    const statusPromise = waitForMessageType(ws, 'clientStatus')

    await new Promise<void>((resolve, reject) => {
        ws.once('open', () => resolve())
        ws.once('error', reject)
    })

    expect(await onlinePromise).toEqual({ type: 'online', online: true })
    await statusPromise

    return ws
}

describe('WebSocket protocol', () => {
    let state: DeviceState
    let wsServer: WsServer
    let port: number
    let presetDir: string
    let presetStore: PresetStore

    beforeEach(async () => {
        presetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-presets-'))
        fs.writeFileSync(
            path.join(presetDir, 'test-preset.json'),
            JSON.stringify({
                channels: [
                    {
                        index: 0,
                        faderLevel: 0.42,
                        inputGain: 0.75,
                        inputSelector: 1,
                        mute: true,
                        pfl: false,
                        amixOn: false,
                        nextAuxLevel: 0,
                        auxLevels: [0, 0, 0, 0],
                        name: 'Preset CH1',
                        fx: Array.from({ length: 22 }, () => 0),
                    },
                ],
            })
        )

        state = new DeviceState(8)
        presetStore = new PresetStore(presetDir, 8, 4, 4)
        wsServer = new WsServer(state, 0, '127.0.0.1', presetStore)
        await wsServer.whenReady()
        port = wsServer.getPort()
    })

    afterEach(async () => {
        await wsServer.close()
        fs.rmSync(presetDir, { recursive: true, force: true })
    })

    it('sends online on connect and snapshot on subscribe', async () => {
        const ws = await connectClient(port)

        send(ws, { type: 'subscribe' })
        const snapshot = await waitForMessage(ws)

        expect(snapshot).toMatchObject({
            type: 'snapshot',
            online: true,
            channels: expect.any(Array),
        })
        expect((snapshot as { channels: unknown[] }).channels).toHaveLength(8)

        ws.close()
    })

    it('handles setFaderLevel with command source by default', async () => {
        const ws = await connectClient(port)

        send(ws, { type: 'setFaderLevel', channel: 0, level: 0.5 })
        const feedback = await waitForMessage(ws)

        expect(feedback).toEqual({
            type: 'faderLevel',
            channel: 0,
            level: 0.5,
            source: 'command',
        })

        ws.close()
    })

    it('propagates hardware source on commands', async () => {
        const ws = await connectClient(port)

        send(ws, {
            type: 'setFaderLevel',
            channel: 0,
            level: 0.8,
            source: 'hardware',
        })
        const feedback = await waitForMessage(ws)

        expect(feedback).toEqual({
            type: 'faderLevel',
            channel: 0,
            level: 0.8,
            source: 'hardware',
        })

        ws.close()
    })

    it('responds to ping with pong', async () => {
        const ws = await connectClient(port)

        send(ws, { type: 'ping', id: 'test-1' })
        const pong = await waitForMessage(ws)

        expect(pong).toEqual({ type: 'pong', id: 'test-1' })

        ws.close()
    })

    it('handles all v1 command types', async () => {
        const ws = await connectClient(port)

        const commands = [
            {
                type: 'setMute',
                channel: 0,
                mute: true,
                expected: {
                    type: 'mute',
                    channel: 0,
                    mute: true,
                    source: 'command',
                },
            },
            {
                type: 'setInputGain',
                channel: 1,
                level: 0.4,
                expected: {
                    type: 'inputGain',
                    channel: 1,
                    level: 0.4,
                    source: 'command',
                },
            },
            {
                type: 'setInputSelector',
                channel: 2,
                selected: 2,
                expected: {
                    type: 'inputSelector',
                    channel: 2,
                    selected: 2,
                    source: 'command',
                },
            },
            {
                type: 'setPfl',
                channel: 1,
                pfl: true,
                expected: {
                    type: 'pfl',
                    channel: 1,
                    pfl: true,
                    source: 'command',
                },
            },
            {
                type: 'setAMix',
                channel: 0,
                amixOn: true,
                expected: {
                    type: 'amixOn',
                    channel: 0,
                    amixOn: true,
                    source: 'command',
                },
            },
            {
                type: 'setAuxLevel',
                channel: 1,
                auxIndex: 1,
                level: 0.3,
                expected: {
                    type: 'auxLevel',
                    channel: 1,
                    auxIndex: 1,
                    level: 0.3,
                    source: 'command',
                },
            },
            {
                type: 'setNextAux',
                channel: 2,
                level: 0.4,
                expected: {
                    type: 'nextAux',
                    channel: 2,
                    level: 0.4,
                    source: 'command',
                },
            },
            {
                type: 'setChannelName',
                channel: 3,
                name: 'Mic 1',
                expected: {
                    type: 'channelName',
                    channel: 3,
                    name: 'Mic 1',
                    source: 'command',
                },
            },
            {
                type: 'setFx',
                channel: 0,
                fxParam: 12,
                level: 0.5,
                expected: {
                    type: 'fx',
                    channel: 0,
                    fxParam: 12,
                    level: 0.5,
                    source: 'command',
                },
            },
        ] as const

        for (const command of commands) {
            send(ws, command)
            const feedback = await waitForMessage(ws)
            expect(feedback).toEqual(command.expected)
        }

        ws.close()
    })

    it('broadcasts feedback to all connected clients', async () => {
        const wsA = await connectClient(port)
        const wsB = await connectClient(port)

        send(wsA, { type: 'setMute', channel: 0, mute: true })

        const [feedbackA, feedbackB] = await Promise.all([
            waitForMessageType(wsA, 'mute'),
            waitForMessageType(wsB, 'mute'),
        ])

        expect(feedbackA).toEqual(feedbackB)
        expect(feedbackA).toEqual({
            type: 'mute',
            channel: 0,
            mute: true,
            source: 'command',
        })

        wsA.close()
        wsB.close()
    })

    it('returns error for invalid JSON', async () => {
        const ws = await connectClient(port)

        ws.send('not json')
        const error = await waitForMessage(ws)

        expect(error).toEqual({ type: 'error', message: 'Invalid JSON' })

        ws.close()
    })

    it('streams vuLevel feedback when simulator is enabled', async () => {
        const vuSimulator = new VuMeterSimulator({
            channelCount: 8,
            intervalMs: 30,
        })
        const vuWsServer = new WsServer(
            state,
            0,
            '127.0.0.1',
            undefined,
            vuSimulator
        )
        await vuWsServer.whenReady()
        const vuPort = vuWsServer.getPort()

        const ws = await connectClient(vuPort)
        const vuLevelPromise = waitForMessageType(ws, 'vuLevel')
        const vuLevel = (await vuLevelPromise) as {
            type: string
            channel: number
            level: number
        }

        expect(vuLevel.type).toBe('vuLevel')
        expect(vuLevel.channel).toBeGreaterThanOrEqual(0)
        expect(vuLevel.level).toBeGreaterThanOrEqual(0)
        expect(vuLevel.level).toBeLessThanOrEqual(1)

        ws.close()
        await vuWsServer.close()
    })

    it('returns error for unknown command type', async () => {
        const ws = await connectClient(port)

        send(ws, { type: 'setVuLevel', channel: 0, level: 0.5 })
        const error = await waitForMessage(ws)

        expect(error).toEqual({
            type: 'error',
            message: 'Unknown command type: setVuLevel',
        })

        ws.close()
    })

    it('returns error for setFx with invalid fxParam', async () => {
        const ws = await connectClient(port)

        send(ws, { type: 'setFx', channel: 0, fxParam: 99, level: 0.5 })
        const error = await waitForMessage(ws)

        expect(error).toEqual({
            type: 'error',
            message: 'Invalid fxParam: 99',
        })

        ws.close()
    })

    it('loads a mixer preset from disk', async () => {
        const ws = await connectClient(port)

        const presetLoadedPromise = waitForMessageType(ws, 'presetLoaded')
        send(ws, { type: 'loadMixerPreset', presetName: 'test-preset.json' })

        const presetLoaded = await presetLoadedPromise
        expect(presetLoaded).toEqual({
            type: 'presetLoaded',
            presetName: 'test-preset.json',
            source: 'command',
        })

        send(ws, { type: 'subscribe' })
        const snapshot = (await waitForMessage(ws)) as {
            channels: Array<{ faderLevel: number; mute: boolean; name: string }>
        }
        expect(snapshot.channels[0].faderLevel).toBe(0.42)
        expect(snapshot.channels[0].mute).toBe(true)
        expect(snapshot.channels[0].name).toBe('Preset CH1')

        ws.close()
    })

    it('returns error when preset file is missing', async () => {
        const ws = await connectClient(port)

        send(ws, { type: 'loadMixerPreset', presetName: 'missing.json' })
        const error = await waitForMessage(ws)

        expect(error).toEqual({
            type: 'error',
            message: 'Preset not found: missing.json',
        })

        ws.close()
    })

    it('broadcasts clientStatus when sisyfos client connects', async () => {
        const uiWs = new WebSocket(`ws://127.0.0.1:${port}`)
        const uiOnline = waitForMessageType(uiWs, 'online')
        const connectStatusPromise = waitForMessageType(uiWs, 'clientStatus')

        await new Promise<void>((resolve) => uiWs.once('open', () => resolve()))

        expect(await uiOnline).toEqual({ type: 'online', online: true })
        await connectStatusPromise

        const snapshotPromise = waitForMessageType(uiWs, 'snapshot')
        const initialStatusPromise = waitForMessageType(uiWs, 'clientStatus')
        send(uiWs, { type: 'subscribe', clientType: 'ui' })
        await snapshotPromise

        const initialStatus = await initialStatusPromise
        expect(initialStatus).toEqual({
            type: 'clientStatus',
            sisyfosConnected: false,
            sisyfosClients: 0,
            uiClients: 1,
            totalClients: 1,
        })

        const statusAfterSisyfosPromise = waitForMessageType(
            uiWs,
            'clientStatus'
        )
        const sisyfosWs = await connectClient(port)
        const sisyfosSnapshotPromise = waitForMessageType(sisyfosWs, 'snapshot')
        send(sisyfosWs, { type: 'subscribe' })
        await sisyfosSnapshotPromise
        const statusAfterSisyfos = await statusAfterSisyfosPromise

        expect(statusAfterSisyfos).toEqual({
            type: 'clientStatus',
            sisyfosConnected: true,
            sisyfosClients: 1,
            uiClients: 1,
            totalClients: 2,
        })

        const statusAfterDisconnectPromise = waitForMessageType(
            uiWs,
            'clientStatus'
        )
        sisyfosWs.close()
        const statusAfterDisconnect = await statusAfterDisconnectPromise

        expect(statusAfterDisconnect).toEqual({
            type: 'clientStatus',
            sisyfosConnected: false,
            sisyfosClients: 0,
            uiClients: 1,
            totalClients: 1,
        })

        uiWs.close()
    })
})
