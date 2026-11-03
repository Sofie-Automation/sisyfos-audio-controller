import { Atem, AtemState } from 'atem-connection'

import { store, state } from '../../reducers/store'
import {
    FxParam,
    MixerProtocol,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    ChannelReference,
    Fader,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Channel } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { dbToFloat, floatToDB } from './LawoRubyConnection'
import {
    FairlightAudioMixOption,
    FairlightInputConfiguration,
} from 'atem-connection/dist/enums'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    ChannelActions,
    ChannelActionTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FairlightAudioSource } from 'atem-connection/dist/state/fairlight'
import { Dispatch } from '@reduxjs/toolkit'
import { MixerConnection } from '.'

enum TrackIndex {
    Stereo = '-65280',
    Mono = '-65281',
    Right = '-255',
    Left = '-256',
}

export class AtemMixerConnection implements MixerConnection {
    dispatch: Dispatch<ChannelActions> = store.dispatch
    private _connection: Atem

    private _chNoToSource: Record<number, number> = {}
    private _sourceToChNo: Record<number, number> = {}
    private _sourceTracks: Record<number, TrackIndex> = {}
    private _firstConnection = true

    constructor(
        private mixerProtocol: MixerProtocol,
        public mixerIndex: number
    ) {
        this._connection = new Atem()

        this._connection.on('connected', () => {
            logger.info('Atem connected')
            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: true,
            })
            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)

