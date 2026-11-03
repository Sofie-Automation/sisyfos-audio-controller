import { DeviceState } from '../state/DeviceState'
import { isValidFxParam } from '../state/fxParams'
import { PresetStore } from '../presets/PresetStore'
import {
    ErrorMessage,
    InboundCommand,
    MessageSource,
    ProtocolError,
    ProtocolResult,
    SnapshotMessage,
} from '../state/types'

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function parseSource(value: unknown): MessageSource {
    if (value === undefined) {
        return 'command'
    }
    if (value === 'command' || value === 'hardware') {
        return value
    }
    throw new ProtocolError(`Invalid source: ${String(value)}`)
}

function requireNumber(obj: Record<string, unknown>, key: string): number {
    const value = obj[key]
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new ProtocolError(`Missing or invalid ${key}`)
    }
    return value
}

function requireBoolean(obj: Record<string, unknown>, key: string): boolean {
    const value = obj[key]
    if (typeof value !== 'boolean') {
        throw new ProtocolError(`Missing or invalid ${key}`)
    }
    return value
}

function requireString(obj: Record<string, unknown>, key: string): string {
    const value = obj[key]
    if (typeof value !== 'string') {
        throw new ProtocolError(`Missing or invalid ${key}`)
    }
    return value
}

function validateCommand(obj: Record<string, unknown>): void {
    if ('source' in obj) {
        parseSource(obj.source)
    }

    switch (obj.type) {
        case 'setFaderLevel':
            requireNumber(obj, 'channel')
            requireNumber(obj, 'level')
            break
        case 'setInputGain':
            requireNumber(obj, 'channel')
            requireNumber(obj, 'level')
            break
        case 'setInputSelector':
            requireNumber(obj, 'channel')
            requireNumber(obj, 'selected')
            break
        case 'setMute':
            requireNumber(obj, 'channel')
            requireBoolean(obj, 'mute')
            break
        case 'setPfl':
            requireNumber(obj, 'channel')
            requireBoolean(obj, 'pfl')
            break
        case 'setAMix':
            requireNumber(obj, 'channel')
            requireBoolean(obj, 'amixOn')
            break
        case 'setNextAux':
            requireNumber(obj, 'channel')
            requireNumber(obj, 'level')
            break
        case 'setAuxLevel':
            requireNumber(obj, 'channel')
            requireNumber(obj, 'auxIndex')
            requireNumber(obj, 'level')
            break
        case 'setChannelName':
            requireNumber(obj, 'channel')
            requireString(obj, 'name')
            break
        case 'setFx':
            requireNumber(obj, 'channel')
            requireNumber(obj, 'fxParam')
            requireNumber(obj, 'level')
            if (!isValidFxParam(obj.fxParam as number)) {
                throw new ProtocolError(
                    `Invalid fxParam: ${String(obj.fxParam)}`
                )
            }
            break
        case 'ping':
        case 'subscribe':
        case 'resetAll':
            if (
                obj.type === 'subscribe' &&
                'clientType' in obj &&
                obj.clientType !== undefined
            ) {
                if (obj.clientType !== 'ui' && obj.clientType !== 'sisyfos') {
                    throw new ProtocolError(
                        `Invalid clientType: ${String(obj.clientType)}`
                    )
                }
            }
            break
        case 'loadMixerPreset':
            requireString(obj, 'presetName')
            break
        default:
            break
    }
}

export function parseInboundMessage(raw: string): InboundCommand {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new ProtocolError('Invalid JSON')
    }
    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
        throw new ProtocolError('Message must include a type field')
    }
    validateCommand(parsed)
    return parsed as unknown as InboundCommand
}

export function handleCommand(
    state: DeviceState,
    command: InboundCommand,
    presetStore?: PresetStore
): ProtocolResult {
    switch (command.type) {
        case 'subscribe':
            return {
                kind: 'snapshot',
                message: buildSnapshot(state),
            }
        case 'ping':
            return {
                kind: 'pong',
                message: { type: 'pong', id: command.id },
            }
        case 'setFaderLevel':
            state.setFaderLevel(
                command.channel,
                command.level,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setInputGain':
            state.setInputGain(
                command.channel,
                command.level,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setInputSelector':
            state.setInputSelector(
                command.channel,
                command.selected,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setMute':
            state.setMute(
                command.channel,
                command.mute,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setPfl':
            state.setPfl(
                command.channel,
                command.pfl,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setAMix':
            state.setAMix(
                command.channel,
                command.amixOn,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setNextAux':
            state.setNextAux(
                command.channel,
                command.level,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setAuxLevel':
            state.setAuxLevel(
                command.channel,
                command.auxIndex,
                command.level,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setChannelName':
            state.setChannelName(
                command.channel,
                command.name,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'setFx':
            state.setFx(
                command.channel,
                command.fxParam,
                command.level,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        case 'resetAll':
            state.resetAll(parseSource(command.source))
            return { kind: 'noop' }
        case 'loadMixerPreset': {
            if (!presetStore) {
                return {
                    kind: 'error',
                    message: {
                        type: 'error',
                        message: 'Preset loading is not configured',
                    },
                }
            }
            const preset = presetStore.load(command.presetName)
            state.loadPreset(
                command.presetName,
                preset.channels,
                parseSource(command.source)
            )
            return { kind: 'noop' }
        }
        default:
            return {
                kind: 'error',
                message: {
                    type: 'error',
                    message: `Unknown command type: ${(command as { type: string }).type}`,
                },
            }
    }
}

export function handleInboundMessage(
    state: DeviceState,
    raw: string,
    presetStore?: PresetStore
): ProtocolResult | ErrorMessage {
    try {
        const command = parseInboundMessage(raw)
        return handleCommand(state, command, presetStore)
    } catch (error) {
        const message =
            error instanceof ProtocolError ? error.message : 'Invalid command'
        return { type: 'error', message }
    }
}

export function buildSnapshot(state: DeviceState): SnapshotMessage {
    return {
        type: 'snapshot',
        ...state.getSnapshot(),
    }
}

export { ProtocolError }
