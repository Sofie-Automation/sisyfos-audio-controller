import { FeedbackMessage, OutboundMessage, VuLevelMessage } from './state/types'
import { fxParamName } from './state/fxParams'

function timestamp(): string {
    return new Date().toISOString().slice(11, 23)
}

function logLine(tag: string, message: string): void {
    console.log(`[${timestamp()}] [${tag}] ${message}`)
}

export function summarizeInbound(raw: string): string {
    try {
        const msg = JSON.parse(raw) as Record<string, unknown>
        const type = String(msg.type ?? '?')

        switch (type) {
            case 'setFaderLevel':
                return `← ${type} ch=${msg.channel} level=${msg.level}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setInputGain':
                return `← ${type} ch=${msg.channel} level=${msg.level}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setInputSelector':
                return `← ${type} ch=${msg.channel} selected=${msg.selected}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setMute':
                return `← ${type} ch=${msg.channel} mute=${msg.mute}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setPfl':
                return `← ${type} ch=${msg.channel} pfl=${msg.pfl}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setAMix':
                return `← ${type} ch=${msg.channel} amixOn=${msg.amixOn}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setNextAux':
                return `← ${type} ch=${msg.channel} level=${msg.level}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setAuxLevel':
                return `← ${type} ch=${msg.channel} auxIndex=${msg.auxIndex} level=${msg.level}${msg.source ? ` source=${msg.source}` : ''}`
            case 'setChannelName':
                return `← ${type} ch=${msg.channel} name="${msg.name}"${msg.source ? ` source=${msg.source}` : ''}`
            case 'setFx':
                return `← ${type} ch=${msg.channel} fxParam=${msg.fxParam} (${fxParamName(msg.fxParam as number)}) level=${msg.level}${msg.source ? ` source=${msg.source}` : ''}`
            case 'subscribe':
                return `← subscribe${msg.clientType ? ` clientType=${msg.clientType}` : ''}`
            case 'ping':
                return `← ping${msg.id !== undefined ? ` id=${msg.id}` : ''}`
            case 'resetAll':
                return `← resetAll${msg.source ? ` source=${msg.source}` : ''}`
            case 'loadMixerPreset':
                return `← loadMixerPreset presetName="${msg.presetName}"${msg.source ? ` source=${msg.source}` : ''}`
            default:
                return `← ${type}`
        }
    } catch {
        const preview = raw.length > 80 ? `${raw.slice(0, 80)}…` : raw
        return `← (invalid json) ${preview}`
    }
}

export function summarizeOutbound(
    message: OutboundMessage | FeedbackMessage | VuLevelMessage
): string {
    switch (message.type) {
        case 'snapshot':
            return `→ snapshot (${message.channels.length} channels)`
        case 'online':
            return `→ online online=${message.online}`
        case 'clientStatus':
            return `→ clientStatus sisyfos=${message.sisyfosClients} ui=${message.uiClients} total=${message.totalClients}`
        case 'pong':
            return `→ pong${message.id !== undefined ? ` id=${message.id}` : ''}`
        case 'error':
            return `→ error "${message.message}"`
        case 'faderLevel':
            return `→ faderLevel ch=${message.channel} level=${message.level} source=${message.source}`
        case 'inputGain':
            return `→ inputGain ch=${message.channel} level=${message.level} source=${message.source}`
        case 'inputSelector':
            return `→ inputSelector ch=${message.channel} selected=${message.selected} source=${message.source}`
        case 'mute':
            return `→ mute ch=${message.channel} mute=${message.mute} source=${message.source}`
        case 'pfl':
            return `→ pfl ch=${message.channel} pfl=${message.pfl} source=${message.source}`
        case 'amixOn':
            return `→ amixOn ch=${message.channel} amixOn=${message.amixOn} source=${message.source}`
        case 'nextAux':
            return `→ nextAux ch=${message.channel} level=${message.level} source=${message.source}`
        case 'auxLevel':
            return `→ auxLevel ch=${message.channel} auxIndex=${message.auxIndex} level=${message.level} source=${message.source}`
        case 'channelName':
            return `→ channelName ch=${message.channel} name="${message.name}" source=${message.source}`
        case 'fx':
            return `→ fx ch=${message.channel} fxParam=${message.fxParam} (${fxParamName(message.fxParam)}) level=${message.level} source=${message.source}`
        case 'presetLoaded':
            return `→ presetLoaded presetName="${message.presetName}" source=${message.source}`
        case 'vuLevel':
            return `→ vuLevel ch=${message.channel} level=${message.level.toFixed(2)}`
        default:
            return `→ ${(message as { type: string }).type}`
    }
}

export const logger = {
    http(message: string): void {
        logLine('http', message)
    },
    ws(message: string): void {
        logLine('ws', message)
    },
    error(message: string, error?: unknown): void {
        const detail =
            error instanceof Error
                ? error.message
                : error !== undefined
                  ? String(error)
                  : ''
        console.error(
            `[${timestamp()}] [error] ${message}${detail ? `: ${detail}` : ''}`
        )
    },
}
