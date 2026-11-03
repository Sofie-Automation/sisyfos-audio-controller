//Node Modules:
import WebMidi from 'webmidi'
import { store, state } from '../../reducers/store'
import { mixerGenericConnection } from '../../mainClasses'

import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

//Utils:
import {
    RemoteProtocol,
    RemoteFaderPresets,
    MidiReceiveTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerProtocolPresets } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'

export class HuiMidiRemoteConnection {
    remoteProtocol: RemoteProtocol
    midiReceiveTypes = MidiReceiveTypes
    mixerProtocol: any
    midiInput: any
    midiOutput: any
    activeHuiChannel: number = 0

    constructor() {
        this.convertFromRemoteLevel = this.convertFromRemoteLevel.bind(this)
        this.convertToRemoteLevel = this.convertToRemoteLevel.bind(this)
        this.updateRemoteFaderState = this.updateRemoteFaderState.bind(this)

        this.remoteProtocol = RemoteFaderPresets.hui
        this.mixerProtocol =
            MixerProtocolPresets[state.settings[0].mixers[0].mixerProtocol] ||
            MixerProtocolPresets.genericMidi

        if (!state.settings[0].enableRemoteFader) {
            return
        }

        WebMidi.enable((err) => {
            if (err) {
                logger
                    .data(err)
                    .error(
                        'Remote MidiController connection could not be enabled.'
                    )
            }

            this.midiInput = WebMidi.getInputByName(
                state.settings[0].remoteFaderMidiInputPort
            )
            this.midiOutput = WebMidi.getOutputByName(
                state.settings[0].remoteFaderMidiOutputPort
            )

            if (this.midiInput && this.midiOutput) {
                logger.info('Remote Midi Controller connected on port')
                logger.info(
                    `Midi input : ${state.settings[0].remoteFaderMidiInputPort}`
                )
                logger.info(
                    `Midi output : ${state.settings[0].remoteFaderMidiOutputPort}`
                )
                this.setupRemoteFaderConnection()
            } else {
                logger.error(
                    'Remote Midi Controller not found or not configured.'
                )
            }
        })
    }

    setupRemoteFaderConnection() {
        this.midiInput.addListener(
            this.midiReceiveTypes[
                this.remoteProtocol.fromRemote.CHANNEL_FADER_LEVEL.type
            ],
            undefined,
            (message: any) => {
                if (message.data[1] < 9) {
                    //Fader changed:
                    logger.info(`Received Fader message (${message.data}).`)
                    store.dispatch({
                        type: FaderActionTypes.SET_FADER_LEVEL,
                        faderIndex: message.data[1],
                        level: this.convertFromRemoteLevel(message.data[2]),
                    })
                    mixerGenericConnection.updateOutLevel(message.data[1], -1)
                    this.updateRemoteFaderState(
                        message.data[1],
                        this.convertFromRemoteLevel(message.data[2])
                    )
                } else if ((message.data[1] = 15)) {
                    logger.info(`Received message (${message.data}).`)
                    if (message.data[2] < 9) {
                        //Set active channel for next midi message:
                        this.activeHuiChannel = message.data[2]
                    } else if (message.data[2] && message.data[2] === 65) {
                        //SELECT button - toggle PGM ON/OFF
                        store.dispatch({
                            type: FaderActionTypes.TOGGLE_PGM,
                            faderIndex: this.activeHuiChannel,
                        })
                        mixerGenericConnection.updateOutLevel(
                            this.activeHuiChannel,
                            -1
                        )
                        this.updateRemotePgmPstPfl(this.activeHuiChannel)
                    } else if (message.data[2] && message.data[2] === 67) {
                        //SOLO button - toggle PFL ON/OFF
                        store.dispatch({
                            type: FaderActionTypes.TOGGLE_PFL,
                            faderIndex: this.activeHuiChannel,
                        })
                        mixerGenericConnection.updateOutLevel(
                            this.activeHuiChannel,
                            -1
                        )
                        this.updateRemotePgmPstPfl(this.activeHuiChannel)
                    }
                }
            }
        )
        //for testing:
        this.midiInput.addListener('noteon', 'all', (error: any) => {
            logger.info(
                `Received 'noteon' message (${error.note.name} ${error.note.octave}).`
            )
        })
    }

    convertToRemoteLevel(level: number) {
        let oldMin = this.mixerProtocol.fader.min
        let oldMax = this.mixerProtocol.fader.max
        let newMin = this.remoteProtocol.fader.min
        let newMax = this.remoteProtocol.fader.max

        let indexLevel = (level / (oldMax - oldMin)) * (newMax - newMin)
        let newLevel = newMin + indexLevel
        return newLevel //convert from mixer min-max to remote min-max
    }

    convertFromRemoteLevel(level: number) {
        let oldMin = this.remoteProtocol.fader.min
        let oldMax = this.remoteProtocol.fader.max
        let newMin = this.mixerProtocol.fader.min
        let newMax = this.mixerProtocol.fader.max

        let indexLevel = (level / (oldMax - oldMin)) * (newMax - newMin)
        let newLevel = newMin + indexLevel

        return newLevel //convert from mixer min-max to remote min-max
    }

    updateRemoteFaderState(channelIndex: number, outputLevel: number) {
        if (!this.midiOutput) {
            return
        }
        logger.info(
            `Send fader update : Channel index : ${channelIndex} OutputLevel : ${this.convertToRemoteLevel(
                outputLevel
            )}`
        )
        this.midiOutput.sendControlChange(
            channelIndex,
            this.convertToRemoteLevel(outputLevel),
            1
        )
        this.midiOutput.sendControlChange(32 + channelIndex, 0, 1)
        this.updateRemotePgmPstPfl(channelIndex)
    }

    updateRemotePgmPstPfl(channelIndex: number) {
        if (!this.midiOutput) {
            return
        }
        //Update SELECT button:
        this.midiOutput.sendControlChange(12, channelIndex, 1)
        this.midiOutput.sendControlChange(
            44,
            1 + 64 * (state.faders[0].fader[channelIndex].pgmOn ? 1 : 0),
            1
        )

        //Update SOLO button:
        this.midiOutput.sendControlChange(12, channelIndex, 1)
        this.midiOutput.sendControlChange(
            44,
            3 + 64 * (state.faders[0].fader[channelIndex].pflOn ? 1 : 0),
            1
        )
    }
}
