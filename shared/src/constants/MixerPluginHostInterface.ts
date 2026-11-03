import type { Channel } from '../reducers/channelsReducer'
import type { Fader } from '../reducers/fadersReducer'
import type { Settings } from '../reducers/settingsReducer'

export type MixerChannel = Channel

export interface SisyfosState {
    settings: Settings[]
    faders: Array<{ fader: Fader[] }>
    channels: Array<{
        chMixerConnection: Array<{
            channel: MixerChannel[]
        }>
    }>
}

export interface SisyfosStore {
    dispatch: (action: Record<string, unknown>) => void
}

export interface MainThreadHandler {
    updatePartialStore: (faderIndex: number) => void
    updateFullClientStore: () => void
    updateMixerOnline: (mixerIndex: number, online?: boolean) => void
    loadMixerPreset: (presetName: string) => void
    setLink: (faderIndex: number, link: boolean) => void
    socketServerHandlers: (socket: unknown) => void
}

export interface MixerGenericConnection {
    updateOutLevel: (
        faderIndex: number,
        delay: number,
        skipMixerIndex: number
    ) => void
    updateMuteState: (faderIndex: number, mixerIndex: number) => void
}

export interface RemoteConnections {
    updateRemoteFaderState: (faderIndex: number, level: number) => void
    updateRemoteAuxPanels: () => void
}

export interface SisyfosHostModules {
    store: { store: SisyfosStore; state: SisyfosState }
    mainClasses: {
        mixerGenericConnection: MixerGenericConnection
        remoteConnections: RemoteConnections | null
    }
    logger: {
        info: (msg: string) => void
        error: (msg: string) => void
        trace: (msg: string) => void
        data: (data: unknown) => { error: (msg: string) => void }
    }
}

export interface SisyfosHostGlobals {
    mainThreadHandler: MainThreadHandler
}

declare global {
    var mainThreadHandler: MainThreadHandler
}
