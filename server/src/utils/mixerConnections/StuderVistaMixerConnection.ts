//@ts-ignore
import { BER } from 'node-emberplus'
import { store, state } from '../../reducers/store'
import net from 'net'

//Utils:
import {
    FxParam,
    MixerProtocol,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { remoteConnections } from '../../mainClasses'
import {
    ChannelReference,
    Fader,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Channel } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerConnection } from '.'

export class StuderVistaMixerConnection implements MixerConnection {
    mixerProtocol: MixerProtocol
    mixerIndex: number
    deviceRoot: any
    emberNodeObject: Array<any>
    mixerConnection: any

    constructor(mixerProtocol: MixerProtocol, mixerIndex: number) {
        this.sendOutMessage = this.sendOutMessage.bind(this)
        this.pingMixerCommand = this.pingMixerCommand.bind(this)

        this.emberNodeObject = new Array(200)
        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex

        this.mixerOnline(false)

        logger.info('Setting up Ember connection')

        this.mixerConnection = net.createConnection(
            {
                port: parseInt(
                    state.settings[0].mixers[this.mixerIndex].devicePort + ''
                ),
                host: state.settings[0].mixers[this.mixerIndex].deviceIp,
                timeout: 1000,
            },
            () => {}
        )

        this.mixerConnection
            .on('end', () => {
                // When connection disconnected.
                logger.info('Ember Client socket disconnect.')
                this.mixerOnline(false)
            })
            .on('error', (err: any) => {
                logger.error(err)
                this.mixerOnline(false)
            })
            .on('connect', () => {
                this.setupMixerConnection()
            })
    }

    private setupMixerConnection() {
        logger.info('Ember connection established')
        this.mixerConnection.on('data', (data: any) => {
            let bufferString: string = ''
            data.forEach((byte: any) => {
                bufferString = bufferString + byte.toString(16) + ' '
            })
            bufferString.split('7f 8f').forEach((message: string) => {
                message = '7f 8f' + message
                // FADER LEVEL:
                if (
                    this.checkEmberCommand(
                        message,
                        this.mixerProtocol.channelTypes[0].fromMixer
                            .CHANNEL_OUT_GAIN[0].mixerMessage
                    )
                ) {
                    this.handleEmberLevelCommand(message)
                } else if (
                    // AUX:
                    this.checkEmberCommand(
                        message,
                        this.mixerProtocol.channelTypes[0].fromMixer
                            .AUX_LEVEL[0].mixerMessage
                    )
                ) {
                    this.handleEmberAuxCommand(message)
                } else if (
                    // MUTE:
                    this.checkEmberCommand(
                        message,
                        this.mixerProtocol.channelTypes[0].fromMixer
                            .CHANNEL_MUTE_ON[0].mixerMessage
                    )
                ) {
                    this.handleEmberMuteCommand(message)
                } else {
                    logger.trace(`Unknown Vista message message: ${message}`)
                }
            })
        })

        this.mixerOnline(true)

        //Ping OSC mixer if mixerProtocol needs it.
        if (this.mixerProtocol.pingTime > 0) {
            // Initial ping:
            this.pingMixerCommand()
            // Timer ping
            let emberTimer = setInterval(() => {
                this.pingMixerCommand()
            }, this.mixerProtocol.pingTime)
        }
    }

    private findChannelInArray(
        channelType: number,
        channelTypeIndex: number
    ): number {
        let channelArrayIndex = 0
        state.channels[0].chMixerConnection[this.mixerIndex].channel.forEach(
            (channel: Channel, index: number) => {
                if (
                    channel.channelType === channelType &&
                    channel.channelTypeIndex === channelTypeIndex
                ) {
                    channelArrayIndex = index
                }
            }
        )
        return channelArrayIndex
    }

    private getAssignedFaderIndex(channelIndex: number) {
        return state.faders[0].fader.findIndex((fader: Fader) =>
            fader.assignedChannels?.some((assigned: ChannelReference) => {
                return (
                    assigned.mixerIndex === this.mixerIndex &&
                    assigned.channelIndex === channelIndex
                )
            })
        )
    }

    private checkEmberCommand(
        message: string,
        protocolMessage: string
    ): boolean {
        let messageArray = message.split('31 ')
        if (messageArray.length > 2) {
            let protocolArray = protocolMessage.split(' ')
            let isEqual = protocolArray.every(
                (value: string, index: number) => {
                    if (
                        value !== messageArray[index + 1]?.split(' ')[1] &&
                        value !== '{channel}' &&
                        value !== '{ch-type}' &&
                        value !== '{aux}'
                    ) {
                        return false
                    }
                    return true
                }
            )
            return isEqual
        } else {
            return false
        }
    }