            this.setupMixerConnection()
        })
        this._connection.on('disconnected', () => {
            logger.info('Atem disconnected')
            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: false,
            })

            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)
        })

        this._connection
            .connect(state.settings[0].mixers[this.mixerIndex].deviceIp)
            .catch((error) => {
                logger
                    .data(error)
                    .error(
                        'Failed to connect to atem ' +
                            state.settings[0].mixers[this.mixerIndex].deviceIp
                    )
            })
    }

    private setupMixerConnection() {
        const sourceToName: Record<string, string> = {
            ...Object.fromEntries(
                Object.entries(this._connection.state.inputs).map(
                    ([id, input]) => [id, input.shortName]
                )
            ),
            '1301': 'Mic 1',
            '1302': 'Mic 2',
        }
        Object.keys(this._connection.state.fairlight.inputs).forEach(
            (source, index) => {
                this._chNoToSource[index] = Number(source)
                this._sourceToChNo[Number(source)] = index

                this._sourceTracks[index] = TrackIndex.Stereo

                let name = sourceToName[source]
                this.setChannelLabel(this._sourceToChNo[Number(source)], name)
            }
        )

        if (!this._firstConnection) return
        this._firstConnection = false

        const stateChangedHandler = (state: AtemState, changes: string[]) => {
            for (const changePath of changes) {
                if (!changePath.startsWith('fairlight.inputs')) continue

                const input = parseInt(changePath.split('.')[2])
                const channelIndex = this._sourceToChNo[input]

                if (
                    channelIndex === undefined ||
                    !state.fairlight.inputs[input].sources[
                        this._sourceTracks[channelIndex]
                    ]
                ) {
                    continue
                }

                const channel = this.getChannel(channelIndex)
                const fader = this.getAssignedFader(channelIndex)
                const source =
                    state.fairlight.inputs[input].sources[
                        this._sourceTracks[channelIndex]
                    ]

                this.setPropsFromChannel(channelIndex, channel, fader, source)
            }
        }
        this._connection.on('stateChanged', stateChangedHandler)

        return
    }

    updateInputGain(channelIndex: number, level: number): void {
        const { channelTypeIndex } = this.getChannel(channelIndex)

        this._connection.setFairlightAudioMixerSourceProps(
            this._chNoToSource[channelTypeIndex],
            this._sourceTracks[channelTypeIndex],
            { gain: -1200 + 1800 * level }
        )
    }

    updatePflState(channelIndex: number): void {
        // todo - add fairlight pfl
        return
    }

    updateMuteState(channelIndex: number, muteOn: boolean): void {
        const { channelTypeIndex, outputLevel } = this.getChannel(channelIndex)

        if (outputLevel[0] > 0) {
            this._connection.setFairlightAudioMixerSourceProps(
                this._sourceToChNo[channelTypeIndex],
                this._sourceTracks[channelTypeIndex],
                {
                    mixOption: muteOn
                        ? FairlightAudioMixOption.Off
                        : FairlightAudioMixOption.On,
                }
            )
        }
    }

    updateAMixState(channelIndex: number, amixOn: boolean): void {
        return
    }

    updateNextAux(channelIndex: number, level: number): void {
        return
    }

    updateFx(channelIndex: number, fxParam: FxParam, level: number): void {
        return
    }

    updateAuxLevel(
        channelIndex: number,
        auxSendIndex: number,
        auxLevel: number
    ): void {
        return
    }

    updateChannelName(channelIndex: number): void {
        return
    }

    injectCommand(command: string[]): void {
        return
    }

    loadMixerPreset(presetName: string) {}

    updateChannelSetting(
        channelIndex: number,
        setting: string,
        value: string
    ): void {
        return
    }

    updateInputSelector(channelIndex: number, inputSelected: number) {
        const { channelTypeIndex } = this.getChannel(channelIndex)
        const { pgmOn, pflOn } = this.getAssignedFader(channelIndex)
        const tracks =
            this.mixerProtocol.channelTypes[0].toMixer.CHANNEL_INPUT_SELECTOR?.[
                inputSelected - 1
            ]
        if (!tracks) return

        switch (tracks.label) {
            case 'LR':
                this._connection.setFairlightAudioMixerInputProps(
                    this._chNoToSource[channelIndex],
                    { activeConfiguration: FairlightInputConfiguration.Stereo }
                )
                if (pgmOn || pflOn) {
                    this._connection.setFairlightAudioMixerSourceProps(
                        this._chNoToSource[channelIndex],
                        TrackIndex.Stereo,
                        {
                            mixOption: FairlightAudioMixOption.On,
                        }
                    )
                }
                this._sourceTracks[channelTypeIndex] = TrackIndex.Stereo
                break
            case 'LL':
                this._connection.setFairlightAudioMixerInputProps(
                    this._chNoToSource[channelIndex],
                    {
                        activeConfiguration:
                            FairlightInputConfiguration.DualMono,
                    }
                )
                this._connection.setFairlightAudioMixerSourceProps(
                    this._chNoToSource[channelIndex],
                    TrackIndex.Right,
                    {
                        mixOption: FairlightAudioMixOption.Off,
                    }
                )
                if (pgmOn || pflOn) {
                    this._connection.setFairlightAudioMixerSourceProps(
                        this._chNoToSource[channelIndex],
                        TrackIndex.Left,
                        {
                            mixOption: FairlightAudioMixOption.On,
                        }
                    )
                }
                this._sourceTracks[channelTypeIndex] = TrackIndex.Left
                break
            case 'RR':
                this._connection.setFairlightAudioMixerInputProps(
                    this._chNoToSource[channelIndex],
                    {
                        activeConfiguration:
                            FairlightInputConfiguration.DualMono,
                    }
                )
                this._connection.setFairlightAudioMixerSourceProps(
                    this._chNoToSource[channelIndex],
                    TrackIndex.Left,
                    {
                        mixOption: FairlightAudioMixOption.Off,
                    }
                )
                if (pgmOn || pflOn) {
                    this._connection.setFairlightAudioMixerSourceProps(
                        this._chNoToSource[channelIndex],
                        TrackIndex.Right,
                        {
                            mixOption: FairlightAudioMixOption.On,
                        }
                    )
                }

                this._sourceTracks[channelTypeIndex] = TrackIndex.Right
                break
            case 'MONO':
                this._connection.setFairlightAudioMixerInputProps(
                    this._chNoToSource[channelIndex],
                    { activeConfiguration: FairlightInputConfiguration.Mono }
                )
                if (pgmOn || pflOn) {
                    this._connection.setFairlightAudioMixerSourceProps(
                        this._chNoToSource[channelIndex],
                        TrackIndex.Mono,
                        {
                            mixOption: FairlightAudioMixOption.On,
                        }
                    )
                }
                this._sourceTracks[channelTypeIndex] = TrackIndex.Mono
                break
        }
    }

    updateFadeIOLevel(channelIndex: number, level: number): void {
        const channel = this.getChannel(channelIndex)
        const fader = this.getAssignedFader(channelIndex)
        const { muteOn } = this.getAssignedFader(channelIndex)
        const sourceNo = this._chNoToSource[channel.channelTypeIndex]

        if (level > 0 && !muteOn) {
            this._connection.setFairlightAudioMixerSourceProps(
                sourceNo,
                this._sourceTracks[channel.channelTypeIndex],
                { mixOption: FairlightAudioMixOption.On }
            )
            this._connection.setFairlightAudioMixerSourceProps(
                sourceNo,
                this._sourceTracks[channel.channelTypeIndex],
                {
                    faderGain: Math.round(
                        Math.max(-10000, Math.min(1000, floatToDB(level) * 100))
                    ),
                }
            )
        } else {
            this._connection.setFairlightAudioMixerSourceProps(
                sourceNo,
                this._sourceTracks[channel.channelTypeIndex],
                { mixOption: FairlightAudioMixOption.Off }
            )
            this._connection.setFairlightAudioMixerSourceProps(
                sourceNo,
                this._sourceTracks[channel.channelTypeIndex],
                {
                    faderGain: 0,
                }
            )
        }
    }

    private getAssignedFader(channelIndex: number): Fader {
        return state.faders[0].fader.find((fader: Fader) => {
            return fader.assignedChannels?.some(
                (assignedChannel: ChannelReference) => {
                    return (
                        assignedChannel.mixerIndex === this.mixerIndex &&
                        assignedChannel.channelIndex === channelIndex
                    )
                }
            )
        })
    }

    private getChannel(channelIndex: number): Channel {
        return state.channels[0].chMixerConnection[this.mixerIndex].channel[
            channelIndex
        ]
    }

    private setPropsFromChannel(
        channelIndex: number,
        channel: Channel,
        fader: Fader,
        source: FairlightAudioSource
    ) {
        if ((source.properties.gain + 1200) / 1800 !== fader.inputGain) {
            // update gain
            this.setFaderGain(
                channelIndex,
                (source.properties.gain + 1200) / 1800
            )
        }
        if (!channel.fadeActive) {
            if (
                source.properties.mixOption === FairlightAudioMixOption.On &&
                source.properties.faderGain > -10000
            ) {
                if (fader.muteOn) {
                    // set mute off
                    this.setMute(channelIndex, false)
                }
                if (!fader.pgmOn && !fader.voOn) {
                    // set fader on
                    this.setFaderPgm(channelIndex, true)
                }
            }
            if (
                source.properties.mixOption === FairlightAudioMixOption.Off &&
                (fader.pgmOn || fader.voOn)
            ) {
                // set fader off
                this.setFaderPgm(channelIndex, false)
                this.setFaderVo(channelIndex, false)
            }
            if (
                dbToFloat(source.properties.faderGain / 100) !==
                fader.faderLevel
            ) {
                // set fader level
                this.setFaderLevel(
                    channelIndex,
                    dbToFloat(source.properties.faderGain / 100)
                )
            }
        }
    }

    private setFaderGain(
        faderIndex: number,
        gain: number,
        update: boolean = true
    ): void {
        store.dispatch({
            type: FaderActionTypes.SET_INPUT_GAIN,
            faderIndex: faderIndex,
            level: gain,
        })
        if (update) global.mainThreadHandler.updatePartialStore(faderIndex)
    }
    private setMute(
        faderIndex: number,
        muteOn: boolean,
        update: boolean = true
    ): void {
        store.dispatch({
            type: FaderActionTypes.SET_MUTE,
            faderIndex: faderIndex,
            muteOn: muteOn,
        })
        if (update) global.mainThreadHandler.updatePartialStore(faderIndex)
    }
    private setFaderPgm(
        faderIndex: number,
        pgmOn: boolean,
        update: boolean = true
    ): void {
        store.dispatch({
            type: FaderActionTypes.SET_PGM,
            faderIndex: faderIndex,
            pgmOn: pgmOn,
        })
        if (update) global.mainThreadHandler.updatePartialStore(faderIndex)
    }
    private setFaderVo(faderIndex: number, voOn: boolean, update = true): void {
        store.dispatch({
            type: FaderActionTypes.SET_VO,
            faderIndex: faderIndex,
            voOn: voOn,
        })
        if (update) global.mainThreadHandler.updatePartialStore(faderIndex)
    }
    private setFaderLevel(
        faderIndex: number,
        level: number,
        update: boolean = true
    ): void {
        store.dispatch({
            type: FaderActionTypes.SET_FADER_LEVEL,
            faderIndex: faderIndex,
            level: level,
        })
        if (update) global.mainThreadHandler.updatePartialStore(faderIndex)
    }
    private setChannelLabel(
        channelIndex: number,
        label: string,
        update: boolean = true
    ): void {
        store.dispatch({
            type: ChannelActionTypes.SET_CHANNEL_LABEL,
            mixerIndex: this.mixerIndex,
            channel: channelIndex,
            label: label,
        })
        if (update) global.mainThreadHandler.updatePartialStore(channelIndex)
    }
}
