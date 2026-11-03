//Node Modules:
import net from 'net'
import { store, state } from '../../reducers/store'
import { mixerGenericConnection } from '../../mainClasses'

import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

//Utils:
import {
    SkaarhojRemoteFaderPresets,
    SkaarhojRemoteProtocol,
    MixerProtocolPresets,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export class SkaarhojRemoteConnection {
    remoteProtocol: SkaarhojRemoteProtocol
    mixerProtocol: any
    clientList: any[]

    constructor() {
        this.updateRemoteFaderState = this.updateRemoteFaderState.bind(this)

        this.remoteProtocol = SkaarhojRemoteFaderPresets.rawPanel
        this.mixerProtocol =
            MixerProtocolPresets[state.settings[0].mixers[0].mixerProtocol] ||
            MixerProtocolPresets.genericMidi
        this.clientList = []

        const server = net.createServer((client: any) => {
            this.clientList.push(client)
            this.setupRemoteFaderConnection(client)
        })

        server.listen(9923, '0.0.0.0')
        logger.info('Skaarhoj server listening at port 9923')
    }

    setupRemoteFaderConnection(client: any) {
        client
            .on('data', (data: any) => {
                logger.debug('Skaarhoj Data Received: ' + data.toString())
                data.toString()
                    .split('\n')
                    .forEach((command: string) => {
                        if (command === 'RDY') {
                            client.write('ready ok\n')
                        } else if (command === 'list') {
                            logger.info('Activating Skaarhoj panel')
                            client.write('ActivePanel=1\n')
                        } else if (command.includes('map=')) {
                            this.initializeMapping(command)
                        } else if (command === 'ping') {
                            client.write('pingo\n')
                        } else if (command === 'ack') {
                            client.write('ack\n')
                        } else if (command.substring(0, 4) === 'HWC#') {
                            this.handleRemoteCommand(command)
                        }
                    })
            })
            .on('error', function () {
                if (this.clientList) {
                    this.clientList.splice(this.clientList.find(client), 1)
                }
                logger.error('Lost Connection to Skaarhoj panel')
            })
            .on('close', function () {
                if (this.clientList) {
                    this.clientList.splice(this.clientList.find(client), 1)
                }
                logger.info('Skaarhoj Connection closed')
            })
    }

    initializeMapping(command: string) {
        let hwButton = parseInt(command.substring(command.indexOf(':') + 1))
        // Initialize:
        logger.info('Initializing Skaarhoj remote')
        if (hwButton <= state.faders[0].fader.length) {
            logger.data(hwButton).info('Initializing skaahoj fader - Button')
            this.updateRemoteFaderState(
                hwButton - 1,
                state.faders[0].fader[hwButton - 1].faderLevel
            )
        }
        this.updateRemoteAuxPanels()
    }

    handleRemoteCommand(command: string) {
        let btnNumber = parseInt(
            command.slice(command.indexOf('#') + 1, command.indexOf('='))
        )
        let event = command.slice(command.indexOf('=') + 1)
        if (btnNumber <= state.faders[0].fader.length) {
            let faderIndex = btnNumber - 1
            let level = state.faders[0].fader[faderIndex].faderLevel
            if (event === 'Enc:1') {
                level += 0.01
                if (level > 1) {
                    level = 1
                }
            } else if (event === 'Enc:2') {
                level += 0.1
                if (level < 0) {
                    level = 0
                }
            } else if (event === 'Enc:-1') {
                level -= 0.01
                if (level < 0) {
                    level = 0
                }
            } else if (event === 'Enc:-2') {
                level -= 0.1
                if (level < 0) {
                    level = 0
                }
            }
            //Fader changed:
            logger.debug(`Received Fader ${faderIndex + 1} Level : ${level}`)
            store.dispatch({
                type: FaderActionTypes.SET_FADER_LEVEL,
                faderIndex: faderIndex,
                level: level,
            })
            mixerGenericConnection.updateOutLevel(faderIndex, -1)
            global.mainThreadHandler.updatePartialStore(faderIndex)
            this.updateRemoteFaderState(faderIndex, level)
        } else if (btnNumber > 80) {
            this.handleAuxLevelCommand(command, btnNumber)
        }
    }

    handleAuxLevelCommand(command: string, btnNumber: number) {
        let auxBtnNumber =
            btnNumber - parseInt((btnNumber / 10).toFixed(0)) * 10
        if (auxBtnNumber > 9) {
            return
        }
        let panelNumber = (btnNumber - auxBtnNumber - 70) / 10
        let faderIndex = panelNumber - 1
        let auxSendIndex = state.faders[0].fader[faderIndex].monitor - 1
        if (auxSendIndex < 0) {
            return
        }
        let chIndex = 0
        let btnIndex = 1
        state.channels[0].chMixerConnection[0].channel.forEach(
            (ch: any, index: number) => {
                if (ch.auxLevel[auxSendIndex] >= 0) {
                    if (btnIndex === auxBtnNumber) {
                        chIndex = index
                        btnIndex++
                    } else if (btnIndex < auxBtnNumber) {
                        btnIndex++
                    }
                }
            }
        )

        let event = command.slice(command.indexOf('=') + 1)
        let level =
            state.channels[0].chMixerConnection[0].channel[chIndex].auxLevel[
                auxSendIndex
            ]
        if (event === 'Enc:1') {
            level += 0.01
            if (level > 1) {
                level = 1
            }
        } else if (event === 'Enc:2') {
            level += 0.1
            if (level < 0) {
                level = 0
            }
        } else if (event === 'Enc:-1') {
            level -= 0.01
            if (level < 0) {
                level = 0
            }
        } else if (event === 'Enc:-2') {
            level -= 0.1
            if (level < 0) {
                level = 0
            }
        }
        //Fader changed:
        logger.info(
            `Received Aux Panel ${panelNumber} Ch ${
                chIndex + 1
            } Level: ${level}`
        )
        store.dispatch({
            type: ChannelActionTypes.SET_AUX_LEVEL,
            mixerIndex: 0,
            channel: chIndex,
            auxIndex: auxSendIndex,
            level: level,
        })
        mixerGenericConnection.updateAuxLevel(chIndex, auxSendIndex + 1)
        global.mainThreadHandler.updateFullClientStore()
        this.updateRemoteAuxPanel(panelNumber)
    }

    updateRemoteFaderState(channelIndex: number, outputLevel: number) {
        let formatLevel = (outputLevel * 100).toFixed()
        let formatLabel =
            state.faders[0].fader[channelIndex]?.label ||
            'CH' + String(channelIndex + 1)
        let formattetString =
            'HWCt#' +
            String(channelIndex + 1) +
            '=' +
            formatLevel +
            '|||||' +
            formatLabel +
            '\n'
        // 32767|||||label
        logger.trace(`Sending command to Skaarhoj : ${formattetString}`)
        this.clientList.forEach((client) => {
            client.write(formattetString)
        })
    }

    updateRemoteAuxPanels() {
        for (let index = 1; index <= 3; index++) {
            this.updateRemoteAuxPanel(index)
        }
    }

    updateRemoteAuxPanel(panelNumber: number) {
        let faderIndex = panelNumber - 1
        let auxSendIndex = state.faders[0].fader[faderIndex].monitor - 1
        if (auxSendIndex < 0) {
            return
        }
        let hwButton = panelNumber * 10 + 70 + 1
        state.channels[0].chMixerConnection[0].channel.forEach(
            (ch: any, index: number) => {
                if (
                    ch.auxLevel[auxSendIndex] >= 0 &&
                    hwButton <= panelNumber * 10 + 70 + 9
                ) {
                    let formatLevel = (
                        ch.auxLevel[auxSendIndex] * 100
                    ).toFixed()
                    let formatLabel =
                        state.faders[0].fader[ch.assignedFader]?.label ||
                        'CH' + String(index + 1)
                    let formattetString =
                        'HWCt#' +
                        String(hwButton) +
                        '=' +
                        formatLevel +
                        '|||||' +
                        formatLabel +
                        '\n'
                    hwButton++
                    this.clientList.forEach((client) => {
                        client.write(formattetString)
                    })
                }
            }
        )
    }

    updateRemotePgmPstPfl(channelIndex: number) {
        return
    }
}