    private handleEmberLevelCommand(message: string) {
        // Extract Channel number and Channel Type (mono-st-51)
        let { channelTypeIndex, channelType } = this.extractMessageIndex(
            this.mixerProtocol.channelTypes[0].fromMixer.CHANNEL_OUT_GAIN[0]
                .mixerMessage,
            message
        )

        // Extract value:
        let value = this.extractValue(message)

        //Invalid BER value received
        if (value === -1) {
            return
        }

        // Update store:
        let channelArrayIndex = this.findChannelInArray(
            channelType,
            channelTypeIndex
        )
        let assignedFaderIndex = this.getAssignedFaderIndex(channelArrayIndex)

        if (
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelArrayIndex
            ].fadeActive
        ) {
            return
        }

        if (
            value > state.settings[0].autoResetLevel / 100 ||
            state.faders[0].fader[assignedFaderIndex].pgmOn ||
            state.faders[0].fader[assignedFaderIndex].voOn
        ) {
            store.dispatch({
                type: FaderActionTypes.SET_FADER_LEVEL,
                faderIndex: assignedFaderIndex,
                level: value,
            })
            state.faders[0].fader[assignedFaderIndex].assignedChannels?.forEach(
                (assignedChannel: ChannelReference) => {
                    if (
                        assignedChannel.mixerIndex === this.mixerIndex &&
                        assignedChannel.channelIndex !== channelArrayIndex
                    ) {
                        store.dispatch({
                            type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                            mixerIndex: this.mixerIndex,
                            channel: assignedChannel.channelIndex,
                            level: value,
                        })
                    }
                }
            )

            if (!state.faders[0].fader[assignedFaderIndex].pgmOn) {
                if (value > 0) {
                    store.dispatch({
                        type: FaderActionTypes.TOGGLE_PGM,
                        faderIndex: assignedFaderIndex,
                    })
                }
            }
            global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            remoteConnections.updateRemoteFaderState(assignedFaderIndex, value)
        }
    }

    private handleEmberAuxCommand(message: string) {
        // Extract Channel number, Aux and Type (mono-st-51)
        let { channelTypeIndex, channelType, auxIndex } =
            this.extractMessageIndex(
                this.mixerProtocol.channelTypes[0].fromMixer.AUX_LEVEL[0]
                    .mixerMessage,
                message
            )

        // Extract value:
        let value = this.extractValue(message)

        //Invalid BER value received
        if (value === -1) {
            return
        }

        // Update store:
        let channelArrayIndex = this.findChannelInArray(
            channelType,
            channelTypeIndex
        )

        store.dispatch({
            type: ChannelActionTypes.SET_AUX_LEVEL,
            mixerIndex: this.mixerIndex,
            channel: channelArrayIndex,
            auxIndex: auxIndex,
            level: value,
        })

        global.mainThreadHandler.updateFullClientStore()
        remoteConnections.updateRemoteAuxPanels()
    }

    private handleEmberMuteCommand(message: string) {
        // Extract Channel number and Channel Type (mono-st-51)
        let { channelTypeIndex, channelType } = this.extractMessageIndex(
            this.mixerProtocol.channelTypes[0].fromMixer.CHANNEL_MUTE_ON[0]
                .mixerMessage,
            message
        )

        // Extract Mute state:
        let messageArray = message.split('31 ')
        let mute =
            parseInt(messageArray[messageArray.length - 1].split(' ')[5]) === 1
                ? true
                : false

        // Update store:
        let assignedFader = this.getAssignedFaderIndex(
            this.findChannelInArray(channelType, channelTypeIndex)
        )

        store.dispatch({
            type: FaderActionTypes.SET_MUTE,
            faderIndex: assignedFader,
            muteOn: mute,
        })
        global.mainThreadHandler.updatePartialStore(assignedFader)
    }

    private extractMessageIndex(
        protocolMessage: string,
        message: string
    ): { channelTypeIndex: number; channelType: number; auxIndex: number } {
        let messageArray = message.split('31 ')
        let protocolArray = protocolMessage.split(' ')
        let channelTypeIndex: number = 0
        let channelType: number = 0
        let auxIndex: number = 0

        // Extract Channel number, Aux and Type (mono-st-51)
        protocolArray.forEach((value: string, index: number) => {
            if (value === '{channel}') {
                channelTypeIndex =
                    parseInt(messageArray[index + 1].split(' ')[1], 16) -
                    160 -
                    1
            } else if (value === '{ch-type}') {
                channelType =
                    parseInt(messageArray[index + 1].split(' ')[1], 16) -
                    160 -
                    1
            } else if (value === '{aux}') {
                auxIndex =
                    parseInt(messageArray[index + 1].split(' ')[1], 16) -
                    160 -
                    1
            }
        })
        return {
            channelTypeIndex: channelTypeIndex,
            channelType: channelType,
            auxIndex: auxIndex,
        }
    }

    private extractValue(message: string): number {
        let messageArray = message.split('31 ')
        let hexString = messageArray[messageArray.length - 1]

        // Workaround - Sometimes Studer sends a fader without valid value
        if (hexString.length < 14) {
            return -1
        }
        let hexVal = hexString.split(' ').slice(3)
        // second byte tells the length of value
        hexVal = hexVal.slice(0, parseInt(hexVal[1], 16) + 2)
        let BERreader = new BER.Reader(
            Buffer.from(
                hexVal.map((byte: string) => {
                    return parseInt(byte, 16)
                })
            )
        )
        let value = Math.exp(BERreader.readReal() / 40) / 1.2954
        if (value < 0.09) {
            value = 0
        }
        return value
    }

    private mixerOnline(onLineState: boolean) {
        store.dispatch({
            type: SettingsActionTypes.SET_MIXER_ONLINE,
            mixerIndex: this.mixerIndex,
            mixerOnline: onLineState,
        })
        global.mainThreadHandler.updateMixerOnline(this.mixerIndex)
    }

    private pingMixerCommand() {
        this.mixerProtocol.pingCommand.map((command) => {
            if (command.mixerMessage.includes('{channel}')) {
                this.pingChannel(command.mixerMessage)
            } else {
                let hexArray = command.mixerMessage.split(' ')
                let buf = Buffer.from(
                    hexArray.map((val: string) => {
                        return parseInt(val, 16)
                    })
                )
                this.mixerConnection.write(buf)
            }
            logger.trace('WRITING PING TO MIXER')
        })
    }

    private pingChannel(mixerMessage: string) {
        state.faders[0].fader.forEach((fader: Fader, index: number) => {
            fader.assignedChannels?.forEach(
                (channelReference: ChannelReference) => {
                    if (channelReference.mixerIndex === this.mixerIndex) {
                        const channel =
                            state.channels[0].chMixerConnection[this.mixerIndex]
                                .channel[channelReference.channelIndex]
                        let message = mixerMessage
                            .replace(
                                '{ch-type}',
                                (channel.channelType + 1 + 160).toString(16)
                            )
                            .replace(
                                '{channel}',
                                (channel.channelTypeIndex + 1 + 160).toString(
                                    16
                                )
                            )
                        if (message.includes('{aux}')) {
                            this.pingAuxSend(message)
                        } else {
                            let hexArray = message.split(' ')
                            let buf = Buffer.from(
                                hexArray.map((val: string) => {
                                    return parseInt(val, 16)
                                })
                            )
                            // logger.debug(`Pinging: ${buf}`)
                            this.mixerConnection.write(buf)
                        }
                    }
                }
            )
        })
    }

    private pingAuxSend(message: string) {
        for (
            let index = 0;
            index < state.settings[0].mixers[this.mixerIndex].numberOfAux;
            index++
        ) {
            let auxMessage = message.replace(
                '{aux}',
                (index + 1 + 160).toString(16)
            )
            let hexArray = auxMessage.split(' ')
            let buf = Buffer.from(
                hexArray.map((val: string) => {
                    return parseInt(val, 16)
                })
            )
            // logger.debug(`Pinging: ${buf}`)
            this.mixerConnection.write(buf)
        }
    }

    private sendOutMessage(
        mixerMessage: string,
        channel: number,
        value: string | number
    ) {
        let channelVal: number
        let channelTypeIndex =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channel - 1
            ].channelTypeIndex

        channelVal = 160 + channelTypeIndex + 1

        let channelByte = new Uint8Array([channelVal & 0x000000ff])

        let BERwriter = new BER.Writer()
        if (typeof value === 'number') {
            BERwriter.startSequence()
            BERwriter.writeReal(Math.floor(value))
            BERwriter.endSequence()
        } else {
            BERwriter.startSequence()
            BERwriter.writeString(value)
            BERwriter.endSequence()
        }

        let bufferString: string = ''
        BERwriter.buffer.forEach((element: any) => {
            bufferString += ('0' + element.toString(16)).slice(-2) + ' '
        })
        mixerMessage = mixerMessage.replace(
            '{channel}',
            ('0' + channelByte[0].toString(16)).slice(-2)
        )
        mixerMessage = mixerMessage.replace(
            '{argument}',
            (bufferString + '00 00 00 00 00').slice(3, 35)
        )

        let hexArray = mixerMessage.split(' ')
        let buf = Buffer.from(
            hexArray.map((val: string) => {
                return parseInt(val, 16)
            })
        )
        this.mixerConnection.write(buf)
        logger.trace(`Send HEX: ${mixerMessage}`)
    }

    private sendOutLevelMessage(channel: number, value: number) {
        let levelMessage: string
        let channelVal: number
        let channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channel - 1
            ].channelType
        let channelTypeIndex =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channel - 1
            ].channelTypeIndex

        levelMessage =
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_OUT_GAIN[0].mixerMessage
        channelVal = 160 + channelTypeIndex + 1

        let channelByte = new Uint8Array([channelVal & 0x000000ff])

        logger.trace(`Fader value: ${Math.floor(value)}`)
        let BERwriter = new BER.Writer()

        BERwriter.startSequence()
        BERwriter.writeReal(Math.floor(value))
        BERwriter.endSequence()

        let bufferString: string = ''
        BERwriter.buffer.forEach((element: any) => {
            bufferString += ('0' + element.toString(16)).slice(-2) + ' '
        })
        levelMessage = levelMessage.replace(
            '{channel}',
            ('0' + channelByte[0].toString(16)).slice(-2)
        )
        levelMessage = levelMessage.replace(
            '{level}',
            (bufferString + '00 00 00 00 00').slice(3, 35)
        )

        let hexArray = levelMessage.split(' ')
        let buf = Buffer.from(
            hexArray.map((val: string) => {
                return parseInt(val, 16)
            })
        )
        this.mixerConnection.write(buf)
        logger.trace(`Send HEX: ${levelMessage}`)
    }

    updateFadeIOLevel(channelIndex: number, outputLevel: number) {
        let level = 40 * Math.log(1.295 * outputLevel)
        if (level < -90) {
            level = -90
        }
        // logger.debug(`Log level: ${level}`)

        this.sendOutLevelMessage(channelIndex + 1, level)
    }

    updatePflState(channelIndex: number) {
        return
    }

    updateMuteState(channelIndex: number, muteOn: boolean) {
        let channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelType
        let channelTypeIndex =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelTypeIndex
        if (muteOn === true) {
            let mute =
                this.mixerProtocol.channelTypes[channelType].toMixer
                    .CHANNEL_MUTE_ON[0]
            this.sendOutMessage(
                mute.mixerMessage,
                channelTypeIndex + 1,
                mute.value
            )
        } else {
            let mute =
                this.mixerProtocol.channelTypes[channelType].toMixer
                    .CHANNEL_MUTE_OFF[0]
            this.sendOutMessage(
                mute.mixerMessage,
                channelTypeIndex + 1,
                mute.value
            )
        }
    }

    updateNextAux(channelIndex: number, level: number) {
        this.updateAuxLevel(
            channelIndex,
            state.settings[0].mixers[this.mixerIndex].nextSendAux - 1,
            level
        )
    }

    updateInputGain(channelIndex: number, level: number) {
        return true
    }
    updateInputSelector(channelIndex: number, inputSelected: number) {
        return true
    }

    updateFx(channelIndex: number, fxParam: FxParam, level: number) {
        return true
    }
    updateAuxLevel(channelIndex: number, auxSendIndex: number, level: number) {
        let channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelType
        let channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelTypeIndex + 1
        let auxSendCmd =
            this.mixerProtocol.channelTypes[channelType].toMixer.AUX_LEVEL[0]
        let auxSendNumber = 160 + auxSendIndex + 1

        let auxByte = new Uint8Array([auxSendNumber & 0x000000ff])
        let message = auxSendCmd.mixerMessage.replace(
            '{aux}',
            ('0' + auxByte[0].toString(16)).slice(-2)
        )

        level = 40 * Math.log(1.295 * level)
        if (level < -80) {
            level = -90
        }
        //level = level * (auxSendCmd.max - auxSendCmd.min) + auxSendCmd.min

        this.sendOutMessage(message, channel, level)
    }

    updateChannelName(channelIndex: number) {
        return
    }

    loadMixerPreset(presetName: string) {}

    injectCommand(command: string[]) {}

    updateAMixState(channelIndex: number, amixOn: boolean) {}

    updateChannelSetting(
        channelIndex: number,
        setting: string,
        value: string
    ) {}
}
