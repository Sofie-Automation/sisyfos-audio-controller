//Node Modules:
import osc from 'osc'
import fs from 'fs'
import * as path from 'path'
import { CasparCG } from 'casparcg-connection'

//Utils:
import { store, state } from '../../reducers/store'
import {
    CasparCGMixerGeometry,
    CasparCGChannelLayerPair,
    CasparCGMixerGeometryFile,
    FxParam,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Channel } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import { dbToFloat, floatToDB } from './LawoRubyConnection'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { sendVuLevel } from '../vuServer'
import { VuType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { STORAGE_FOLDER } from '../SettingsStorage'
import { MixerConnection } from '.'

interface CommandChannelMap {
    [key: string]: number
}

const OSC_PATH_PRODUCER =
    /\/channel\/(\d+)\/stage\/layer\/(\d+)\/producer\/type/
const OSC_PATH_PRODUCER_FILE_NAME =
    /\/channel\/(\d+)\/stage\/layer\/(\d+)\/file\/path/
const OSC_PATH_PRODUCER_CHANNEL_LAYOUT =
    /\/channel\/(\d+)\/stage\/layer\/(\d+)\/producer\/channel_layout/

export class CasparCGConnection implements MixerConnection {
    mixerProtocol: CasparCGMixerGeometry
    mixerIndex: number
    connection: CasparCG
    oscClient: any
    oscCommandMap: { [key: string]: CommandChannelMap } = {}

    constructor(mixerProtocol: CasparCGMixerGeometry, mixerIndex: number) {
        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex
        this.injectCasparCGSetting()

        this.connection = new CasparCG({
            autoReconnect: true,
            autoReconnectAttempts: 20,
            autoReconnectInterval: 3000,
            host: state.settings[0].mixers[this.mixerIndex].deviceIp,
            port: parseInt(
                state.settings[0].mixers[this.mixerIndex].devicePort + ''
            ),
        })
        logger.info('Trying to connect to CasparCG...')
        this.connection.onConnected = () => {
            logger.info('CasparCG connected')
            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: true,
            })
            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)

            this.setupMixerConnection()
        }
        this.connection.onDisconnected = () => {
            logger.info('CasparCG disconnected')

            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: false,
            })

            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)
        }
        this.connection.connect()

        this.oscCommandMap.CHANNEL_VU = {}
        this.mixerProtocol.fromMixer.CHANNEL_VU.forEach((paths, index) => {
            this.oscCommandMap.CHANNEL_VU[paths[0]] = index
        })
    }

    private injectCasparCGSetting() {
        const geometryFile = path.resolve(
            STORAGE_FOLDER,
            'default-casparcg.ccg'
        )

        let geometry: CasparCGMixerGeometryFile | undefined
        try {
            let inputObj = JSON.parse(
                fs.readFileSync(geometryFile, {
                    encoding: 'utf-8',
                })
            )
            if (inputObj.toMixer && inputObj.toMixer.PGM_CHANNEL_FADER_LEVEL) {
                geometry = inputObj
            }
        } catch (e) {
            // Handling a file should be removed from Constants in the future:
            logger.info('CasparCG Audio geometry file has not been created')
        }
        if (geometry) {
            this.mixerProtocol.fromMixer =
                geometry.fromMixer || this.mixerProtocol.fromMixer
            this.mixerProtocol.toMixer =
                geometry.toMixer || this.mixerProtocol.toMixer
            this.mixerProtocol.channelLabels =
                geometry.channelLabels || this.mixerProtocol.channelLabels
            this.mixerProtocol.sourceOptions =
                geometry.sourceOptions || this.mixerProtocol.sourceOptions
        }
    }

    private setupMixerConnection() {
        const calcVuLevel = (level: number) => {
            return dbToFloat(20 * Math.log(level) + 12)
        }
        if (!this.oscClient) {
            const remotePort =
                parseInt(
                    state.settings[0].mixers[this.mixerIndex].devicePort + ''
                ) + 1000
            this.oscClient = new osc.UDPPort({
                localAddress: state.settings[0].mixers[this.mixerIndex].localIp,
                localPort: remotePort,
                remoteAddress:
                    state.settings[0].mixers[this.mixerIndex].deviceIp,
                remotePort,
            })
                .on('ready', () => {
                    logger.info('Receiving state of mixer')
                })
                .on('message', (message: any) => {
                    for (const channelIndex in this.mixerProtocol.fromMixer
                        .CHANNEL_VU) {
                        for (const vuChannelIndex in this.mixerProtocol
                            .fromMixer.CHANNEL_VU[channelIndex]) {
                            if (
                                message.address ===
                                this.mixerProtocol.fromMixer.CHANNEL_VU[
                                    channelIndex
                                ][vuChannelIndex]
                            ) {
                                const faderIndex =
                                    state.channels[0].chMixerConnection[
                                        this.mixerIndex
                                    ].channel[channelIndex].assignedFader
                                sendVuLevel(
                                    faderIndex,
                                    VuType.Channel,
                                    parseInt(vuChannelIndex),
                                    calcVuLevel(message.args[0])
                                )
                            }
                        }
                    }
                    if (this.mixerProtocol.sourceOptions) {
                        const m = message.address.split('/')

                        if (
                            m[1] === 'channel' &&
                            m[6] === 'producer' &&
                            m[7] === 'type'
                        ) {
                            const index =
                                this.mixerProtocol.sourceOptions.sources.findIndex(
                                    (i) =>
                                        i.channel === parseInt(m[2], 10) &&
                                        i.layer === parseInt(m[5])
                                )
                            if (index >= 0) {
                                store.dispatch({
                                    type: ChannelActionTypes.SET_PRIVATE,
                                    mixerIndex: this.mixerIndex,
                                    channel: index,
                                    tag: 'producer',
                                    value: message.args[0],
                                })
                            }
                        } else if (
                            m[1] === 'channel' &&
                            m[6] === 'producer' &&
                            m[7] === 'channel_layout'
                        ) {
                            const index =
                                this.mixerProtocol.sourceOptions.sources.findIndex(
                                    (i) =>
                                        i.channel === parseInt(m[2], 10) &&
                                        i.layer === parseInt(m[5])
                                )
                            if (index >= 0) {
                                store.dispatch({
                                    type: ChannelActionTypes.SET_PRIVATE,
                                    mixerIndex: this.mixerIndex,
                                    channel: index,
                                    tag: 'channel_layout',
                                    value: message.args[0],
                                })
                            }
                        } else if (
                            m[1] === 'channel' &&
                            m[6] === 'file' &&
                            m[7] === 'path'
                        ) {
                            const index =
                                this.mixerProtocol.sourceOptions.sources.findIndex(
                                    (i) =>
                                        i.channel === parseInt(m[2], 10) &&
                                        i.layer === parseInt(m[5])
                                )
                            if (index >= 0) {
                                const value =
                                    typeof message.args[0] === 'string'
                                        ? message.args[0]
                                        : message.args[0].low
                                store.dispatch({
                                    type: ChannelActionTypes.SET_PRIVATE,
                                    mixerIndex: this.mixerIndex,
                                    channel: index,
                                    tag: 'file_path',
                                    value: value,
                                })
                            }
                        }
                    }
                })
                .on('error', (error: any) => {
                    logger.data(error).error('Lost OSC connection')
                })

            this.oscClient.open()
            const remoteIp = state.settings[0].mixers[this.mixerIndex].deviceIp
            logger.info(
                `Listening for status on CasparCG: ${remoteIp}:${remotePort}`
            )
        }

        // Restore mixer values to the ones we have internally
        state.channels[0].chMixerConnection[this.mixerIndex].channel.forEach(
            (channel: Channel, index) => {
                // const fader =  state.faders[0].fader[channel.assignedFader]
                this.updateFadeIOLevel(index, channel.outputLevel)
                this.updatePflState(index)
            }
        )

        // Set source labels from geometry definition
        if (this.mixerProtocol.channelLabels) {
            this.mixerProtocol.channelLabels.forEach((label, channelIndex) => {
                store.dispatch({
                    type: ChannelActionTypes.SET_CHANNEL_LABEL,
                    mixerIndex: this.mixerIndex,
                    channel: channelIndex,
                    label: label,
                })
            })
        }
    }

    private syncCommand = Promise.resolve()
    private floatToVolume = (float: number) => {
        const db = floatToDB(float)
        const volume = Math.pow(10, db / 20)

        return Math.min(Math.max(volume, 0), 3.2) // clamp between 0 and 3.2
    }
    private controlVolume = (channel: number, layer: number, value: number) => {
        logger.trace(`Set ${channel}-${layer} volume = ${value}`)
        this.syncCommand = this.syncCommand
            .then(() =>
                this.connection
                    .mixerVolume(
                        channel,
                        layer,
                        this.floatToVolume(value),
                        0,
                        undefined
                    )
                    .catch((e: any) => {
                        logger.data(e).error('Failed to send command')
                    })
            )
            .then(() => {})
    }

    private controlChannelSetting = (
        channel: number,
        layer: number,
        producer: string,
        file: string,
        setting: string,
        value: string
    ) => {
        this.connection
            .stop(channel, layer)
            .then(() => {
                if (setting === 'CHANNEL_LAYOUT') {
                    switch (producer) {
                        case 'ffmpeg':
                            return this.connection.play(
                                channel,
                                layer,
                                file,
                                true,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                value
                            )
                        case 'decklink':
                            return this.connection.playDecklink(
                                channel,
                                layer,
                                parseInt(file, 10),
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                value
                            )
                        case 'layer-producer':
                            return this.connection.playRoute(
                                channel,
                                layer,
                                file,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                value,
                                undefined
                            )
                    }
                }
                return Promise.reject('Unknown operation')
            })
            .then(() => {})
            .catch((e: any) => {
                logger.data(e).error('Failed to change channel setting')
            })
    }

    private setAllLayers = (
        pairs: CasparCGChannelLayerPair[],
        value: number
    ) => {
        pairs.forEach((i) => {
            this.controlVolume(i.channel, i.layer, value)
        })
    }

    updatePflState(channelIndex: number) {
        if (
            channelIndex >
            this.mixerProtocol.toMixer.PGM_CHANNEL_FADER_LEVEL.length - 1
        ) {
            return
        }
        logger.trace(`Update PFL state for ${channelIndex}`)
        const channel: Channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        const fader: Fader = state.faders[0].fader[channel.assignedFader]
        const otherFaders: Array<Fader> = state.channels[0].chMixerConnection[
            this.mixerIndex
        ].channel
            .filter((_ch: any, i: number) => i !== channelIndex)
            .map((ch: Channel) => state.faders[0].fader[ch.assignedFader])
        if (fader.pflOn === true) {
            // Enable SOLO on this channel on MONITOR
            const pairs =
                this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL[channelIndex]
            this.setAllLayers(
                pairs,
                state.faders[0].fader[channel.assignedFader].faderLevel
            )
            // Ensure that all other non-SOLO channels are muted on MONITOR
            // const others = state.channels[0].chMixerConnection[this.mixerIndex].channel.map((ch: IChannel) => state.faders[0].fader[ch.assignedFader].pflOn ? undefined : index)
            const others = state.channels[0].chMixerConnection[
                this.mixerIndex
            ].channel
                .map((ch: Channel, index: number) =>
                    state.faders[0].fader[ch.assignedFader].pflOn
                        ? undefined
                        : index
                )
                .filter(
                    (i) =>
                        i !== undefined &&
                        i <
                            this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL
                                .length
                ) as number[]
            others.forEach((i) => {
                const pairs = this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL[i]
                this.setAllLayers(pairs, this.mixerProtocol.fader.min)
            })
        } else {
            // check if any other channels are SOLO
            const others = otherFaders
                .map((i, index) => (i.pflOn ? index : undefined))
                .filter(
                    (i) =>
                        i !== undefined &&
                        i <
                            this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL
                                .length
                ) as number[]
            if (others.length > 0) {
                // other channels are SOLO, mute this channel on PFL
                const pairs =
                    this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL[channelIndex]
                this.setAllLayers(pairs, this.mixerProtocol.fader.min)
            } else {
                // There are no other SOLO channels, restore PFL to match PGM
                state.channels[0].chMixerConnection[
                    this.mixerIndex
                ].channel.forEach((_ch: Channel, index: number) => {
                    if (
                        index >
                        this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL.length -
                            1
                    ) {
                        return
                    }
                    const pairs =
                        this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL[index]
                    this.setAllLayers(
                        pairs,
                        state.channels[0].chMixerConnection[this.mixerIndex]
                            .channel[index].outputLevel
                    )
                })
            }
        }
    }

    updateMuteState(channelIndex: number, muteOn: boolean) {
        return true
    }

    updateNextAux(channelIndex: number, level: number) {
        if (
            channelIndex >
            this.mixerProtocol.toMixer.PGM_CHANNEL_FADER_LEVEL.length - 1
        ) {
            return
        }
        logger.trace(`Update NEXT AUX for ${channelIndex}`)
        if (this.mixerProtocol.toMixer.NEXT_AUX_FADER_LEVEL) {
            const faderIndex: number =
                state.channels[0].chMixerConnection[this.mixerIndex].channel[
                    channelIndex
                ].assignedFader
            if (state.faders[0].fader[faderIndex].pstOn === true) {
                // add this channel to the PST mix
                const pairs =
                    this.mixerProtocol.toMixer.NEXT_AUX_FADER_LEVEL[faderIndex]
                this.setAllLayers(
                    pairs,
                    state.faders[0].fader[faderIndex].faderLevel
                )
            } else {
                // mute this channel to the PST mix
                const pairs =
                    this.mixerProtocol.toMixer.NEXT_AUX_FADER_LEVEL[faderIndex]
                this.setAllLayers(pairs, this.mixerProtocol.fader.min)
            }
        }
    }

    updateInputGain(channelIndex: number, level: number) {
        return true
    }
    updateInputSelector(channelIndex: number, inputSelected: number) {
        if (
            this.mixerProtocol.toMixer.CHANNEL_INPUT_SELECTOR &&
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].privateData
        ) {
            const pair = this.mixerProtocol.sourceOptions.sources[channelIndex]
            const producer =
                state.channels[0].chMixerConnection[this.mixerIndex].channel[
                    channelIndex
                ].privateData!['producer']
            let filePath = String(
                state.channels[0].chMixerConnection[this.mixerIndex].channel[
                    channelIndex
                ].privateData!['file_path']
            )
            filePath = filePath.replace(/\.[\w\d]+$/, '')
            this.controlChannelSetting(
                pair.channel,
                pair.layer,
                producer,
                filePath,
                'CHANNEL_LAYOUT',
                this.mixerProtocol.toMixer.CHANNEL_INPUT_SELECTOR[
                    inputSelected - 1
                ].mixerMessage
            )
        }
    }
    updateFx(channelIndex: number, fxParam: FxParam, level: number) {
        return true
    }
    updateAuxLevel(channelIndex: number, auxSendIndex: number, level: number) {
        return true
    }

    updateFadeIOLevel(channelIndex: number, outputLevel: number) {
        if (
            channelIndex >
            this.mixerProtocol.toMixer.PGM_CHANNEL_FADER_LEVEL.length - 1
        ) {
            return
        }

        logger.trace(
            `updateFadeIOLevel: channelId: ${channelIndex}, fader.pflOn = "${state.faders[0].fader[channelIndex].pflOn}". faderLevel = "${state.faders[0].fader[channelIndex].faderLevel}"`
        )

        const faderIndex: number =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].assignedFader
        const pgmPairs =
            this.mixerProtocol.toMixer.PGM_CHANNEL_FADER_LEVEL[channelIndex]
        this.setAllLayers(pgmPairs, outputLevel)

        const anyPflOn = state.faders[0].fader.find((f: Fader) => f.pflOn)
        // Check if there are no SOLO channels on MONITOR or there are, but this channel is SOLO
        if (!anyPflOn || state.faders[0].fader[faderIndex].pflOn) {
            const pairs =
                this.mixerProtocol.toMixer.PFL_AUX_FADER_LEVEL[channelIndex]
            if (state.faders[0].fader[faderIndex].pflOn) {
                this.setAllLayers(
                    pairs,
                    state.faders[0].fader[faderIndex].faderLevel
                )
            } else {
                this.setAllLayers(pairs, outputLevel)
            }
        }
    }

    updateChannelName(channelIndex: number) {
        //CasparCG does not need Labels.
    }

    loadMixerPreset(presetName: string) {
        // This is where CasparCG settings preset loading should be refactored to
    }

    injectCommand(command: string[]) {
        this.connection.createCommand(command[0])
    }

    updateAMixState(channelIndex: number, amixOn: boolean) {}

    updateChannelSetting(
        channelIndex: number,
        setting: string,
        value: string
    ) {}
}
