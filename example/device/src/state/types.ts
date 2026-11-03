export type MessageSource = 'command' | 'hardware'

export interface ChannelState {
    index: number
    faderLevel: number
    inputGain: number
    inputSelector: number
    mute: boolean
    pfl: boolean
    amixOn: boolean
    nextAuxLevel: number
    /** Normalized aux send levels indexed by aux bus (0-based) */
    auxLevels: number[]
    name: string
    /** Normalized FX levels indexed by FxParam (0–21) */
    fx: number[]
}

export interface DeviceSnapshot {
    online: boolean
    inputSelectorCount: number
    auxSendCount: number
    channels: ChannelState[]
}

export interface OnlineMessage {
    type: 'online'
    online: true
}

export interface SnapshotMessage extends DeviceSnapshot {
    type: 'snapshot'
}

export interface FaderLevelFeedback {
    type: 'faderLevel'
    channel: number
    level: number
    source: MessageSource
}

export interface InputGainFeedback {
    type: 'inputGain'
    channel: number
    level: number
    source: MessageSource
}

export interface InputSelectorFeedback {
    type: 'inputSelector'
    channel: number
    selected: number
    source: MessageSource
}

export interface MuteFeedback {
    type: 'mute'
    channel: number
    mute: boolean
    source: MessageSource
}

export interface PflFeedback {
    type: 'pfl'
    channel: number
    pfl: boolean
    source: MessageSource
}

export interface AmixFeedback {
    type: 'amixOn'
    channel: number
    amixOn: boolean
    source: MessageSource
}

export interface NextAuxFeedback {
    type: 'nextAux'
    channel: number
    level: number
    source: MessageSource
}

export interface AuxLevelFeedback {
    type: 'auxLevel'
    channel: number
    auxIndex: number
    level: number
    source: MessageSource
}

export interface ChannelNameFeedback {
    type: 'channelName'
    channel: number
    name: string
    source: MessageSource
}

export interface FxFeedback {
    type: 'fx'
    channel: number
    fxParam: number
    level: number
    source: MessageSource
}

export interface PresetLoadedFeedback {
    type: 'presetLoaded'
    presetName: string
    source: MessageSource
}

export interface VuLevelMessage {
    type: 'vuLevel'
    channel: number
    level: number
    vuIndex?: number
}

export interface PongMessage {
    type: 'pong'
    id?: string
}

export interface ErrorMessage {
    type: 'error'
    message: string
}

export type FeedbackMessage =
    | FaderLevelFeedback
    | InputGainFeedback
    | InputSelectorFeedback
    | MuteFeedback
    | PflFeedback
    | AmixFeedback
    | NextAuxFeedback
    | AuxLevelFeedback
    | ChannelNameFeedback
    | FxFeedback
    | PresetLoadedFeedback

export type ClientType = 'ui' | 'sisyfos'

export interface ClientStatusMessage {
    type: 'clientStatus'
    sisyfosConnected: boolean
    sisyfosClients: number
    uiClients: number
    totalClients: number
}

export type OutboundMessage =
    | OnlineMessage
    | SnapshotMessage
    | FeedbackMessage
    | VuLevelMessage
    | PongMessage
    | ErrorMessage
    | ClientStatusMessage

export interface SubscribeCommand {
    type: 'subscribe'
    channels?: number
    clientType?: ClientType
}

export interface SetFaderLevelCommand {
    type: 'setFaderLevel'
    channel: number
    level: number
    source?: MessageSource
}

export interface SetInputGainCommand {
    type: 'setInputGain'
    channel: number
    level: number
    source?: MessageSource
}

export interface SetInputSelectorCommand {
    type: 'setInputSelector'
    channel: number
    selected: number
    source?: MessageSource
}

export interface SetMuteCommand {
    type: 'setMute'
    channel: number
    mute: boolean
    source?: MessageSource
}

export interface SetPflCommand {
    type: 'setPfl'
    channel: number
    pfl: boolean
    source?: MessageSource
}

export interface SetAmixCommand {
    type: 'setAMix'
    channel: number
    amixOn: boolean
    source?: MessageSource
}

export interface SetNextAuxCommand {
    type: 'setNextAux'
    channel: number
    level: number
    source?: MessageSource
}

export interface SetAuxLevelCommand {
    type: 'setAuxLevel'
    channel: number
    auxIndex: number
    level: number
    source?: MessageSource
}

export interface SetChannelNameCommand {
    type: 'setChannelName'
    channel: number
    name: string
    source?: MessageSource
}

export interface PingCommand {
    type: 'ping'
    id?: string
}

export interface SetFxCommand {
    type: 'setFx'
    channel: number
    fxParam: number
    level: number
    source?: MessageSource
}

export interface ResetAllCommand {
    type: 'resetAll'
    source?: MessageSource
}

export interface LoadMixerPresetCommand {
    type: 'loadMixerPreset'
    presetName: string
    source?: MessageSource
}

export type InboundCommand =
    | SubscribeCommand
    | SetFaderLevelCommand
    | SetInputGainCommand
    | SetInputSelectorCommand
    | SetMuteCommand
    | SetPflCommand
    | SetAmixCommand
    | SetNextAuxCommand
    | SetAuxLevelCommand
    | SetChannelNameCommand
    | SetFxCommand
    | PingCommand
    | ResetAllCommand
    | LoadMixerPresetCommand

export type ProtocolResult =
    | { kind: 'feedback'; message: FeedbackMessage }
    | { kind: 'snapshot'; message: SnapshotMessage }
    | { kind: 'pong'; message: PongMessage }
    | { kind: 'noop' }
    | { kind: 'error'; message: ErrorMessage }

export class ProtocolError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ProtocolError'
    }
}
