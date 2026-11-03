export interface ChannelState {
    index: number
    faderLevel: number
    inputGain: number
    inputSelector: number
    mute: boolean
    pfl: boolean
    amixOn: boolean
    nextAuxLevel: number
    auxLevels: number[]
    name: string
    fx: number[]
}

export interface LogEntry {
    direction: 'in' | 'out'
    message: unknown
    timestamp: Date
}

export interface SnapshotMessage {
    type: 'snapshot'
    online: boolean
    inputSelectorCount: number
    auxSendCount: number
    channels: ChannelState[]
}

export interface OnlineMessage {
    type: 'online'
    online: boolean
}

export type FeedbackMessage = {
    type:
        | 'faderLevel'
        | 'inputGain'
        | 'inputSelector'
        | 'mute'
        | 'pfl'
        | 'amixOn'
        | 'nextAux'
        | 'auxLevel'
        | 'channelName'
        | 'fx'
        | 'presetLoaded'
    channel?: number
    source: 'command' | 'hardware'
    level?: number
    auxIndex?: number
    selected?: number
    mute?: boolean
    pfl?: boolean
    amixOn?: boolean
    name?: string
    fxParam?: number
    presetName?: string
}

export interface ClientStatusMessage {
    type: 'clientStatus'
    sisyfosConnected: boolean
    sisyfosClients: number
    uiClients: number
    totalClients: number
}

export type InboundMessage =
    | OnlineMessage
    | SnapshotMessage
    | FeedbackMessage
    | ClientStatusMessage
    | { type: 'vuLevel'; channel: number; level: number; vuIndex?: number }
    | { type: 'pong' | 'error'; [key: string]: unknown }

export function getWsUrl(): string {
    const envUrl = import.meta.env.VITE_WS_URL as string | undefined
    if (envUrl) {
        return envUrl
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.hostname}:8082`
}
