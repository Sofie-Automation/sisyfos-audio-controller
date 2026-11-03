//Node Modules:
import { store, state } from '../../reducers/store'
import { ConnectionTCP } from 'node-vmix'
import { XmlApi } from 'vmix-js-utils'
import fs from 'fs'
import path from 'path'

//Utils:
import {
    FxParam,
    VMixMixerProtocol,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    ChannelActions,
    ChannelActionTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    FaderActions,
    FaderActionTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    SettingsActions,
    SettingsActionTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import { sendVuLevel } from '../vuServer'
import { VuType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { dbToFloat } from './LawoRubyConnection'
import {
    ChannelReference,
    Fader,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerConnection } from '.'
import { STORAGE_FOLDER } from '../SettingsStorage'
import { Preset } from './productSpecific/vMixPreset'
import { VMixPoller } from './productSpecific/VMixPoller'
import { VMixConnectionWatchdog } from './productSpecific/VMixConnectionWatchdog'
import { MasterAudioBus } from 'vmix-js-utils/dist/types/audio-bus'

/** If no XML received within 2 seconds, we reconnect the feedback connection */
const CONNECTION_WATCHDOG_TIMEOUT_MS = 2000
/** We usually poll 80 milliseconds after last XML requested(!) - this is so frequent in order to maintain fairly smooth vu-meters, as well as keep the state up to date */
const DEFAULT_POLL_INTERVAL_MS = 80
/** We try to limit polling to at least 20 milliseconds since last XML received(!) in order not to flood vMix too much */
const DEFAULT_MIN_POLL_INTERVAL_MS = 20
/** We fallback to doing an additional poll in 500 milliseconds if no XML response is received */
const FALLBACK_POLL_INTERVAL_MS = 500

interface VMixInput {
    name: string
    volume: number
    muted: boolean
    state?: string
    meterF1: number
    meterF2: number
    number: number
    gainDb: number
    solo: boolean
}

interface VMixInputLocation {
    // input number in vMix
    inputNumber: number
    channelType: number
}

import {
    resolveChannelMatrixPreset,
    buildChannelMixerVolumes,
} from './vmixChannelMatrix'
export {
    resolveChannelMatrixPreset,
    buildChannelMixerVolumes,
} from './vmixChannelMatrix'

export class VMixMixerConnection implements MixerConnection {
    mixerProtocol: VMixMixerProtocol
    mixerIndex: number

    vMixCommandConnection: ConnectionTCP
    /** We use a separate connection for updates to prevent blocking any commands */
    vMixFeedbackConnection: ConnectionTCP

    private poller: VMixPoller
    private watchdog: VMixConnectionWatchdog

    audioOn: Record<string, boolean> = {}
    lastLevel: Record<string, number> = {}

    lastState: VMixInput[] | undefined
    private lastMasterState: { volume: number; muted: boolean } | undefined

    awaitingFirstXml = true

    constructor(mixerProtocol: VMixMixerProtocol, mixerIndex: number) {
        this.sendOutMessage = this.sendOutMessage.bind(this)
        this.xmlElementToInput = this.xmlElementToInput.bind(this)
        this.updateInputState = this.updateInputState.bind(this)

        store.dispatch({
            type: SettingsActionTypes.SET_MIXER_ONLINE,
            mixerIndex: this.mixerIndex,
            mixerOnline: false,
        })

        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex

        this.watchdog = new VMixConnectionWatchdog(
            () => {
                logger.warn(
                    `VMix XML not received in time, closing feedback connection`
                )
                this.vMixFeedbackConnection['_socket'].destroy() // this will trigger reconnect
            },
            CONNECTION_WATCHDOG_TIMEOUT_MS // If no XML received within this amount, reconnect the feedback connection
        )

        this.poller = new VMixPoller(
            () => {
                this.vMixFeedbackConnection.send('XML')
            },
            () => this.vMixFeedbackConnection.connected(),
            () => {
                logger.warn(
                    `VMix XML not received in time, using fallback poll`
                )
            },
            DEFAULT_POLL_INTERVAL_MS,
            DEFAULT_MIN_POLL_INTERVAL_MS,
            FALLBACK_POLL_INTERVAL_MS
        )

        //If default store has been recreated multiple mixers are not created
        if (!state.channels[0].chMixerConnection[this.mixerIndex]) {
            state.channels[0].chMixerConnection[this.mixerIndex] = {
                channel: [],
            }
        }

        this.vMixCommandConnection = new ConnectionTCP(
            state.settings[0].mixers[this.mixerIndex].deviceIp,
            {
                port: parseInt(
                    state.settings[0].mixers[this.mixerIndex].devicePort + ''
                ),
                debug: true,
            }
        )
        this.vMixFeedbackConnection = new ConnectionTCP(
            state.settings[0].mixers[this.mixerIndex].deviceIp,
            {
                port: parseInt(
                    state.settings[0].mixers[this.mixerIndex].devicePort + ''
                ),
            }
        )
        this.setupMixerConnection()
    }

    private setMixerOnlineState(onLineState: boolean) {
        store.dispatch({
            type: SettingsActionTypes.SET_MIXER_ONLINE,
            mixerIndex: this.mixerIndex,
            mixerOnline: onLineState,
        })

        global.mainThreadHandler.updateMixerOnline(this.mixerIndex, onLineState)
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

    private onReceivedFirstState() {
        this.setMixerOnlineState(true)
        global.mainThreadHandler.updateFullClientStore()
        this.awaitingFirstXml = false
    }

    private setupMixerConnection() {
        this.vMixCommandConnection.on('connect', () => {
            logger.info('VMix command connection established')
            logger.info('Receiving state of desk')
            this.sendInitialCommands()
            this.awaitingFirstXml = true
            // we don't yet set the mixer as online because we want to do that after receiving the initial XML state
        })
        this.vMixCommandConnection.on('error', (error: any) => {
            global.mainThreadHandler.updateFullClientStore()
            logger.error(error)
        })
        this.vMixCommandConnection.on('close', () => {
            this.setMixerOnlineState(false)
            logger.warn('VMix command connection lost')
        })

        logger.info(
            `OSC listening on port ${
                state.settings[0].mixers[this.mixerIndex].localOscPort
            }`
        )

        this.vMixFeedbackConnection.on('xml', (xml: string) => {
            if (this.awaitingFirstXml) {
                this.onReceivedFirstState()
            }
            try {
                this.handleXml(xml)
            } catch (e) {
                logger.error(e)
            }
            // Restart watchdog and schedule next poll
            this.watchdog.start()
            this.poller.onResponseReceived()
        })

        this.vMixFeedbackConnection.on('connect', () => {
            logger.info('VMix feedback connection established')
            // deferring it so that the connection is fully ready (it processes events itself AFTER it emits them to subscribers)
            setImmediate(() => {
                this.poller.start()
                this.watchdog.start()
            })
        })
        this.vMixFeedbackConnection.on('error', (error: any) => {
            logger.error(error)
        })
        this.vMixFeedbackConnection.on('close', () => {
            this.poller.stop()
            this.watchdog.stop()
            logger.warn('VMix feedback connection lost')
        })
    }

    private get masterChannelTypeIndex(): number {
        return this.mixerProtocol.channelTypes.findIndex(
            (ct) => ct.channelTypeName === 'MASTER'
        )
    }

    private isMasterChannel(channelIndex: number): boolean {
        const masterIndex = this.masterChannelTypeIndex
        if (masterIndex === -1) return false
        return (
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]?.channelType === masterIndex
        )
    }

    private sendMasterMessage(vMixMessage: string, value?: string | number) {
        if (state.settings[0].mixers[this.mixerIndex].mixerOnline) {
            logger.trace(`send master ${vMixMessage} Value=${value}`)
            this.vMixCommandConnection.send({
                Function: vMixMessage,
                Value: value,
            })
        }
    }

    private handleXml(xml: string) {
        const doc = XmlApi.DataParser.parse(xml)
        const inputs = XmlApi.Inputs.extractInputsFromXML(doc)

        const mappedInputs: Array<VMixInput> = inputs.flatMap(
            this.xmlElementToInput
        )

        mappedInputs.forEach(this.updateInputState)

        this.lastState = mappedInputs

        try {
            const master = XmlApi.AudioBusses.master(doc)
            this.handleMasterState(master)
        } catch (_e) {
            // master bus not present in this XML - ignore
        }
    }

    private handleMasterState(master: MasterAudioBus) {
        if (!master) return

        const volume = Math.pow(master.volume / 100, 0.25)
        const muted = master.muted
        const meterF1 =
            (9.555 * Math.log(master.audioMeter.left || 0)) / Math.log(3)
        const meterF2 =
            (9.555 * Math.log(master.audioMeter.right || 0)) / Math.log(3)

        const channels =
            state.channels[0].chMixerConnection[this.mixerIndex].channel
        for (
            let channelIndex = 0;
            channelIndex < channels.length;
            channelIndex++
        ) {
            if (
                !channels[channelIndex] ||
                channels[channelIndex].channelType !==
                    this.masterChannelTypeIndex
            )
                continue

            const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
            if (
                assignedFaderIndex === -1 ||
                !state.faders[0].fader[assignedFaderIndex]
            )
                continue

            const { outputLevel, fadeActive } = channels[channelIndex]
            const { muteOn, pgmOn, voOn } =
                state.faders[0].fader[assignedFaderIndex]
            let sendUpdate = false

            const dispatchAndSetUpdateState = (
                update: FaderActions | ChannelActions
            ) => {
                store.dispatch(update)
                sendUpdate = true
            }

            // Send VU levels
            sendVuLevel(
                assignedFaderIndex,
                VuType.Channel,
                0,
                dbToFloat(meterF1 + 12)
            )
            sendVuLevel(
                assignedFaderIndex,
                VuType.Channel,
                1,
                dbToFloat(meterF2 + 12)
            )

            // Volume feedback from vMix
            if (
                !muted &&
                !fadeActive &&
                outputLevel > 0 &&
                volume !== this.lastMasterState?.volume &&
                Math.abs(outputLevel - volume) > 0.01
            ) {
                dispatchAndSetUpdateState({
                    type: FaderActionTypes.SET_FADER_LEVEL,
                    faderIndex: assignedFaderIndex,
                    level: volume,
                })
                dispatchAndSetUpdateState({
                    type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                    channel: assignedFaderIndex,
                    mixerIndex: this.mixerIndex,
                    level: volume,
                })
            }

            // Mute feedback from vMix
            if (muted !== this.lastMasterState?.muted && muteOn !== muted) {
                dispatchAndSetUpdateState({
                    type: FaderActionTypes.SET_MUTE,
                    faderIndex: assignedFaderIndex,
                    muteOn: muted,
                })
            }

            if (
                muted !== this.lastMasterState?.muted &&
                !muted &&
                !fadeActive &&
                !pgmOn &&
                !voOn
            ) {
                dispatchAndSetUpdateState({
                    type: FaderActionTypes.SET_PGM,
                    faderIndex: assignedFaderIndex,
                    pgmOn: true,
                })
                dispatchAndSetUpdateState({
                    type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                    channel: assignedFaderIndex,
                    mixerIndex: this.mixerIndex,
                    level: volume,
                })
            }

            if (muted !== this.lastMasterState?.muted && muted) {
                if (pgmOn) {
                    dispatchAndSetUpdateState({
                        type: FaderActionTypes.SET_PGM,
                        faderIndex: assignedFaderIndex,
                        pgmOn: false,
                    })
                }
                if (voOn) {
                    dispatchAndSetUpdateState({
                        type: FaderActionTypes.SET_VO,
                        faderIndex: assignedFaderIndex,
                        voOn: false,
                    })
                }
            }

            if (sendUpdate) {
                global.mainThreadHandler.updatePartialStore(channelIndex)
            }
        }

        this.lastMasterState = { volume, muted }
    }

    private xmlElementToInput(input: Element) {
        const d: Record<string, any> = {
            name: input.childNodes[0].nodeValue,
        }

        const attrs = [
            'volume',
            'muted',
            'state',
            'meterF1',
            'meterF2',
            'number',
            'gainDb',
            'solo',
        ]
        Object.values(input.attributes)
            .filter((attr: Attr) => attrs.includes(attr.name))
            .forEach((attr: Attr) => {
                d[attr.name] = attr.value
            })

        d.volume = Math.pow(parseFloat(d.volume || '0') / 100, 0.25)
        d.meterF1 = (9.555 * Math.log(d.meterF1 || 0)) / Math.log(3)
        d.meterF2 = (9.555 * Math.log(d.meterF2 || 0)) / Math.log(3)
        d.muted = d.muted ? d.muted === 'True' : true
        d.solo = d.solo === 'True'
        d.gainDb = parseFloat(d.gainDb || '0') / 24
        d.number = Number(d.number)

        return d
    }

    private updateInputState(input: VMixInput, channelIndex: number) {
        const lastInputState = this.lastState?.[channelIndex]
        if (
            !state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        )
            return

        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (!state.faders[0].fader[assignedFaderIndex]) {
            return
        }
        if ('number' in input) {
            this.sendVuLevels(assignedFaderIndex, channelIndex, input)
        }

        // If vMix has more channels than Sisyfos is configured to handle,
        // then do nothing with those additional channels.
        if (!this.doesChannelExists(channelIndex)) {
            return
        }

        const { outputLevel, fadeActive } =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        const { inputGain, muteOn, pflOn, pgmOn, voOn } =
            state.faders[0].fader[assignedFaderIndex]
        let sendUpdate = false

        const dispatchAndSetUpdateState = (
            update: FaderActions | ChannelActions | SettingsActions
        ) => {
            store.dispatch(update)
            sendUpdate = true
        }

        if ('muted' in input) {
            if (input.muted === false) {
                if (
                    !fadeActive &&
                    outputLevel > 0 &&
                    input.volume !== lastInputState?.volume &&
                    Math.abs(outputLevel - input.volume) > 0.01
                ) {
                    dispatchAndSetUpdateState({
                        type: FaderActionTypes.SET_FADER_LEVEL,
                        faderIndex: assignedFaderIndex,
                        level: input.volume,
                    })
                    dispatchAndSetUpdateState({
                        type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                        channel: assignedFaderIndex,
                        mixerIndex: this.mixerIndex,
                        level: voOn
                            ? input.volume / (state.settings[0].voLevel / 100)
                            : input.volume,
                    })
                }
                if (input.muted !== lastInputState?.muted && muteOn) {
                    dispatchAndSetUpdateState({
                        type: FaderActionTypes.SET_MUTE,
                        faderIndex: assignedFaderIndex,
                        muteOn: false,
                    })
                }
                if (
                    input.muted !== lastInputState?.muted &&
                    !fadeActive &&
                    !pgmOn &&
                    !voOn
                ) {
                    dispatchAndSetUpdateState({
                        type: FaderActionTypes.SET_PGM,
                        faderIndex: assignedFaderIndex,
                        pgmOn: true,
                    })
                    dispatchAndSetUpdateState({
                        type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                        channel: assignedFaderIndex,
                        mixerIndex: this.mixerIndex,
                        level: input.volume,
                    })
                }
            } else if (input.muted !== lastInputState?.muted && !muteOn) {
                if (pgmOn) {
                    dispatchAndSetUpdateState({
                        type: FaderActionTypes.SET_PGM,
                        faderIndex: assignedFaderIndex,
                        pgmOn: false,
                    })
                }
                if (voOn) {
                    dispatchAndSetUpdateState({
                        type: FaderActionTypes.SET_VO,
                        faderIndex: assignedFaderIndex,
                        voOn: false,
                    })
                }
            }

            if (
                input.gainDb !== lastInputState?.gainDb &&
                inputGain !== input.gainDb
            ) {
                dispatchAndSetUpdateState({
                    type: FaderActionTypes.SET_INPUT_GAIN,
                    faderIndex: assignedFaderIndex,
                    level: input.gainDb,
                })
            }
            if (input.solo !== lastInputState?.solo && pflOn !== input.solo) {
                dispatchAndSetUpdateState({
                    type: FaderActionTypes.SET_PFL,
                    faderIndex: assignedFaderIndex,
                    pflOn: input.solo,
                })
            }
        }

        if (sendUpdate) {
            global.mainThreadHandler.updatePartialStore(channelIndex)
        }
    }

    private sendVuLevels(
        assignedFaderIndex: number,
        channelIndex: number,
        input: VMixInput
    ) {
        const isPaused = (input.state || '').toLowerCase() === 'paused'

        if (state.faders[0].fader[assignedFaderIndex].isLinked) {
            let vuIndex: number = state.faders[0].fader[
                assignedFaderIndex
            ].assignedChannels?.findIndex((assigned) => {
                return (
                    assigned.mixerIndex === this.mixerIndex &&
                    assigned.channelIndex === channelIndex
                )
            })

            // Primary (vuIndex 0) uses meterF1, secondary (vuIndex 1) uses meterF2.
            const level = isPaused
                ? 0
                : vuIndex === 0
                  ? dbToFloat(input.meterF1 + 12)
                  : dbToFloat(input.meterF2 + 12)
            sendVuLevel(assignedFaderIndex, VuType.Channel, vuIndex, level)
        } else {
            sendVuLevel(
                assignedFaderIndex,
                VuType.Channel,
                0,
                isPaused ? 0 : dbToFloat(input.meterF1 + 12)
            ) // add +12 to convert from dBFS
            sendVuLevel(
                assignedFaderIndex,
                VuType.Channel,
                1,
                isPaused ? 0 : dbToFloat(input.meterF2 + 12)
            )
        }
    }

    private sendInitialCommands() {
        this.vMixCommandConnection.send('XML')
    }

    private sendOutMessage(
        vMixMessage: string,
        inputNumber: number,
        value: string | number | undefined
    ) {
        if (state.settings[0].mixers[this.mixerIndex].mixerOnline) {
            logger.trace(
                `send ${vMixMessage} Input=${inputNumber}&Value=${value}`
            )
            this.vMixCommandConnection.send({
                Function: vMixMessage,
                Input: inputNumber,
                Value: value,
            })
        }
    }

    updatePflState(channelIndex: number) {
        // Master output has no PFL/solo
        if (this.isMasterChannel(channelIndex)) return

        const { inputNumber, channelType } = this.getInputLocation(channelIndex)
        let { outputLevel } =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]

        if (state.faders[0].fader[channelIndex].pflOn === true) {
            if (outputLevel === 0) {
                // this.sendOutMessage('AudioOff', channelTypeIndex + 1,  1, '')
                // this.sendOutMessage('SetVolume', channelTypeIndex + 1,  75, '')
            }
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_ON[0]
                    .mixerMessage,
                inputNumber,
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_ON[0]
                    .value
            )
        } else {
            if (outputLevel === 0) {
                // this.sendOutMessage('SetVolume', channelTypeIndex + 1,  0, '')
                // this.sendOutMessage('AudioOn', channelTypeIndex + 1,  1, '')
            }
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_OFF[0]
                    .mixerMessage,
                inputNumber,
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_OFF[0]
                    .value
            )
        }
    }

    updateMuteState(channelIndex: number, muteOn: boolean) {
        if (this.isMasterChannel(channelIndex)) {
            if (muteOn) {
                this.sendMasterMessage('MasterAudioOff')
            } else {
                this.sendMasterMessage('MasterAudioOn')
            }
            return
        }

        const { inputNumber, channelType } = this.getInputLocation(channelIndex)
        const { outputLevel } =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]

        // TODO: perhaps use subchannelNumber to mute individually?

        if (muteOn === true && outputLevel > 0) {
            let mute =
                this.mixerProtocol.channelTypes[channelType].toMixer
                    .CHANNEL_MUTE_ON[0]
            this.sendOutMessage(mute.mixerMessage, inputNumber, mute.value)
        } else if (muteOn === false && outputLevel > 0) {
            let mute =
                this.mixerProtocol.channelTypes[channelType].toMixer
                    .CHANNEL_MUTE_OFF[0]
            this.sendOutMessage(mute.mixerMessage, inputNumber, mute.value)
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
        // Master output has no input gain trim
        if (this.isMasterChannel(channelIndex)) return

        const { inputNumber, channelType } = this.getInputLocation(channelIndex)

        const mixerMessage =
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_INPUT_GAIN[0]
        if (mixerMessage.min !== undefined && mixerMessage.max !== undefined) {
            level =
                mixerMessage.min + (mixerMessage.max - mixerMessage.min) * level
        }
        this.sendOutMessage(
            mixerMessage.mixerMessage,
            inputNumber,
            Math.round(level)
        )
    }

    updateInputSelector(channelIndex: number, inputSelected: number) {
        // Master output has no channel matrix routing
        if (this.isMasterChannel(channelIndex)) return

        const { inputNumber, channelType } = this.getInputLocation(channelIndex)
        const selector =
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_INPUT_SELECTOR[inputSelected - 1]
        if (selector) {
            const { mixerMessage, value } = selector
            this.sendOutMessage(mixerMessage, inputNumber, value)
        } else {
            const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
            const fader = state.faders[0].fader[assignedFaderIndex]
            if (
                fader?.isLinked &&
                fader.assignedChannels &&
                fader.assignedChannels.length > 1
            ) {
                // Linked pair: same inputSelected on both inputs. Primary gets 'L' preset,
                // secondary gets 'R' preset. SetVolumeChannelMixer follows inputSelected.
                const LINKED_PRESETS: Array<'L' | 'R'> = ['L', 'R']
                const ownChannels = fader.assignedChannels.filter(
                    (a) => a.mixerIndex === this.mixerIndex
                )
                ownChannels.forEach((assigned, i) => {
                    const inp = assigned.channelIndex + 1
                    this.hack_rearrangeAudioChannels(
                        inputSelected,
                        inp,
                        LINKED_PRESETS[i]
                    )
                })
            } else {
                // Unlinked secondary must activate rightInput (it carries the right channel
                // of the pair); unlinked primary activates leftInput.
                const isSecondary =
                    fader?.capabilities?.isLinkableSecondary === true
                const isLinkable =
                    fader?.capabilities?.isLinkablePrimary === true ||
                    fader?.capabilities?.isLinkableSecondary === true
                this.hack_rearrangeAudioChannels(
                    inputSelected,
                    inputNumber,
                    undefined,
                    isSecondary,
                    isLinkable
                )
            }
        }
    }

    /**
     * Applies an AudioChannelMatrixPreset and configures SetVolumeChannelMixer levels
     * for a given vMix input.
     *
     * inputSelected encodes the pair: leftInput = bits 8-15, rightInput = bits 16-23.
     * - Linked primary ('L'):   ch leftInput active, 'L' preset applied (mono to Left bus).
     * - Linked secondary ('R'): ch rightInput active, 'R' preset applied (mono to Right bus).
     * - Unlinked linkable:      ch leftInput (primary) or rightInput (secondary) active, 'LR' preset
     *                           routes that one channel to both buses.
     * - Non-linkable:           both leftInput and rightInput active, '{N}L' preset routes each
     *                           to its own bus (stereo — two channels simultaneously).
     *
     * Mix-minus prefix variants (e.g. 'EXT1_L', 'EXT1_LR') are used for return feed inputs.
     */
    private hack_rearrangeAudioChannels(
        inputSelected: number,
        inputNumber: number,
        linkedPreset?: 'L' | 'R',
        isSecondary?: boolean,
        isLinkable?: boolean
    ) {
        const leftInput = (inputSelected >> 8) & 0xff
        const rightInput = (inputSelected >> 16) & 0xff

        const returnFeedNumber = this.getReturnFeedNumber(inputNumber)
        const prefix =
            state.settings[0].mixers[this.mixerIndex].channelMatrixPrefix ||
            this.mixerProtocol.channelMatrixPrefix
        const lrPresetName = this.mixerProtocol.lrPreset

        const { activeChannels, preset } = resolveChannelMatrixPreset({
            leftInput,
            rightInput,
            linkedPreset,
            isSecondary,
            isLinkable,
            lrPresetName,
            prefix,
            returnFeedNumber,
        })

        const volumes = buildChannelMixerVolumes(activeChannels)
        for (const [ch, vol] of Object.entries(volumes)) {
            this.sendOutMessage(`SetVolumeChannelMixer${ch}`, inputNumber, vol)
        }
        this.sendOutMessage(
            `AudioChannelMatrixApplyPreset`,
            inputNumber,
            preset
        )
    }
    /**
     * Checks if the input should use mix-minus presets by looking for the configured prefix in fader labels.
     * Returns the number after the prefix (e.g., "EXT 1" returns 1, "RTN 3" returns 3), or 0 if no match.
     */
    private getReturnFeedNumber(inputNumber: number): number {
        const prefix =
            state.settings[0].mixers[this.mixerIndex].channelMatrixPrefix ||
            this.mixerProtocol.channelMatrixPrefix

        // If no prefix configured, use standard presets
        if (!prefix) return 0

        // Find the fader for this input
        const channelIndex = this.getChannelIndexForInput(inputNumber)
        if (channelIndex === -1) return 0

        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex === -1) return 0

        const fader = state.faders[0].fader[assignedFaderIndex]
        const label = fader.userLabel || fader.label || ''

        // Match prefix + number pattern (e.g., "EXT 1", "RTN 2")
        const match = label.match(new RegExp(`${prefix}\\s+(\\d+)`, 'i'))
        return match ? parseInt(match[1]) : 0
    }

    /**
     * Finds the channel index that corresponds to a given VMix input number
     */
    private getChannelIndexForInput(inputNumber: number): number {
        if (!this.lastState) return -1

        for (
            let channelIndex = 0;
            channelIndex < this.lastState.length;
            channelIndex++
        ) {
            const input = this.lastState[channelIndex]
            if (input && input.number === inputNumber) {
                return channelIndex
            }
        }
        return -1
    }

    updateFx(channelIndex: number, fxParam: FxParam, level: number) {
        return
    }

    updateAuxLevel(channelIndex: number, auxSendIndex: number, level: number) {
        return
    }

    updateFadeIOLevel(channelIndex: number, outputLevel: number) {
        if (this.isMasterChannel(channelIndex)) {
            const scaledVolume = Math.round(100 * outputLevel)
            if (this.lastLevel[channelIndex] === scaledVolume) return
            this.sendMasterMessage('SetMasterVolume', String(scaledVolume))
            this.lastLevel[channelIndex] = scaledVolume
            return
        }

        const { inputNumber } = this.getInputLocation(channelIndex)
        let { muteOn } = state.faders[0].fader[channelIndex]
        outputLevel = Math.round(100 * outputLevel)

        if (this.lastLevel[channelIndex] === outputLevel) {
            return
        }

        this.sendOutMessage('SetVolume', inputNumber, String(outputLevel))
        this.lastLevel[channelIndex] = outputLevel

        if (!muteOn && outputLevel > 0 && !this.audioOn[channelIndex]) {
            this.sendOutMessage('AudioOn', inputNumber, 1)
            this.audioOn[channelIndex] = true
        }

        if (outputLevel < 1 && this.audioOn[channelIndex]) {
            this.sendOutMessage('AudioOff', inputNumber, 1)
            // audio off command is a bit slow...
            setTimeout(() => {
                this.sendOutMessage('SetVolume', inputNumber, 75)
            }, 80)
            // this.sendOutMessage('SetVolume', channelTypeIndex + 1, 75, '')
            this.audioOn[channelIndex] = false
        }
    }

    private getInputLocation(channelIndex: number): VMixInputLocation {
        const { channelType } =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        return {
            inputNumber: channelIndex + 1,
            channelType,
        }
    }

    updateChannelName(channelIndex: number) {
        return true
    }

    loadMixerPreset(presetName: string) {
        let data: Preset = JSON.parse(
            fs.readFileSync(path.resolve(STORAGE_FOLDER, presetName), 'utf8')
        )

        // Zeroth pass: unlink all currently linked faders so that borrowed channels
        // are returned to their original faders before we re-read assignments.
        // Without this, getAssignedFaderIndex() for a secondary input returns the
        // primary fader index (because linking moves the channels there), causing
        // the secondary loop to corrupt the primary's capabilities on every reload.
        state.faders[0].fader.forEach((fader, faderIndex) => {
            if (fader.isLinked && fader.capabilities?.isLinkablePrimary) {
                global.mainThreadHandler.setLink(faderIndex, false)
            }
        })
        const linkPass: number[] = []
        for (const entry of data) {
            for (const inputNumber of entry.inputNumbers) {
                this.lastState.forEach((input, channelIndex) => {
                    if (input.number !== inputNumber) return
                    const assignedFaderIndex =
                        this.getAssignedFaderIndex(channelIndex)
                    if (assignedFaderIndex === -1) return
                    if (entry.resetChannelMatrix) {
                        // inputSelected encodes leftInput=ch1, rightInput=ch2.
                        // Linked primary ('L'):   ch1 active.
                        // Linked secondary ('R'): ch2 active.
                        // Unlinked linkable:      ch1 (primary) or ch2 (secondary) active, LR preset.
                        // Non-linkable:           ch1 + ch2 active, {N}L preset.
                        const inputSelected = (2 << 16) | (1 << 8) // leftInput=1, rightInput=2
                        const positionInEntry =
                            entry.inputNumbers.indexOf(inputNumber)
                        const linkedPreset: 'L' | 'R' | undefined =
                            entry.isLinked
                                ? positionInEntry === 0
                                    ? 'L'
                                    : 'R'
                                : undefined
                        this.hack_rearrangeAudioChannels(
                            inputSelected,
                            inputNumber,
                            linkedPreset,
                            false,
                            entry.isLinkablePrimary === true
                        )
                        store.dispatch({
                            type: FaderActionTypes.SET_INPUT_SELECTOR,
                            faderIndex: assignedFaderIndex,
                            selected: inputSelected,
                        })
                    }
                    if (entry.resetGain) {
                        store.dispatch({
                            type: FaderActionTypes.SET_INPUT_GAIN,
                            faderIndex: assignedFaderIndex,
                            level: 0,
                        })
                    }
                    if (entry.isLinked) {
                        linkPass.push(assignedFaderIndex)
                    }
                    if (entry.isLinkablePrimary) {
                        // Mark this fader as primary. Secondary is always faderIndex+1,
                        // consistent with the assumption made by setLink.
                        store.dispatch({
                            type: FaderActionTypes.SET_CAPABILITY,
                            faderIndex: assignedFaderIndex,
                            capability: 'isLinkablePrimary',
                            enabled: true,
                        })
                        store.dispatch({
                            type: FaderActionTypes.SET_CAPABILITY,
                            faderIndex: assignedFaderIndex,
                            capability: 'isLinkableSecondary',
                            enabled: false,
                        })
                        const secondaryFaderIndex = assignedFaderIndex + 1
                        const totalFaders = state.settings[0].numberOfFaders
                        if (secondaryFaderIndex < totalFaders) {
                            store.dispatch({
                                type: FaderActionTypes.SET_CAPABILITY,
                                faderIndex: secondaryFaderIndex,
                                capability: 'isLinkablePrimary',
                                enabled: false,
                            })
                            store.dispatch({
                                type: FaderActionTypes.SET_CAPABILITY,
                                faderIndex: secondaryFaderIndex,
                                capability: 'isLinkableSecondary',
                                enabled: true,
                            })
                        }
                    }
                    for (const command of entry?.commands ?? []) {
                        this.sendOutMessage(
                            command.name,
                            inputNumber,
                            command.value ?? ''
                        )
                    }
                })
            }
        }
        // Second pass: setLink after all fader state has been fully applied.
        // Only call setLink on primaries — the reducer sets both primary and
        // secondary isLinked when called on the primary. Calling it on a
        // secondary (no isLinkablePrimary capability) would just set isLinked=false.
        for (const faderIndex of linkPass) {
            if (
                state.faders[0].fader[faderIndex]?.capabilities
                    ?.isLinkablePrimary
            ) {
                global.mainThreadHandler.setLink(faderIndex, true)
            }
        }
        global.mainThreadHandler.updateFullClientStore()
    }

    injectCommand(command: string[]) {}

    doesChannelExists(channelNumber: number): boolean {
        return !!state.channels[0].chMixerConnection[this.mixerIndex].channel[
            channelNumber
        ]
    }

    updateAMixState(channelIndex: number, amixOn: boolean) {}

    updateChannelSetting(
        channelIndex: number,
        setting: string,
        value: string
    ) {}
}
