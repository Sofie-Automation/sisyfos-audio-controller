import { EmberClient, Model } from 'emberplus-connection'
import { store, state } from '../../reducers/store'
import { remoteConnections } from '../../mainClasses'
import path from 'path'
import fs from 'fs'

//Utils:
import {
    FxParam,
    MixerProtocol,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import { dbToFloat, floatToDB } from './LawoRubyConnection'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    ChannelReference,
    Fader,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { EmberElement, NumberedTreeNode } from 'emberplus-connection/dist/model'
import { STORAGE_FOLDER } from '../SettingsStorage'
import { MixerConnection } from '.'
import { sendVuLevel } from '../vuServer'
import { VuType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export class LawoMC2Connection implements MixerConnection {
    mixerProtocol: MixerProtocol
    mixerIndex: number
    emberConnection: EmberClient
    deviceRoot: any
    emberNodeObject: Array<any>
    isSubscribedToChannel: Array<boolean> = []
    meteringRef: Record<
        string,
        { faderIndex: number; factor: number; lastUpdated: number }
    > = {}

    constructor(mixerProtocol: MixerProtocol, mixerIndex: number) {
        this.sendOutMessage = this.sendOutMessage.bind(this)

        this.emberNodeObject = new Array(200)
        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex

        this.setupEmberSocket()
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

    private setupEmberSocket() {
        logger.info('Setting up new Ember connection')
        this.emberConnection = new EmberClient(
            state.settings[0].mixers[this.mixerIndex].deviceIp,
            state.settings[0].mixers[this.mixerIndex].devicePort
        )

        this.emberConnection.on('error', (error: any) => {
            if (
                (error.message + '').match(/econnrefused/i) ||
                (error.message + '').match(/disconnected/i)
            ) {
                logger.error('Ember connection not establised')
            } else {
                logger.data(error).error('Ember connection unknown error')
            }
        })
        this.emberConnection.on('disconnected', () => {
            logger.error('Lost Ember connection')

            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: false,
            })
            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)

            this.emberNodeObject = []
            this.isSubscribedToChannel = []
            this.emberConnection.tree = []
        })
        this.emberConnection.on('connected', async () => {
            logger.info('Found Ember connection')

            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: true,
            })
            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)

            try {
                const req = await this.emberConnection.getDirectory(
                    this.emberConnection.tree
                )
                await req.response
                await this.setupMixerConnection()
            } catch (error) {
                logger.error(`Error initiating directory request: ${error}`)
            }
        })
        this.emberConnection.on(
            'streamUpdate',
            (path: string, value: number) => {
                // This log should be removed in production:
                logger.trace(
                    'Stream Update:' + JSON.stringify({ path, value }, null, 2)
                )
                const refTofader = this.meteringRef[path]
                if (refTofader && Date.now() - refTofader.lastUpdated > 100) {
                    this.meteringRef[path].lastUpdated = Date.now()
                    sendVuLevel(
                        refTofader.faderIndex,
                        VuType.Channel,
                        0,
                        dbToFloat(value / refTofader.factor)
                    )
                }
            }
        )
        logger.info('Connecting to Ember')
        this.emberConnection.connect().catch((e) => {
            logger.error(
                `Error when connecting to Ember: ${e}, ${typeof e === 'object' ? e.stack : ''}`
            )
        })
    }

    private async setupMixerConnection() {
        logger.info(
            'Ember connection established - setting up subscription of channels'
        )

        let chNumber: number = 1
        for (const [typeIndex, numberOfChannels] of Object.entries(
            state.settings[0].mixers[this.mixerIndex].numberOfChannelsInType
        )) {
            for (
                let channelTypeIndex = 0;
                channelTypeIndex < numberOfChannels;
                channelTypeIndex++
            ) {
                await this.subscribeToMc2ChannelOnline(
                    chNumber,
                    Number(typeIndex),
                    channelTypeIndex
                )
                chNumber++
            }
        }
    }

    private async setupFaderSubscriptions(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const protocol =
            this.mixerProtocol.channelTypes[Number(typeIndex)]?.fromMixer
        if (!protocol) return

        await this.subscribeFaderLevel(
            chNumber,
            Number(typeIndex),
            channelTypeIndex
        )

        if (protocol.CHANNEL_NAME)
            await this.subscribeChannelName(
                chNumber,
                Number(typeIndex),
                channelTypeIndex
            )

        if (protocol.PFL)
            await this.subscribeChannelPFL(
                chNumber,
                Number(typeIndex),
                channelTypeIndex
            )

        if (protocol.CHANNEL_AMIX)
            await this.subscribeAMix(
                chNumber,
                Number(typeIndex),
                channelTypeIndex
            )

        if (protocol.CHANNEL_INPUT_GAIN)
            await this.subscribeChannelInputGain(
                chNumber,
                Number(typeIndex),
                channelTypeIndex
            )

        if (protocol.CHANNEL_MUTE_ON)
            await this.subscribeChannelMute(
                chNumber,
                Number(typeIndex),
                channelTypeIndex
            )

        if (protocol.CHANNEL_INPUT_SELECTOR) {
            await this.subscribeToMc2InputSelector(
                chNumber,
                Number(typeIndex),
                channelTypeIndex
            )
        }

        if (protocol.CHANNEL_VU) {
            await this.subscribeVUMeter(
                chNumber,
                Number(typeIndex),
                channelTypeIndex
            )
        }
    }

    private async subscribeToMc2ChannelOnline(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const mixerMessage =
            typeIndex === 0
                ? 'Channels.Inputs.${channel}.Fader'
                : 'Channels.Groups.${channel}.Fader'
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                chNumber - 1
            ]
        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)

        if (assignedFaderIndex < 0) return

        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            async (node: Model.NumberedTreeNode<Model.EmberNode>) => {
                if (node.contents.isOnline) {
                    logger.info(`Channel ${chNumber} online`)
                    if (!this.isSubscribedToChannel[chNumber - 1]) {
                        this.isSubscribedToChannel[chNumber - 1] = true
                        await this.setupFaderSubscriptions(
                            chNumber,
                            typeIndex,
                            channelTypeIndex
                        )
                    }
                    store.dispatch({
                        type: FaderActionTypes.SHOW_CHANNEL,
                        faderIndex: assignedFaderIndex,
                        showChannel: true,
                    })
                    global.mainThreadHandler.updatePartialStore(
                        assignedFaderIndex
                    )
                } else {
                    logger.info(`Channel ${chNumber} offline`)
                    store.dispatch({
                        type: FaderActionTypes.SHOW_CHANNEL,
                        faderIndex: assignedFaderIndex,
                        showChannel: false,
                    })
                    global.mainThreadHandler.updatePartialStore(
                        assignedFaderIndex
                    )
                }
            }
        )
    }
    private async subscribeToEmberNode(
        channelTypeIndex: number,
        mixerMessage: string,
        cb: (node: Model.TreeElement<Model.EmberElement>) => void
    ) {
        const channelName = this._insertChannelName(
            mixerMessage,
            String(channelTypeIndex + 1)
        )
        logger.trace(`Subscribe to ${channelName}`)
        try {
            const node = await this.emberConnection.getElementByPath(
                this._insertChannelName(
                    mixerMessage,
                    String(channelTypeIndex + 1)
                )
            )
            if (!node) return

            const subsription = await this.emberConnection.subscribe(
                node as NumberedTreeNode<EmberElement>,
                cb
            )

            await subsription.response
            cb(node)
        } catch (e) {
            logger
                .data(e)
                .error('Error when subscribing to node: ' + channelName)
        }
    }

    private async subscribeFaderLevel(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        let mixerMessage = this._insertChannelName(
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_OUT_GAIN[0].mixerMessage,
            String(channelTypeIndex + 1)
        )

        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            (node) => {
                const parameter = node.contents as Model.Parameter
                const val = (parameter.value as number) / parameter.factor
                const level = this._faderLevelToFloat(val, typeIndex)
                const channel =
                    state.channels[0].chMixerConnection[this.mixerIndex]
                        .channel[chNumber - 1]
                const assignedFaderIndex = this.getAssignedFaderIndex(
                    chNumber - 1
                )

                logger.trace(
                    `Receiving Level from Ch "${chNumber}", val: ${val}, level: ${level}`
                )

                if (!channel.fadeActive && level >= 0 && level <= 1) {
                    store.dispatch({
                        type: FaderActionTypes.SET_FADER_LEVEL,
                        faderIndex: assignedFaderIndex,
                        level: level,
                    })
                    store.dispatch({
                        type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                        channel: assignedFaderIndex,
                        mixerIndex: this.mixerIndex,
                        level: level,
                    })
                    // toggle pgm based on level
                    logger.trace(`Set Channel ${chNumber} pgmOn ${level > 0}`)
                    store.dispatch({
                        type: FaderActionTypes.SET_PGM,
                        faderIndex: assignedFaderIndex,
                        pgmOn: level > 0,
                    })

                    global.mainThreadHandler.updatePartialStore(
                        assignedFaderIndex
                    )
                    if (remoteConnections) {
                        remoteConnections.updateRemoteFaderState(
                            assignedFaderIndex,
                            level
                        )
                    }
                }
            }
        )
        try {
            this.emberNodeObject[chNumber - 1] =
                await this.emberConnection.getElementByPath(mixerMessage)
        } catch (e) {
            logger.error(
                'Error when subscribing to faderlevel: ' + mixerMessage
            )
        }
    }

    private async subscribeChannelName(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const mixerMessage =
            this.mixerProtocol.channelTypes[typeIndex].fromMixer.CHANNEL_NAME[0]
                .mixerMessage
        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)

        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            (node) => {
                let newLabel = ''
                if (node.contents.type === Model.ElementType.Node) {
                    newLabel = node.contents.description
                } else {
                    newLabel = String((node.contents as Model.Parameter).value)
                }
                logger.trace(
                    `Receiving Label from Ch "${chNumber}", val: ${newLabel}`
                )

                // If auto/man is setup to be controlled from the mixer:
                if (state.settings[0].labelControlsIgnoreAutomation) {
                    let faderIndex =
                        state.channels[0].chMixerConnection[this.mixerIndex]
                            .channel[chNumber - 1].assignedFader
                    store.dispatch({
                        type: FaderActionTypes.IGNORE_AUTOMATION,
                        faderIndex: faderIndex,
                        state: newLabel.startsWith(
                            state.settings[0].labelIgnorePrefix
                        ),
                    })
                }

                store.dispatch({
                    type: ChannelActionTypes.SET_CHANNEL_LABEL,
                    mixerIndex: this.mixerIndex,
                    channel: chNumber - 1,
                    label: newLabel,
                })
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            }
        )
    }

    private async subscribeChannelPFL(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const mixerMessage =
            this.mixerProtocol.channelTypes[typeIndex].fromMixer.PFL[0]
                .mixerMessage
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                chNumber - 1
            ]
        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)
        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            (node) => {
                logger.trace(
                    `Receiving PFL from Ch "${chNumber}", val: ${
                        (node.contents as Model.Parameter).value
                    }`
                )
                store.dispatch({
                    type: FaderActionTypes.SET_PFL,
                    faderIndex: assignedFaderIndex,
                    pflOn: (node.contents as Model.Parameter).value as boolean,
                })
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            }
        )
    }

    private async subscribeChannelInputGain(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const mixerMessage =
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_INPUT_GAIN[0].mixerMessage
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                chNumber - 1
            ]
        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)
        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            (node) => {
                logger.trace(
                    `Receiving input gain from Ch "${chNumber}", val: ${
                        (node.contents as Model.Parameter).value
                    }`
                )

                let level = (node.contents as Model.Parameter).value
                if (
                    (node.contents as Model.Parameter).factor &&
                    typeof level === 'number'
                ) {
                    level /= (node.contents as Model.Parameter).factor
                }

                // assume it is in db now
                level = this._faderLevelToFloat(Number(level), 0)
                store.dispatch({
                    type: FaderActionTypes.SET_INPUT_GAIN,
                    faderIndex: assignedFaderIndex,
                    level: level,
                })
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            }
        )
    }

    private async subscribeChannelMute(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const mixerMessage =
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_MUTE_ON[0].mixerMessage
        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)
        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            (node) => {
                logger.trace(
                    `Receiving mute state from Ch "${chNumber}", val: ${
                        (node.contents as Model.Parameter).value
                    }`
                )
                let state = (node.contents as Model.Parameter).value

                if (typeof state !== 'boolean') {
                    state = !!state // do falsy/truthy as best effort implementation
                }

                // assume it is in db now
                store.dispatch({
                    type: FaderActionTypes.SET_MUTE,
                    faderIndex: assignedFaderIndex,
                    muteOn: state,
                })
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            }
        )
    }

    private async subscribeToMc2InputSelector(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        // subscription for enabling input selectors
        // Future: Add a CHECK_CAPABILITY feature in mixer protocol.
        const mixerMessage =
            typeIndex === 0
                ? 'Channels.Inputs.${channel}.Channel States.Stereo'
                : 'Channels.Groups.${channel}.Channel States.Stereo'

        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)
        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            (node) => {
                logger.trace(
                    `Update received for ch inp sel capability: ${
                        (node.contents as Model.Parameter).value
                    }`
                )
                store.dispatch({
                    type: FaderActionTypes.SET_CAPABILITY,
                    faderIndex: assignedFaderIndex,
                    capability: 'hasInputSelector',
                    enabled: (node.contents as Model.Parameter)
                        .value as boolean,
                })
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            }
        )
        // subscribe to input selectors
        let llState = false
        let rrState = false

        const updateState = () => {
            if (llState && !rrState) {
                logger.trace(`Input selector state: ll`)
                store.dispatch({
                    type: FaderActionTypes.SET_INPUT_SELECTOR,
                    faderIndex: assignedFaderIndex,
                    selected: 2,
                })
            } else if (rrState && !llState) {
                logger.trace(`Input selector state: rr`)
                store.dispatch({
                    type: FaderActionTypes.SET_INPUT_SELECTOR,
                    faderIndex: assignedFaderIndex,
                    selected: 3,
                })
            } else {
                logger.trace(`Input selector state: lr`)
                store.dispatch({
                    type: FaderActionTypes.SET_INPUT_SELECTOR,
                    faderIndex: assignedFaderIndex,
                    selected: 1,
                })
            }
            global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
        }

        const llMixerMessage =
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_INPUT_SELECTOR[1].mixerMessage
        const rrMixerMessage =
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_INPUT_SELECTOR[2].mixerMessage

        await this.subscribeToEmberNode(
            channelTypeIndex,
            llMixerMessage,
            (node) => {
                logger.trace(
                    `Update received for ch inp sel: ll: ${
                        (node.contents as Model.Parameter).value
                    }`
                )
                llState = (node.contents as Model.Parameter).value as boolean
                updateState()
            }
        )
        await this.subscribeToEmberNode(
            channelTypeIndex,
            rrMixerMessage,
            (node) => {
                logger.trace(
                    `Update received for ch inp sel: rr: ${
                        (node.contents as Model.Parameter).value
                    }`
                )
                rrState = (node.contents as Model.Parameter).value as boolean
                updateState()
            }
        )
    }

    private async subscribeAMix(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)
        const mixerMessage =
            typeIndex === 0
                ? 'Channels.Inputs.${channel}.Automix.Automix Group Assignment'
                : 'Channels.Groups.${channel}.Automix.Automix Group Assignment'
        await this.subscribeToEmberNode(
            channelTypeIndex,
            mixerMessage,
            (node) => {
                logger.trace(
                    `Update received for amix capability: ${
                        (node.contents as Model.Parameter).value
                    }`
                )
                store.dispatch({
                    type: FaderActionTypes.SET_CAPABILITY,
                    faderIndex: assignedFaderIndex,
                    capability: 'hasAMix',
                    enabled:
                        (node.contents as Model.Parameter).value !==
                        ((node.contents as Model.Parameter).maximum || 63), // max is unassigned, max = 63 in firmware 6.4
                })
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            }
        )

        // subscribe to amix
        const aMixMessage =
            this.mixerProtocol.channelTypes[typeIndex].fromMixer.CHANNEL_AMIX[0]
                .mixerMessage
        await this.subscribeToEmberNode(
            channelTypeIndex,
            aMixMessage,
            (node) => {
                logger.trace(
                    `Receiving AMix from Ch "${chNumber}", val: ${
                        (node.contents as Model.Parameter).value
                    }`
                )
                store.dispatch({
                    type: FaderActionTypes.SET_AMIX,
                    faderIndex: assignedFaderIndex,
                    state: (node.contents as Model.Parameter).value as boolean,
                })
                global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
            }
        )
    }
    private async subscribeVUMeter(
        chNumber: number,
        typeIndex: number,
        channelTypeIndex: number
    ) {
        const assignedFaderIndex = this.getAssignedFaderIndex(chNumber - 1)
        const mixerMessage = this._insertChannelName(
            this.mixerProtocol.channelTypes[typeIndex].fromMixer.CHANNEL_VU[0]
                .mixerMessage,
            String(channelTypeIndex + 1)
        )

        try {
            const node =
                await this.emberConnection.getElementByPath(mixerMessage)

            if (
                !node?.contents ||
                node.contents.type !== Model.ElementType.Parameter
            ) {
                logger.error('Invalid node type for VU meter')
                return
            }

            const param = node.contents
            if (!param.streamIdentifier) {
                logger.error('No stream identifier found for VU meter')
                return
            }

            const internalPath = this.emberConnection.getInternalNodePath(node)
            if (!internalPath) return
            this.meteringRef[String(internalPath)] = {
                faderIndex: assignedFaderIndex,
                factor: param.factor,
                lastUpdated: Date.now(),
            }

            logger.info(
                `Setting up subscription for VU : ${mixerMessage} Internal Path : ${internalPath}`
            )
            logger.debug(
                `VU meter parameters: ${JSON.stringify(param, null, 2)}`
            )
            // Subscribe to the parameter - this will also subscribe to its stream
            const subscription = await this.emberConnection.subscribe(
                node as NumberedTreeNode<EmberElement>,
                (node) => {
                    console.log(
                        'This subscription should only update on initialization : ',
                        mixerMessage
                    )
                    console.log(
                        'The rest should be handled by the streamUpdate event'
                    )
                    logger.trace(
                        'VU meter update' +
                            JSON.stringify(node.contents, null, 2)
                    )
                    if (node.contents.type !== Model.ElementType.Parameter)
                        return
                    const value = Number(node.contents.value)
                    if (Number.isNaN(value)) return

                    const factor = param.factor ?? 1

                    sendVuLevel(
                        assignedFaderIndex,
                        VuType.Channel,
                        0,
                        dbToFloat(value / factor)
                    )
                }
            )
            await subscription.response
        } catch (e) {
            logger.error('Error when subscribing to VU meter: ' + mixerMessage)
        }
    }

    private sendOutMessage(
        mixerMessage: string,
        channelIndex: number,
        value: string | number | boolean
    ) {
        let message = this._insertChannelName(
            mixerMessage,
            channelIndex.toString()
        )
        logger.trace('Sending out message : ' + message + ', val: ' + value)

        this.emberConnection
            .getElementByPath(message)
            .then(async (element: any) => {
                if (element?.contents?.factor && typeof value === 'number') {
                    value *= element.contents.factor
                }
                logger.trace(
                    `Sending out message: ${message}\n  val: ${value}\n  typeof: ${typeof value}`
                )
                await (
                    await this.emberConnection.setValue(element, value)
                ).response
            })
            .catch((error: any) => {
                logger.data(error).error('Ember Error')
            })
    }

    private sendOutLevelMessage(channelIndex: number, value: number) {
        logger.trace(`Sending out Level: ${value}\n  To CH: ${channelIndex}`)
        // As the command are already stored in the EmberNodeObject, we just need to send them out
        // on the corresponding channel, without taking the channelIndex into account
        const node = this.emberNodeObject[channelIndex - 1]
        if (!node) return
        if (node.contents.factor) {
            value *= node.contents.factor
        }
        this.emberConnection
            .setValue(this.emberNodeObject[channelIndex - 1], value, false)
            .catch((error: any) => {
                logger.data(error).error('Ember Error')
            })
    }

    updateFadeIOLevel(channelIndex: number, outputLevel: number) {
        const level = this._floatToFaderLevel(outputLevel, channelIndex)
        this.sendOutLevelMessage(channelIndex + 1, level)
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

        const faderIndex = this.getAssignedFaderIndex(channelIndex)
        if (state.faders[0].fader[faderIndex].pflOn === true) {
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_ON[0]
                    .mixerMessage,
                channelTypeIndex + 1,
                !!this.mixerProtocol.channelTypes[channelType].toMixer.PFL_ON[0]
                    .value as any
            )
        } else {
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[channelType].toMixer.PFL_OFF[0]
                    .mixerMessage,
                channelTypeIndex + 1,
                !!this.mixerProtocol.channelTypes[channelType].toMixer
                    .PFL_OFF[0].value as any
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

        if (
            !this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_MUTE_ON?.[0]
        )
            return

        this.sendOutMessage(
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_MUTE_ON[0].mixerMessage,
            channelTypeIndex + 1,
            muteOn
        )
    }

    updateNextAux(channelIndex: number, level: number) {
        return true
    }

    updateInputGain(channelIndex: number, gain: number) {
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        let channelType = channel.channelType
        let channelTypeIndex = channel.channelTypeIndex
        let protocol =
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_INPUT_GAIN[0]

        let level = this._floatToFaderLevel(gain, 0)

        // let level = gain * (protocol.max - protocol.min) + protocol.min

        this.sendOutMessage(protocol.mixerMessage, channelTypeIndex + 1, level)
    }
    updateInputSelector(channelIndex: number, inputSelected: number) {
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        let channelType = channel.channelType
        let channelTypeIndex = channel.channelTypeIndex

        logger.debug(`select in ${channelIndex} ${inputSelected}`)

        if (inputSelected === 1) {
            // LR
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_SELECTOR[1].mixerMessage,
                channelTypeIndex + 1,
                false as any
            )
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_SELECTOR[2].mixerMessage,
                channelTypeIndex + 1,
                false as any
            )
        } else if (inputSelected === 2) {
            // LL
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_SELECTOR[1].mixerMessage,
                channelTypeIndex + 1,
                true as any
            )
        } else if (inputSelected === 3) {
            // RR
            this.sendOutMessage(
                this.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_SELECTOR[2].mixerMessage,
                channelTypeIndex + 1,
                true as any
            )
        }

        return true
    }

    updateFx(channelIndex: number, fxParam: FxParam, level: number) {
        return true
    }
    updateAuxLevel(channelIndex: number, auxSendIndex: number, level: number) {
        return true
    }

    updateChannelName(channelIndex: number) {
        let channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelType
        let channelTypeIndex =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelTypeIndex
        const faderIndex = this.getAssignedFaderIndex(channelIndex)

        if (
            faderIndex < 0 ||
            !this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_NAME?.[0]
        )
            return

        let channelName = state.faders[0].fader[faderIndex].label
        // If labelControlsIgnoreAutomation, the mixer should receive the channels label and not the faders
        if (state.settings[0].labelControlsIgnoreAutomation) {
            channelName =
                state.channels[0].chMixerConnection[0].channel[channelIndex]
                    .label
        }
        if (!this.mixerProtocol.channelTypes[channelType].toMixer.CHANNEL_NAME)
            return
        this.sendOutMessage(
            this.mixerProtocol.channelTypes[channelType].toMixer.CHANNEL_NAME[0]
                .mixerMessage,
            channelTypeIndex + 1,
            channelName
        )
    }

    updateAMixState(channelIndex: number, amixOn: boolean) {
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        let channelType = channel.channelType
        let channelTypeIndex = channel.channelTypeIndex
        let protocol =
            this.mixerProtocol.channelTypes[channelType].toMixer.CHANNEL_AMIX[0]

        this.sendOutMessage(protocol.mixerMessage, channelTypeIndex + 1, amixOn)
    }

    async loadMixerPreset(presetName: string) {
        logger.info(`Loading preset: ${presetName}`)
        let data = JSON.parse(
            fs.readFileSync(path.resolve(STORAGE_FOLDER, presetName)).toString()
        )

        const loadFunction = await this.emberConnection.getElementByPath(
            this.mixerProtocol.loadPresetCommand[0].mixerMessage
        )

        if (loadFunction.contents.type === Model.ElementType.Function) {
            await (
                await this.emberConnection.invoke(
                    loadFunction as any,
                    data.sceneAddress
                )
            ).response
        }
    }

    injectCommand(command: string[]) {}

    updateChannelSetting(
        channelIndex: number,
        setting: string,
        value: string
    ) {}

    private _insertChannelName(command: string, channel: string | number) {
        const pad = (inp: string | number, l: number) =>
            ('   ' + inp).substr(-l)

        const channelName = '_' + Number(channel).toString(16) // 'INP ' + pad(channel, 3)
        return command.replace('${channel}', channelName)
    }

    private _floatToFaderLevel(value: number, typeIndex: number) {
        return floatToDB(value)
    }

    private _faderLevelToFloat(value: number, typeIndex: number) {
        return dbToFloat(value)
    }
}
