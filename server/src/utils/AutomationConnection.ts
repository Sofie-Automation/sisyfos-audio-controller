//Node Modules:
import osc from 'osc'
import { store, state } from '../reducers/store'
import { mixerGenericConnection } from '../mainClasses'

//Utils:
import {
    AutomationProtocol,
    AutomationPresets,
    AutomationChannelAPI,
} from '../../../shared/src/constants/AutomationPresets'
import { Fader } from '../../../shared/src/reducers/fadersReducer'
import {
    FaderActionTypes,
} from '../../../shared/src/actions/faderActions'
import { getFaderLabel } from './labels'
import { logger } from './logger'

const AUTOMATION_OSC_PORT = 5255
export class AutomationConnection {
    oscConnection: any
    automationProtocol: AutomationProtocol

    constructor() {
        this.sendOutMessage = this.sendOutMessage.bind(this)

        this.automationProtocol = AutomationPresets.sofie

        this.oscConnection = new osc.UDPPort({
            localAddress: '0.0.0.0',
            localPort: AUTOMATION_OSC_PORT,
        })
        this.setupAutomationConnection()
    }

    setupAutomationConnection() {
        const messageHandler = (
            message: any,
            timetag: number | undefined,
            info: any,
        ) => {
            const check = (key: keyof AutomationProtocol['fromAutomation']) =>
                this.checkOscCommand(
                    message.address,
                    this.automationProtocol.fromAutomation[key],
                )
            const wrapChannelCommand = (fn: (ch: any) => void) => {
                let ch: number
                let chMessage = message.address.split('/')[2]

                if (Number.isNaN(parseInt(chMessage))) {
                    // look among labels to find channel
                    const fader = state.faders[0].fader
                        .map((f, i) => ({ ...f, i }))
                        .find(
                            (f) =>
                                f.userLabel === chMessage ||
                                f.label === chMessage,
                        )
                    const channel = state.channels[0].chMixerConnection
                        .map((conn) =>
                            conn.channel.map((ch) => ({
                                assignedFader: ch.assignedFader,
                                label: ch.label,
                            })),
                        )
                        .map((m) => m.find((ch) => ch.label === chMessage))
                        .find((m) => m)

                    if (fader) {
                        ch = fader.i + 1
                    } else if (channel) {
                        ch = channel.assignedFader + 1
                    } else {
                        logger.error(
                            `Could not find fader with label: ${chMessage}`,
                        )
                        return
                    }
                } else {
                    ch = parseInt(chMessage)
                }

                if (
                    state.faders[0].fader[ch - 1] &&
                    !state.faders[0].fader[ch - 1].ignoreAutomation
                ) {
                    fn(ch)
                }
                global.mainThreadHandler.updatePartialStore(ch - 1)
            }

            logger
                .data(message)
                .debug(`RECIEVED AUTOMATION MESSAGE: ${message.address}`)

            // Set state of Sisyfos:
            if (check('CHANNEL_PGM_ON_OFF')) {
                wrapChannelCommand((ch: any) => {
                    if (message.args[0] === 1) {
                        mixerGenericConnection.checkForAutoResetThreshold(
                            ch - 1,
                        )
                        store.dispatch({
                            type: FaderActionTypes.SET_PGM,
                            faderIndex: ch - 1,
                            pgmOn: true,
                        })
                    } else if (message.args[0] === 2) {
                        mixerGenericConnection.checkForAutoResetThreshold(
                            ch - 1,
                        )
                        store.dispatch({
                            type: FaderActionTypes.SET_VO,
                            faderIndex: ch - 1,
                            voOn: true,
                        })
                    } else {
                        store.dispatch({
                            type: FaderActionTypes.SET_PGM,
                            faderIndex: ch - 1,
                            pgmOn: false,
                        })
                    }

                    if (message.args.length > 1) {
                        mixerGenericConnection.updateOutLevel(
                            ch - 1,
                            parseFloat(message.args[1]),
                        )
                    } else {
                        mixerGenericConnection.updateOutLevel(ch - 1, -1)
                    }
                })
            } else if (check('CHANNEL_PST_ON_OFF')) {
                wrapChannelCommand((ch) => {
                    if (message.args[0] === 1) {
                        store.dispatch({
                            type: FaderActionTypes.SET_PST,
                            faderIndex: ch - 1,
                            pstOn: true,
                        })
                    } else if (message.args[0] === 2) {
                        store.dispatch({
                            type: FaderActionTypes.SET_PST_VO,
                            faderIndex: ch - 1,
                            pstVoOn: true,
                        })
                    } else {
                        store.dispatch({
                            type: FaderActionTypes.SET_PST,
                            faderIndex: ch - 1,
                            pstOn: false,
                        })
                    }
                    mixerGenericConnection.updateNextAux(ch - 1)
                })
            } else if (check('CHANNEL_MUTE')) {
                wrapChannelCommand((ch: any) => {
                    store.dispatch({
                        type: FaderActionTypes.SET_MUTE,
                        faderIndex: ch - 1,
                        muteOn: message.args[0] === 1,
                    })
                    mixerGenericConnection.updateMuteState(ch - 1)
                })
            } else if (check('CHANNEL_FADER_LEVEL')) {
                wrapChannelCommand((ch: any) => {
                    store.dispatch({
                        type: FaderActionTypes.SET_FADER_LEVEL,
                        faderIndex: ch - 1,
                        level: message.args[0],
                    })
                    if (message.args.length > 1) {
                        mixerGenericConnection.updateOutLevel(
                            ch - 1,
                            parseFloat(message.args[1]),
                        )
                    } else {
                        mixerGenericConnection.updateOutLevel(ch - 1, -1)
                    }
                })
            } else if (check('CHANNEL_INPUT_GAIN')) {
                wrapChannelCommand((ch: any) => {
                    store.dispatch({
                        type: FaderActionTypes.SET_INPUT_GAIN,
                        faderIndex: ch - 1,
                        level: message.args[0],
                    })
                    if (message.args.length > 1) {
                        mixerGenericConnection.updateInputGain(
                            ch - 1,
                        )
                    } else {
                        mixerGenericConnection.updateInputGain(ch - 1)
                    }
                })
            }  else if (check('CHANNEL_INPUT_SELECTOR')) {
                wrapChannelCommand((ch: any) => {
                    store.dispatch({
                        type: FaderActionTypes.SET_INPUT_SELECTOR,
                        faderIndex: ch - 1,
                        selected: message.args[0],
                    })
                    if (message.args.length > 1) {
                        mixerGenericConnection.updateInputSelector(
                            ch - 1,
                        )
                    } else {
                        mixerGenericConnection.updateInputSelector(ch - 1)
                    }
                })
            }  else if (check('SET_CHANNEL_STATE')) {
                wrapChannelCommand((ch: any) => {
                    const apiState: AutomationChannelAPI = JSON.parse(message.args[0])
                    const oldState = state.faders[0].fader[ch - 1]
                    const channelState: Fader = {
                      ...oldState,
                      faderLevel: apiState.faderLevel ?? oldState.faderLevel,
                      pgmOn: apiState.pgmOn ?? oldState.pgmOn,
                      voOn: apiState.voOn ?? oldState.voOn,
                      pstOn: apiState.pstOn ?? oldState.pstOn,
                      showChannel: apiState.showChannel ?? oldState.showChannel,
                      muteOn: apiState.muteOn ?? oldState.muteOn,
                      inputGain: apiState.inputGain ?? oldState.inputGain,
                      inputSelector:
                        apiState.inputSelector ?? oldState.inputSelector,
                      label: apiState.label ?? oldState.label,
                    }
                    store.dispatch({
                        type: FaderActionTypes.SET_SINGLE_FADER_STATE,
                        faderIndex: ch - 1,
                        state: channelState,
                    })
                })
            } else if (check('INJECT_COMMAND')) {
                /*
                The INJECT COMMAND is not implemented
                It's planned for injecting commands directly from Sisyfos into the Audiomixer.
                wrapChannelCommand((ch: any) => {
                    store.dispatch({
                        type: FaderActionTypes.SET_FADER_LABEL,
                        faderIndex: ch - 1,
                        label: message.args[0],
                    })
                    mixerGenericConnection.injectCommand(message.args)
                })
                */
            } else if (check('SNAP_RECALL')) {
                let snapNumber = message.address.split('/')[2]
                store.dispatch({
                    type: FaderActionTypes.SNAP_RECALL,
                    snapshotIndex: snapNumber - 1,
                })
            } else if (check('SET_LABEL')) {
                wrapChannelCommand((ch: any) => {
                    store.dispatch({
                        type: FaderActionTypes.SET_FADER_LABEL,
                        faderIndex: ch - 1,
                        label: message.args[0],
                    })
                    mixerGenericConnection.updateChannelName(ch - 1)
                })
            } else if (check('X_MIX')) {
                store.dispatch({
                    type: FaderActionTypes.X_MIX,
                })
                mixerGenericConnection.updateOutLevels()
                global.mainThreadHandler.updateFullClientStore()
            } else if (check('CHANNEL_VISIBLE')) {
                wrapChannelCommand((ch: any) => {
                    store.dispatch({
                        type: FaderActionTypes.SHOW_CHANNEL,
                        faderIndex: ch - 1,
                        showChannel: message.args[0] === 1,
                    })
                })
            } else if (check('FADE_TO_BLACK')) {
                store.dispatch({
                    type: FaderActionTypes.FADE_TO_BLACK,
                })
                mixerGenericConnection.updateFadeToBlack()
                global.mainThreadHandler.updateFullClientStore()
            } else if (check('CLEAR_PST')) {
                store.dispatch({
                    type: FaderActionTypes.CLEAR_PST,
                })
                mixerGenericConnection.updateOutLevels()
                global.mainThreadHandler.updateFullClientStore()
            } else if (check('STATE_FULL')) {
                // Get state from Producers Audio Mixer:
                this.sendOutMessage(
                    this.automationProtocol.toAutomation.STATE_FULL,
                    0,
                    JSON.stringify({
                        channel: state.faders[0].fader.map(
                            (
                                {
                                    faderLevel,
                                    pgmOn,
                                    voOn,
                                    pstOn,
                                    showChannel,
                                    muteOn,
                                    inputGain,
                                    inputSelector,
                                }: Fader,
                                index,
                            ): AutomationChannelAPI => ({
                                faderLevel,
                                pgmOn,
                                voOn,
                                pstOn,
                                showChannel,
                                inputGain,
                                inputSelector,
                                label: getFaderLabel(index),
                                muteOn,
                            }),
                        ),
                    }),
                    's',
                    info,
                )
            } else if (check('STATE_CHANNEL')) {
                wrapChannelCommand((ch: any) => {
                    // Return state of fader to automation:
                    const currentFader = state.faders[0].fader[ch - 1]
                    const channelState: AutomationChannelAPI = {
                        faderLevel: currentFader.faderLevel,
                        pgmOn: currentFader.pgmOn,
                        voOn: currentFader.voOn,
                        pstOn: currentFader.pstOn,
                        showChannel: currentFader.showChannel,
                        label: getFaderLabel(ch - 1),
                        muteOn: currentFader.muteOn,
                        inputGain: currentFader.inputGain,
                        inputSelector: currentFader.inputSelector,
                    }
                    this.sendOutMessage(
                        this.automationProtocol.toAutomation.STATE_CHANNEL,
                        ch,
                        JSON.stringify({
                            channel: [channelState],
                        }),
                        's',
                        info,
                    )
                })
            } else if (check('STATE_CHANNEL_PGM')) {
                wrapChannelCommand((ch: any) => {
                    this.sendOutMessage(
                        this.automationProtocol.toAutomation.STATE_CHANNEL_PGM,
                        ch,
                        state.faders[0].fader[ch - 1].pgmOn,
                        'i',
                        info,
                    )
                })
            } else if (check('STATE_CHANNEL_PST')) {
                wrapChannelCommand((ch) => {
                    this.sendOutMessage(
                        this.automationProtocol.toAutomation.STATE_CHANNEL_PST,
                        ch,
                        state.faders[0].fader[ch - 1].pstOn,
                        'i',
                        info,
                    )
                })
            } else if (check('STATE_CHANNEL_MUTE')) {
                wrapChannelCommand((ch) => {
                    this.sendOutMessage(
                        this.automationProtocol.toAutomation.STATE_CHANNEL_MUTE,
                        ch,
                        state.faders[0].fader[ch - 1].muteOn,
                        'i',
                        info,
                    )
                })
            } else if (check('STATE_CHANNEL_FADER_LEVEL')) {
                wrapChannelCommand((ch) => {
                    this.sendOutMessage(
                        this.automationProtocol.toAutomation
                            .STATE_CHANNEL_FADER_LEVEL,
                        ch,
                        state.faders[0].fader[ch - 1].faderLevel,
                        'f',
                        info,
                    )
                })
            } else if (check('STATE_CHANNEL_INPUT_GAIN')) {
                wrapChannelCommand((ch) => {
                    this.sendOutMessage(
                        this.automationProtocol.toAutomation
                            .STATE_CHANNEL_INPUT_GAIN,
                        ch,
                        state.faders[0].fader[ch - 1].inputGain,
                        'f',
                        info
                    )
                })
            } else if (check('STATE_CHANNEL_INPUT_SELECTOR')) {
                wrapChannelCommand((ch) => {
                    this.sendOutMessage(
                        this.automationProtocol.toAutomation
                            .STATE_CHANNEL_INPUT_SELECTOR,
                        ch,
                        state.faders[0].fader[ch - 1].inputSelector,
                        'i',
                        info
                    )
                })
            } else if (check('PING')) {
                // let pingValue = state.settings[0].mixers[0].mixerOnline
                //     ? message.address.split('/')[2]
                //     : 'offline'
                let pingValue = message.address.split('/')[2]

                this.sendOutMessage(
                    this.automationProtocol.toAutomation.PONG,
                    0,
                    pingValue,
                    's',
                    info,
                )
            }
        }

        this.oscConnection
            .on('ready', () => {
                this.automationProtocol.initializeCommands.map((item) => {
                    // this.sendOutMessage(item.oscMessage, 1, item.value, item.type);
                    logger.info('Listening for Automation via OSC over UDP.')
                })
            })
            .on('message', messageHandler)
            .on('error', (error: any) => {
                logger.data(error).error('Error OSC')
            })

        this.oscConnection.open()
        logger.info(`OSC Automation listening on port ${AUTOMATION_OSC_PORT}`)
    }

    checkOscCommand(message: string, command: string) {
        if (message === command) return true

        let cmdArray = command.split('{value1}')

        if (
            message.substr(0, cmdArray[0].length) === cmdArray[0] &&
            (message.substr(-cmdArray[1].length) === cmdArray[1] ||
                cmdArray[1].length === 0) &&
            message.length >= command.replace('{value1}', '').length
        ) {
            return true
        } else {
            return false
        }
    }

    sendOutMessage(
        oscMessage: string,
        channel: number,
        value: string | number | boolean,
        type: string,
        to: { address: string; port: number },
    ) {
        let channelString = this.automationProtocol.leadingZeros
            ? ('0' + channel).slice(-2)
            : channel.toString()
        let message = oscMessage.replace('{value1}', channelString)
        if (message != 'none') {
            this.oscConnection.send(
                {
                    address: message,
                    args: [
                        {
                            type: type,
                            value: value,
                        },
                    ],
                },
                to.address,
                to.port,
            )
        }
    }
}
