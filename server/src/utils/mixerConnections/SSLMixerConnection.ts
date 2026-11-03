//Node Modules:
import net from 'net'
import { store, state } from '../../reducers/store'
import { mixerGenericConnection, remoteConnections } from '../../mainClasses'

//Utils:
import {
    FxParam,
    MixerProtocol,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import {
    ChannelReference,
    Fader,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerConnection } from '.'

export class SSLMixerConnection implements MixerConnection {
    mixerProtocol: MixerProtocol
    mixerIndex: number
    cmdChannelIndex: number
    SSLConnection: any
    mixerOnlineTimer: any

    constructor(mixerProtocol: MixerProtocol, mixerIndex: number) {
        this.sendOutLevelMessage = this.sendOutLevelMessage.bind(this)

        store.dispatch({
            type: SettingsActionTypes.SET_MIXER_ONLINE,
            mixerIndex: this.mixerIndex,
            mixerOnline: false,
        })

        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex

        this.cmdChannelIndex =
            this.mixerProtocol.channelTypes[0].fromMixer.CHANNEL_OUT_GAIN[0].mixerMessage
                .split('/')
                .findIndex((ch) => ch === '{channel}')

        this.SSLConnection = new net.Socket()
        this.SSLConnection.connect(
            state.settings[0].mixers[this.mixerIndex].devicePort,
            state.settings[0].mixers[this.mixerIndex].deviceIp,
            () => {
                logger.info('Connected to SSL')
            }
        )
        this.setupMixerConnection()
    }

    private formatHexWithSpaces(str: string, item: string, every: number) {
        for (let i = 0; i < str.length; i++) {
            if (!(i % (every + 1))) {
                str = str.substring(0, i) + item + str.substring(i)
            }
        }
        return str.substring(1)
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

    private handleReceivedFaderLevelCommand = (buffer: any) => {
        try {
            let channelIndex = buffer[6]
            let value = buffer.readUInt16BE(7) / 1024
            const thisMixerChannels =
                state.channels[0].chMixerConnection[this.mixerIndex].channel
            const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)

            if (!thisMixerChannels[channelIndex].fadeActive) {
                if (
                    value >
                    this.mixerProtocol.fader.min +
                        (this.mixerProtocol.fader.max *
                            state.settings[0].autoResetLevel) /
                            100
                ) {
                    if (thisMixerChannels[channelIndex].outputLevel !== value) {
                        store.dispatch({
                            type: FaderActionTypes.SET_FADER_LEVEL,
                            faderIndex: assignedFaderIndex,
                            level: value,
                        })
                        if (!state.faders[0].fader[assignedFaderIndex].pgmOn) {
                            store.dispatch({
                                type: FaderActionTypes.TOGGLE_PGM,
                                faderIndex: assignedFaderIndex,
                            })
                        }

                        if (remoteConnections) {
                            remoteConnections.updateRemoteFaderState(
                                assignedFaderIndex,
                                value
                            )
                        }
                        if (state.faders[0].fader[assignedFaderIndex].pgmOn) {
                            state.faders[0].fader[
                                assignedFaderIndex
                            ].assignedChannels?.forEach(
                                (item: ChannelReference) => {
                                    if (item.mixerIndex === this.mixerIndex) {
                                        this.updateOutLevel(item.channelIndex)
                                    }
                                }
                            )
                        }
                    }
                } else if (
                    state.faders[0].fader[assignedFaderIndex].pgmOn ||
                    state.faders[0].fader[assignedFaderIndex].voOn
                ) {
                    store.dispatch({
                        type: FaderActionTypes.SET_FADER_LEVEL,
                        faderIndex: assignedFaderIndex,
                        level: value,
                    })
                    state.faders[0].fader[
                        assignedFaderIndex
                    ].assignedChannels?.forEach((item: ChannelReference) => {
                        if (item.mixerIndex === this.mixerIndex) {
                            store.dispatch({
                                type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                                mixerIndex: this.mixerIndex,
                                channel: item.channelIndex,
                                level: value,
                            })
                        }
                    })
                }
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
                mixerGenericConnection.updateOutLevel(
                    assignedFaderIndex,
                    0,
                    this.mixerIndex
                )
            }
        } catch (error) {
            logger.error(
                'Error translating received message :' + String(error),
                {}
            )
        }
    }

    private handleReceivedMuteCommand = (buffer: any) => {
        // MUTE ON/OFF COMMAND
        let commandHex = buffer.toString('hex')
        let channelIndex = buffer[6]
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        let value: boolean = buffer[7] === 0 ? true : false
        logger.trace(
            `Receive Buffer Channel On/off: ${this.formatHexWithSpaces(
                commandHex,
                ' ',
                2
            )}`
        )

        store.dispatch({
            type: FaderActionTypes.SET_MUTE,
            faderIndex: assignedFaderIndex,
            muteOn: value,
        })

        if (remoteConnections) {
            remoteConnections.updateRemoteFaderState(
                assignedFaderIndex,
                value ? 1 : 0
            )
        }

        state.faders[0].fader[assignedFaderIndex].assignedChannels?.forEach(
            (item: ChannelReference) => {
                if (
                    item.mixerIndex === this.mixerIndex &&
                    item.channelIndex !== channelIndex
                ) {
                    this.updateMuteState(item.channelIndex, value)
                }
            }
        )
        mixerGenericConnection.updateMuteState(
            assignedFaderIndex,
            this.mixerIndex
        )
        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
    }

    private setupMixerConnection() {
        // Return command was an acknowledge:
        let lastWasAck = false

        this.SSLConnection.on('ready', () => {
            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: true,
            })

            logger.info('Receiving state of desk', {})
            this.mixerProtocol.initializeCommands.forEach((item) => {
                if (item.mixerMessage.includes('{channel}')) {
                    state.channels[0].chMixerConnection[
                        this.mixerIndex
                    ].channel.forEach((channel: any, index: any) => {
                        this.sendOutRequest(item.mixerMessage, index)
                    })
                } else {
                    this.sendOutLevelMessage(item.mixerMessage, 0, item.value)
                }
            })
            global.mainThreadHandler.updateFullClientStore()
        })
            .on('data', (data: any) => {
                clearTimeout(this.mixerOnlineTimer)
                store.dispatch({
                    type: SettingsActionTypes.SET_MIXER_ONLINE,
                    mixerIndex: this.mixerIndex,
                    mixerOnline: true,
                })

                let buffers = []
                let lastIndex = 0
                for (let index = 1; index < data.length; index++) {
                    if (data[index] === 241) {
                        buffers.push(data.slice(lastIndex, index - 1))
                        lastIndex = index
                    }
                }
                if (buffers.length === 0) {
                    buffers.push(data)
                }

                buffers.forEach((buffer) => {
                    if (buffer[1] === 6 && buffer[2] === 255 && !lastWasAck) {
                        lastWasAck = false
                        // FADERLEVEL COMMAND:
                        this.handleReceivedFaderLevelCommand(buffer)
                    } else if (
                        buffer[1] === 5 &&
                        buffer[2] === 255 &&
                        buffer[4] === 1 &&
                        !lastWasAck
                    ) {
                        lastWasAck = false
                        // MUTE ON/OFF COMMAND
                        this.handleReceivedMuteCommand(buffer)
                    } else {
                        // UNKNOWN COMMAND
                        let commandHex = buffer.toString('hex')
                        logger.trace(
                            `Receieve Buffer Hex: ${this.formatHexWithSpaces(
                                commandHex,
                                ' ',
                                2
                            )}`
                        )
                    }
                    if (buffer[0] === 4) {
                        lastWasAck = true
                    } else {
                        lastWasAck = false
                    }
                })
            })
            .on('error', (error: any) => {
                logger.error(`Error: ${error}`)
                logger.info('Lost SCP connection')
            })

        //Ping mixer to get mixerOnlineState
        let oscTimer = setInterval(() => {
            this.pingMixerCommand()
        }, this.mixerProtocol.pingTime)
    }

    private pingMixerCommand() {
        //Ping OSC mixer if mixerProtocol needs it.
        this.mixerProtocol.pingCommand.forEach((command) => {
            this.sendOutPingRequest()
        })
        this.mixerOnlineTimer = setTimeout(() => {
            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: false,
            })
        }, this.mixerProtocol.pingTime)
    }

    private calculate_checksum8(hexValues: string) {
        // convert input value to upper case
        hexValues = hexValues.toUpperCase()

        let strHex = new String('0123456789ABCDEF')
        let result = 0
        let fctr = 16

        for (let i = 0; i < hexValues.length; i++) {
            if (hexValues.charAt(i) == ' ') continue

            let v = strHex.indexOf(hexValues.charAt(i))
            if (v < 0) {
                result = -1
                break
            }
            result += v * fctr

            if (fctr == 16) fctr = 1
            else fctr = 16
        }

        // Calculate 2's complement
        result = (~(result & 0xff) + 1) & 0xff
        // Convert result to string
        return (
            strHex.charAt(Math.floor(result / 16)) + strHex.charAt(result % 16)
        )
    }

    private sendOutLevelMessage(
        sslMessage: string,
        channelIndex: number,
        value: string | number
    ) {
        let valueNumber: number
        if (typeof value === 'string') {
            value = parseFloat(value)
        }
        if (value < 0) {
            value = 0
        }
        valueNumber = value * 1024
        let valueByte = new Uint8Array([
            (valueNumber & 0x0000ff00) >> 8,
            valueNumber & 0x000000ff,
        ])

        let channelByte = new Uint8Array([
            (channelIndex & 0x0000ff00) >> 8,
            channelIndex & 0x000000ff,
        ])

        sslMessage = sslMessage.replace(
            '{channel}',
            ('0' + channelByte[0].toString(16)).slice(-2) +
                ' ' +
                ('0' + channelByte[1].toString(16)).slice(-2)
        )
        sslMessage = sslMessage.replace(
            '{level}',
            ('0' + valueByte[0].toString(16)).slice(-2) +
                ' ' +
                ('0' + valueByte[1].toString(16)).slice(-2) +
                ' '
        )
        sslMessage = sslMessage + this.calculate_checksum8(sslMessage.slice(9))
        let a = sslMessage.split(' ')
        let buf = Buffer.from(
            a.map((val: string) => {
                return parseInt(val, 16)
            })
        )

        logger.trace(`Send HEX: ${sslMessage}`)
        this.SSLConnection.write(buf)
    }

    private sendOutRequest(sslMessage: string, channelIndex: number) {
        //let sslMessage = 'f1 06 00 80 00 00 {channel} {level}'
        let channelByte = new Uint8Array([
            (channelIndex & 0x0000ff00) >> 8,
            channelIndex & 0x000000ff,
        ])
        sslMessage = sslMessage.replace(
            '{channel}',
            ('0' + channelByte[0].toString(16)).slice(-2) +
                ' ' +
                ('0' + channelByte[1].toString(16)).slice(-2)
        )
        sslMessage =
            sslMessage + ' ' + this.calculate_checksum8(sslMessage.slice(9))
        let a = sslMessage.split(' ')
        let buf = Buffer.from(
            a.map((val: string) => {
                return parseInt(val, 16)
            })
        )

        logger.trace(`Send HEX: ${sslMessage}`)
        this.SSLConnection.write(buf)
    }

    private sendOutPingRequest() {
        let sslMessage = 'f1 02 00 07 00'
        sslMessage =
            sslMessage + ' ' + this.calculate_checksum8(sslMessage.slice(9))
        let a = sslMessage.split(' ')
        let buf = Buffer.from(
            a.map((val: string) => {
                return parseInt(val, 16)
            })
        )

        logger.trace(`Send HEX: ${sslMessage}`)
        this.SSLConnection.write(buf)
    }

    private updateOutLevel(channelIndex: number) {
        let channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelType
        let channelTypeIndex =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelTypeIndex
        const faderIndex = this.getAssignedFaderIndex(channelIndex)

        if (state.faders[0].fader[faderIndex].pgmOn) {
            store.dispatch({
                type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                mixerIndex: this.mixerIndex,
                channel: channelIndex,
                level: state.faders[0].fader[faderIndex].faderLevel,
            })
        }
        this.sendOutLevelMessage(
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_OUT_GAIN[0].mixerMessage,
            channelTypeIndex,
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].outputLevel
        )
    }

    updatePflState(channelIndex: number) {
        let channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelType
        let channelTypeIndex =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelTypeIndex
        if (state.faders[0].fader[channelIndex].pflOn === true) {
            this.sendOutRequest(
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_ON[0]
                    .mixerMessage,
                channelTypeIndex
            )
        } else {
            this.sendOutRequest(
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_OFF[0]
                    .mixerMessage,
                channelTypeIndex
            )
        }
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
            this.sendOutRequest(
                this.mixerProtocol.channelTypes[channelType].toMixer
                    .CHANNEL_MUTE_ON[0].mixerMessage,
                channelTypeIndex
            )
        } else {
            this.sendOutRequest(
                this.mixerProtocol.channelTypes[channelType].toMixer
                    .CHANNEL_MUTE_OFF[0].mixerMessage,
                channelTypeIndex
            )
        }
    }

    updateFadeIOLevel(channelIndex: number, outputLevel: number) {
        let channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelType
        let channelTypeIndex =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelTypeIndex
        this.sendOutLevelMessage(
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_OUT_GAIN[0].mixerMessage,
            channelTypeIndex,
            String(outputLevel)
        )
    }

    updateNextAux(channelIndex: number, level: number) {
        this.sendOutLevelMessage(
            this.mixerProtocol.channelTypes[0].toMixer.NEXT_SEND[0]
                .mixerMessage,
            channelIndex + 128,
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
        return true
    }

    updateChannelName(channelIndex: number) {
        return true
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
