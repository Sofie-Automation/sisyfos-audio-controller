import { FxParam, MixerProtocolGeneric } from './MixerProtocolInterface'

export interface MixerConnection {
    loadMixerPreset(presetName: string): void
    updateInputGain(channelIndex: number, level: number): void
    updateInputSelector(channelIndex: number, inputSelected: number): void
    updatePflState(channelIndex: number): void
    updateMuteState(channelIndex: number, muteOn: boolean): void
    updateAMixState(channelIndex: number, aMixOn: boolean): void
    updateNextAux(channelIndex: number, level: number): void
    updateFx(channelIndex: number, fxParam: FxParam, level: number): void
    updateAuxLevel(
        channelIndex: number,
        auxSendIndex: number,
        level: number
    ): void
    updateChannelName(channelIndex: number): void
    injectCommand(command: string[]): void
    updateChannelSetting(
        channelIndex: number,
        setting: string,
        value: string
    ): void
    updateFadeIOLevel(channelIndex: number, outputLevel: number): void
}

export interface MixerPluginManifestEntry {
    displayName: string
}

export interface MixerPluginManifest {
    id: string
    version: string
    mixers: Record<string, MixerPluginManifestEntry>
}

export type MixerConnectionFactory = (
    protocol: MixerProtocolGeneric,
    mixerIndex: number
) => MixerConnection

export interface MixerPluginEntry {
    displayName: string
    protocol: MixerProtocolGeneric
    createConnection: MixerConnectionFactory
}

export interface MixerPluginModule {
    Mixers: Record<string, MixerPluginEntry>
}
