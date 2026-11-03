import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ChannelState,
    FeedbackMessage,
    getWsUrl,
    InboundMessage,
    LogEntry,
    SnapshotMessage,
} from '../types'
import { createDefaultFx } from '../constants/fxParams'

const MAX_LOG_ENTRIES = 50
const RECONNECT_MS = 2000
const CONSOLE_PREFIX = '[mock-device ws]'

function logToConsole(direction: 'in' | 'out', message: unknown): void {
    const arrow = direction === 'in' ? '←' : '→'
    console.log(`${CONSOLE_PREFIX} ${arrow}`, message)
}

function appendLogEntry(
    prev: LogEntry[],
    direction: 'in' | 'out',
    message: unknown
): LogEntry[] {
    logToConsole(direction, message)
    const next = [...prev, { direction, message, timestamp: new Date() }]
    return next.slice(-MAX_LOG_ENTRIES)
}

function createDefaultChannels(
    count: number,
    auxSendCount = 4
): ChannelState[] {
    return Array.from({ length: count }, (_, index) => ({
        index,
        faderLevel: 0.75,
        inputGain: 0.75,
        inputSelector: 1,
        mute: false,
        pfl: false,
        amixOn: false,
        nextAuxLevel: 0,
        auxLevels: Array.from({ length: auxSendCount }, () => 0),
        name: `CH${index + 1}`,
        fx: createDefaultFx(),
    }))
}

function applyFx(
    channels: ChannelState[],
    channel: number,
    fxParam: number,
    level: number
): ChannelState[] {
    return channels.map((entry) => {
        if (entry.index !== channel) {
            return entry
        }
        const fx = [...entry.fx]
        fx[fxParam] = level
        return { ...entry, fx }
    })
}

function applyFeedback(
    channels: ChannelState[],
    message: FeedbackMessage
): ChannelState[] {
    return channels.map((channel) => {
        if (channel.index !== message.channel) {
            return channel
        }
        switch (message.type) {
            case 'faderLevel':
                return {
                    ...channel,
                    faderLevel: message.level ?? channel.faderLevel,
                }
            case 'inputGain':
                return {
                    ...channel,
                    inputGain: message.level ?? channel.inputGain,
                }
            case 'inputSelector':
                return {
                    ...channel,
                    inputSelector: message.selected ?? channel.inputSelector,
                }
            case 'mute':
                return { ...channel, mute: message.mute ?? channel.mute }
            case 'pfl':
                return { ...channel, pfl: message.pfl ?? channel.pfl }
            case 'amixOn':
                return { ...channel, amixOn: message.amixOn ?? channel.amixOn }
            case 'nextAux':
                return {
                    ...channel,
                    nextAuxLevel: message.level ?? channel.nextAuxLevel,
                }
            case 'auxLevel': {
                const auxLevels = [...channel.auxLevels]
                auxLevels[message.auxIndex ?? 0] = message.level ?? 0
                return { ...channel, auxLevels }
            }
            case 'channelName':
                return { ...channel, name: message.name ?? channel.name }
            case 'fx':
                return applyFx(
                    channels,
                    message.channel,
                    message.fxParam ?? 0,
                    message.level ?? 0
                )[message.channel]
            default:
                return channel
        }
    })
}

function applyOptimisticCommand(
    channels: ChannelState[],
    command: Record<string, unknown>,
    auxSendCount = 4
): ChannelState[] {
    const channel = command.channel as number | undefined

    switch (command.type) {
        case 'setFaderLevel':
            return applyFeedback(channels, {
                type: 'faderLevel',
                channel: channel ?? 0,
                level: command.level as number,
                source: 'hardware',
            })
        case 'setInputGain':
            return applyFeedback(channels, {
                type: 'inputGain',
                channel: channel ?? 0,
                level: command.level as number,
                source: 'hardware',
            })
        case 'setInputSelector':
            return applyFeedback(channels, {
                type: 'inputSelector',
                channel: channel ?? 0,
                selected: command.selected as number,
                source: 'hardware',
            })
        case 'setMute':
            return applyFeedback(channels, {
                type: 'mute',
                channel: channel ?? 0,
                mute: command.mute as boolean,
                source: 'hardware',
            })
        case 'setPfl':
            return applyFeedback(channels, {
                type: 'pfl',
                channel: channel ?? 0,
                pfl: command.pfl as boolean,
                source: 'hardware',
            })
        case 'setAMix':
            return applyFeedback(channels, {
                type: 'amixOn',
                channel: channel ?? 0,
                amixOn: command.amixOn as boolean,
                source: 'hardware',
            })
        case 'setNextAux':
            return applyFeedback(channels, {
                type: 'nextAux',
                channel: channel ?? 0,
                level: command.level as number,
                source: 'hardware',
            })
        case 'setAuxLevel':
            return applyFeedback(channels, {
                type: 'auxLevel',
                channel: channel ?? 0,
                auxIndex: command.auxIndex as number,
                level: command.level as number,
                source: 'hardware',
            })
        case 'setChannelName':
            return applyFeedback(channels, {
                type: 'channelName',
                channel: channel ?? 0,
                name: command.name as string,
                source: 'hardware',
            })
        case 'setFx':
            return applyFeedback(channels, {
                type: 'fx',
                channel: channel ?? 0,
                fxParam: command.fxParam as number,
                level: command.level as number,
                source: 'hardware',
            })
        case 'resetAll':
            return createDefaultChannels(channels.length, auxSendCount)
        default:
            return channels
    }
}

export function useDeviceSocket() {
    const [connected, setConnected] = useState(false)
    const [sisyfosConnected, setSisyfosConnected] = useState(false)
    const [sisyfosClients, setSisyfosClients] = useState(0)
    const [channels, setChannels] = useState<ChannelState[]>(() =>
        createDefaultChannels(8)
    )
    const [inputSelectorCount, setInputSelectorCount] = useState(4)
    const [auxSendCount, setAuxSendCount] = useState(4)
    const auxSendCountRef = useRef(4)
    const [vuLevels, setVuLevels] = useState<Record<number, number>>({})
    const [logEntries, setLogEntries] = useState<LogEntry[]>([])
    const [lastUpdated, setLastUpdated] = useState<Record<number, Date>>({})
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimer = useRef<number | null>(null)

    const appendLog = useCallback(
        (direction: 'in' | 'out', message: unknown) => {
            setLogEntries((prev) => appendLogEntry(prev, direction, message))
        },
        []
    )

    const handleInbound = useCallback(
        (message: InboundMessage) => {
            if (message.type !== 'vuLevel') {
                appendLog('in', message)
            }

            if (message.type === 'vuLevel') {
                const vu = message as { channel: number; level: number }
                setVuLevels((prev) => ({
                    ...prev,
                    [vu.channel]: vu.level,
                }))
                return
            }

            if (message.type === 'snapshot') {
                const snapshot = message as SnapshotMessage
                setChannels(snapshot.channels)
                setInputSelectorCount(snapshot.inputSelectorCount ?? 4)
                setAuxSendCount(snapshot.auxSendCount ?? 4)
                auxSendCountRef.current = snapshot.auxSendCount ?? 4
                return
            }

            if (message.type === 'clientStatus') {
                setSisyfosConnected(message.sisyfosConnected)
                setSisyfosClients(message.sisyfosClients)
                return
            }

            if (
                message.type === 'faderLevel' ||
                message.type === 'inputGain' ||
                message.type === 'inputSelector' ||
                message.type === 'mute' ||
                message.type === 'pfl' ||
                message.type === 'amixOn' ||
                message.type === 'nextAux' ||
                message.type === 'auxLevel' ||
                message.type === 'channelName' ||
                message.type === 'fx'
            ) {
                const feedback = message as FeedbackMessage
                setChannels((prev) => applyFeedback(prev, feedback))
                setLastUpdated((prev) => ({
                    ...prev,
                    [feedback.channel ?? 0]: new Date(),
                }))
            }

            if (message.type === 'presetLoaded') {
                setLastUpdated({})
            }
        },
        [appendLog]
    )

    const handleInboundRef = useRef(handleInbound)
    handleInboundRef.current = handleInbound

    const sendCommand = useCallback(
        (command: Record<string, unknown>, hardware = false) => {
            const payload = hardware
                ? { ...command, source: 'hardware' }
                : command
            appendLog('out', payload)

            if (hardware) {
                setChannels((prev) =>
                    applyOptimisticCommand(
                        prev,
                        command,
                        auxSendCountRef.current
                    )
                )
                const channel = command.channel as number | undefined
                if (typeof channel === 'number') {
                    setLastUpdated((prev) => ({
                        ...prev,
                        [channel]: new Date(),
                    }))
                } else if (command.type === 'resetAll') {
                    setLastUpdated({})
                }
            }

            const ws = wsRef.current
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(payload))
            }
        },
        [appendLog]
    )

    useEffect(() => {
        let cancelled = false

        const connect = () => {
            if (cancelled) {
                return
            }

            const ws = new WebSocket(getWsUrl())
            wsRef.current = ws

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as InboundMessage
                    handleInboundRef.current(message)
                } catch {
                    appendLog('in', {
                        type: 'error',
                        message: 'Invalid JSON from server',
                    })
                }
            }

            ws.onopen = () => {
                setConnected(true)
                const subscribe = { type: 'subscribe', clientType: 'ui' }
                ws.send(JSON.stringify(subscribe))
                appendLog('out', subscribe)
            }

            ws.onclose = () => {
                setConnected(false)
                setSisyfosConnected(false)
                setSisyfosClients(0)
                wsRef.current = null
                if (!cancelled) {
                    reconnectTimer.current = window.setTimeout(
                        connect,
                        RECONNECT_MS
                    )
                }
            }

            ws.onerror = () => {
                ws.close()
            }
        }

        connect()

        return () => {
            cancelled = true
            if (reconnectTimer.current !== null) {
                window.clearTimeout(reconnectTimer.current)
            }
            wsRef.current?.close()
        }
    }, [appendLog])

    const resetAll = useCallback(() => {
        sendCommand({ type: 'resetAll' }, true)
    }, [sendCommand])

    const loadPreset = useCallback(
        (presetName: string) => {
            sendCommand({ type: 'loadMixerPreset', presetName })
        },
        [sendCommand]
    )

    return {
        connected,
        sisyfosConnected,
        sisyfosClients,
        channels,
        inputSelectorCount,
        vuLevels,
        logEntries,
        lastUpdated,
        sendCommand,
        resetAll,
        loadPreset,
    }
}
