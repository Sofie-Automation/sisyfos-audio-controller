import { WebSocket } from 'ws'
import { store, state } from '../../reducers/store'
import { remoteConnections } from '../../mainClasses'

//Utils:
import {
    FxParam,
    MixerProtocol,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from '../logger'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerConnection } from '.'
import { EventEmitter } from 'stream'
import { addAbortListener } from 'events'
import { sendVuLevel } from '../vuServer'
import { VuType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import _ from 'lodash'
import {
    INITIALIZE_COMMANDS_FADER_SOURCE_ID,
    INITIALIZE_COMMANDS_FADERS,
    INITIALIZE_COMMANDS_SOURCE_LIST,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export class DHDMixerConnection implements MixerConnection {
    readonly mixerProtocol: MixerProtocol
    readonly mixerIndex: number
    readonly dhdMixerId: string
    readonly dhdConnection: DHDWebSocketClient
    subscriptionAbortController: AbortController | null = null
    readonly sourceIdToFaderId = new Map<number, string>()
    readonly faderOnState = new Map<string, boolean>()
    readonly sisyfosChannelIdToDHDTargets = new Map<
        number,
        {
            faderId: string
            sourceId: number
            sisyfosTypeIndex: number
        }
    >()

    constructor(mixerProtocol: MixerProtocol, mixerIndex: number) {
        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex

        this.dhdMixerId = state.settings[0].mixers[this.mixerIndex].mixerId

        logger.info('Setting up DHD connection')
        this.dhdConnection = new DHDWebSocketClient(
            state.settings[0].mixers[this.mixerIndex].deviceUrl,
            state.settings[0].mixers[this.mixerIndex].deviceToken,
            {
                pingInterval: mixerProtocol.pingTime,
            }
        )

        logger.info('Connecting to DHD via WebSockets')

        this.dhdConnection.addListener('error', (error) => {
            logger.error(`DHDWebSocketClient error: ${error}`)
        })
        this.dhdConnection.addListener('warn', (warn) => {
            logger.error(`Unexpected condition in DHDWebSocketClient: ${warn}`)
        })
        this.dhdConnection.addListener('close', () => {
            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: false,
            })
            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)
        })
        this.dhdConnection.addListener('open', () => {
            logger.info('DHD connection established')

            store.dispatch({
                type: SettingsActionTypes.SET_MIXER_ONLINE,
                mixerIndex: this.mixerIndex,
                mixerOnline: true,
            })
            global.mainThreadHandler.updateMixerOnline(this.mixerIndex)

            this.subscriptionAbortController = new AbortController()

            this.setupMixerConnection(
                this.subscriptionAbortController.signal
            ).catch((err) => {
                logger.error(
                    `Error trying to set up the mixer connection: ${err}`
                )
            })
        })
    }

    private fillAddress(address: string, faderId?: string) {
        let result = address.replaceAll('{mixerID}', this.dhdMixerId)
        if (faderId) {
            result = result.replaceAll('{faderID}', faderId)
        }

        return result
    }

    private async setupMixerConnection(signal: AbortSignal) {
        this.sourceIdToFaderId.clear()
        this.sisyfosChannelIdToDHDTargets.clear()
        const [fadersGetResult, sourcesGetResult] = await Promise.all([
            this.dhdConnection.getAttribute<
                Record<
                    string,
                    {
                        sourceid: number
                        label: string
                        fader: number
                    }
                >
            >(
                this.fillAddress(
                    this.mixerProtocol.initializeCommands[
                        INITIALIZE_COMMANDS_FADERS
                    ].mixerMessage
                )
            ),
            this.dhdConnection.getAttribute<
                Array<{
                    _sourceid: number
                    _label: string
                }>
            >(
                this.fillAddress(
                    this.mixerProtocol.initializeCommands[
                        INITIALIZE_COMMANDS_SOURCE_LIST
                    ].mixerMessage
                )
            ),
        ])
        for (const [faderId, faderObj] of Object.entries<{
            sourceid: number
            label: string
            fader: number
        }>(fadersGetResult)) {
            this.sourceIdToFaderId.set(faderObj.sourceid, faderId)
        }

        logger.trace(
            `DHD mixer has ${Object.keys(fadersGetResult).length} faders available`
        )

        const sortedSources = sourcesGetResult.sort(
            (a, b) => a._sourceid - b._sourceid
        )
        logger.trace(`DHD mixer has ${sortedSources.length} sources available`)

        // Set channel labels
        let globalChIndex = 0
        state.settings[0].mixers[
            this.mixerIndex
        ].numberOfChannelsInType.forEach(
            async (numberOfChannels, typeIndex) => {
                for (
                    let channelTypeIndex = 0;
                    channelTypeIndex < numberOfChannels;
                    channelTypeIndex++
                ) {
                    const sourceId = sortedSources[channelTypeIndex]?._sourceid
                    const faderId = this.sourceIdToFaderId.get(sourceId)
                    const faderObj = fadersGetResult[faderId]
                    const isSourceOnFader = faderId !== undefined
                    const label =
                        faderObj?.label ??
                        sortedSources[channelTypeIndex]?._label
                    if (sourceId !== undefined) {
                        // enable
                        this.sisyfosChannelIdToDHDTargets.set(globalChIndex, {
                            sourceId,
                            faderId,
                            sisyfosTypeIndex: typeIndex,
                        })
                        logger.trace(
                            `Source ${sourceId} is at DHD fader ${faderId}, Sisyfos Ch ${globalChIndex}`
                        )
                        store.dispatch({
                            type: ChannelActionTypes.SET_CHANNEL_LABEL,
                            mixerIndex: this.mixerIndex,
                            channel: globalChIndex,
                            label: label,
                        })
                        store.dispatch({
                            type: FaderActionTypes.SET_CHANNEL_DISABLED,
                            faderIndex: globalChIndex,
                            disabled: isSourceOnFader ? false : true,
                        })
                        store.dispatch({
                            type: FaderActionTypes.SHOW_CHANNEL,
                            faderIndex: globalChIndex,
                            showChannel: true,
                        })
                        if (!isSourceOnFader) {
                            store.dispatch({
                                type: FaderActionTypes.SET_FADER_LEVEL,
                                faderIndex: globalChIndex,
                                level: this.mixerProtocol.fader.zero,
                            })
                            store.dispatch({
                                type: FaderActionTypes.SET_PGM,
                                faderIndex: globalChIndex,
                                pgmOn: false,
                            })
                        }
                    } else {
                        // disable
                        this.sisyfosChannelIdToDHDTargets.delete(globalChIndex)
                        store.dispatch({
                            type: FaderActionTypes.SET_CHANNEL_DISABLED,
                            faderIndex: globalChIndex,
                            disabled: true,
                        })
                        store.dispatch({
                            type: ChannelActionTypes.SET_CHANNEL_LABEL,
                            mixerIndex: this.mixerIndex,
                            channel: globalChIndex,
                            label: '',
                        })
                        store.dispatch({
                            type: FaderActionTypes.SHOW_CHANNEL,
                            faderIndex: globalChIndex,
                            showChannel: false,
                        })
                    }
                    globalChIndex++
                }
            }
        )

        global.mainThreadHandler.updateFullClientStore()

        await Promise.all(
            this.sisyfosChannelIdToDHDTargets
                .entries()
                .map(async ([sisyfosChannelIndex, targets]) => {
                    logger.debug(
                        `Running subscriptions for sisyfos channel: ${sisyfosChannelIndex} (fader: ${targets.faderId}, sourceid: ${targets.sourceId})`
                    )
                    if (targets.faderId === undefined) return

                    try {
                        await Promise.all([
                            this.subscribeFaderOnState(
                                targets.faderId,
                                targets.sisyfosTypeIndex,
                                sisyfosChannelIndex,
                                signal
                            ),
                            this.subscribeFaderLevel(
                                targets.faderId,
                                targets.sisyfosTypeIndex,
                                sisyfosChannelIndex,
                                signal
                            ),
                            this.subscribeGainLevel(
                                targets.faderId,
                                targets.sisyfosTypeIndex,
                                sisyfosChannelIndex,
                                signal
                            ),
                            this.subscribeVUMeter(
                                targets.faderId,
                                targets.sisyfosTypeIndex,
                                sisyfosChannelIndex,
                                signal
                            ),
                            this.subscribeSourceId(
                                targets.faderId,
                                targets.sourceId,
                                signal
                            ),
                        ])
                    } catch (e) {
                        logger
                            .data(e)
                            .error(
                                `error during subscriptions of parameters for ${targets.faderId}`
                            )
                    }
                })
        )
    }

    private async subscribeFaderOnState(
        faderId: string,
        typeIndex: number,
        sisyfosChannelId: number,
        signal: AbortSignal
    ) {
        const command = this.fillAddress(
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_MUTE_ON[0].mixerMessage,
            faderId
        )

        try {
            await this.dhdConnection.subscribeToPath<boolean>(
                command,
                (value) => {
                    logger.trace(
                        `Receiving On state from ${command} Ch ${sisyfosChannelId}: ${value}`
                    )

                    const faderOn = Boolean(value)
                    if (faderOn === undefined) {
                        logger.error(
                            `On state (at ${command}) is not a boolean: ${faderOn} (${JSON.stringify(value)})`
                        )
                    }

                    if (
                        !state.channels[0].chMixerConnection[this.mixerIndex]
                            .channel[sisyfosChannelId].fadeActive
                    ) {
                        const isPgm = faderOn

                        // toggle pgm based on level
                        logger.trace(
                            `Set Ch ${sisyfosChannelId} pgmOn from ${command} state ${faderOn}`
                        )
                        store.dispatch({
                            type: FaderActionTypes.SET_PGM,
                            faderIndex: sisyfosChannelId,
                            pgmOn: isPgm,
                        })

                        this.faderOnState.set(faderId, isPgm)

                        global.mainThreadHandler.updatePartialStore(
                            sisyfosChannelId
                        )
                        if (remoteConnections) {
                            remoteConnections.updateRemotePgmPstPfl(
                                sisyfosChannelId
                            )
                        }
                    }
                },
                signal
            )
        } catch (e) {
            logger.error(`Could not subscribe to ${command}: ${e}`)
        }
    }

    private async subscribeFaderLevel(
        faderId: string,
        typeIndex: number,
        sisyfosChannelId: number,
        signal: AbortSignal
    ) {
        const command = this.fillAddress(
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_OUT_GAIN[0].mixerMessage,
            faderId
        )

        try {
            await this.dhdConnection.subscribeToPath<number>(
                command,
                (value) => {
                    logger.trace(
                        `Receiving Level from ${command} Ch ${sisyfosChannelId}: ${value}`
                    )

                    const level = Number(value)
                    if (!Number.isFinite(level)) {
                        logger.error(
                            `Level value (at ${command}) is not a finite number: ${level} (${JSON.stringify(value)})`
                        )
                    }

                    if (
                        !state.channels[0].chMixerConnection[this.mixerIndex]
                            .channel[sisyfosChannelId].fadeActive &&
                        level >=
                            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                                .CHANNEL_OUT_GAIN[0].min
                    ) {
                        const isOn = this.faderOnState.get(faderId) ?? false

                        // update the fader always
                        store.dispatch({
                            type: FaderActionTypes.SET_FADER_LEVEL,
                            faderIndex: sisyfosChannelId,
                            level: dbToFloat(level),
                        })

                        // update the output level if fader is on
                        if (isOn) {
                            store.dispatch({
                                type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                                mixerIndex: this.mixerIndex,
                                channel: sisyfosChannelId,
                                level: dbToFloat(level),
                            })
                        }

                        global.mainThreadHandler.updatePartialStore(
                            sisyfosChannelId
                        )
                        if (remoteConnections) {
                            remoteConnections.updateRemoteFaderState(
                                sisyfosChannelId,
                                level
                            )
                        }
                    }
                },
                signal
            )
        } catch (e) {
            logger.error(`Could not subscribe to ${command}: ${e}`)
        }
    }

    private async subscribeGainLevel(
        faderId: string,
        typeIndex: number,
        sisyfosChannelId: number,
        signal: AbortSignal
    ) {
        const command = this.fillAddress(
            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                .CHANNEL_INPUT_GAIN[0].mixerMessage,
            faderId
        )

        try {
            await this.dhdConnection.subscribeToPath<number>(
                command,
                (value) => {
                    logger.trace(
                        `Receiving Level from ${command} Ch ${sisyfosChannelId}: ${value}`
                    )

                    const level = Number(value)
                    if (!Number.isFinite(level)) {
                        logger.error(
                            `Level value (at ${command}) is not a finite number: ${level} (${JSON.stringify(value)})`
                        )
                    }

                    if (
                        level >=
                        this.mixerProtocol.channelTypes[typeIndex].fromMixer
                            .CHANNEL_INPUT_GAIN[0].min
                    ) {
                        store.dispatch({
                            type: FaderActionTypes.SET_INPUT_GAIN,
                            faderIndex: sisyfosChannelId,
                            level: aGainDBToFloat(level),
                        })
                        global.mainThreadHandler.updatePartialStore(
                            sisyfosChannelId
                        )
                    }
                },
                signal
            )
        } catch (e) {
            logger.error(`Could not subscribe to ${command}: ${e}`)
        }
    }

    private async subscribeVUMeter(
        faderId: string,
        typeIndex: number,
        sisyfosChannelId: number,
        signal: AbortSignal
    ) {
        const command = this.fillAddress(
            this.mixerProtocol.channelTypes[typeIndex].fromMixer.CHANNEL_VU[0]
                .mixerMessage,
            faderId
        )

        try {
            await this.dhdConnection.subscribeToPath<number[]>(
                command,
                (values) => {
                    // logger.trace(`Receiving VU meter level from ${command} Ch ${sisyfosChannelId}`)

                    if (!Array.isArray(values)) {
                        logger.error(
                            `Level value (at ${command}) is not an array: (${JSON.stringify(values)})`
                        )
                    }

                    for (let i = 0; i < values.length; i++) {
                        const level = values[i]
                        if (
                            level >=
                            this.mixerProtocol.channelTypes[typeIndex].fromMixer
                                .CHANNEL_VU[0].min
                        ) {
                            sendVuLevel(
                                sisyfosChannelId,
                                VuType.Channel,
                                i,
                                dbToFloat(level)
                            )
                        }
                    }
                },
                signal
            )
        } catch (e) {
            logger.error(`Could not subscribe to ${command}: ${e}`)
        }
    }

    private async subscribeSourceId(
        faderId: string,
        sourceId: number,
        signal: AbortSignal
    ) {
        const command = this.fillAddress(
            this.mixerProtocol.initializeCommands[
                INITIALIZE_COMMANDS_FADER_SOURCE_ID
            ].mixerMessage,
            faderId
        )

        try {
            await this.dhdConnection.subscribeToPath<number>(
                command,
                (value) => {
                    // logger.trace(`Receiving VU meter level from ${command} Ch ${sisyfosChannelId}`)

                    const newSourceId = Number(value)
                    if (!Number.isFinite(newSourceId)) {
                        logger.error(
                            `sourceid value (at ${command}) is not a finite number: (${JSON.stringify(value)})`
                        )
                    }

                    if (sourceId !== newSourceId) {
                        logger.warn(
                            `Fader ${faderId} has changed source, was: ${sourceId} -> is: ${newSourceId}`
                        )
                        this.refreshFaderMap()
                    }
                },
                signal
            )
        } catch (e) {
            logger.error(`Could not subscribe to ${command}: ${e}`)
        }
    }

    private refreshFaderMap = _.debounce(
        () => {
            logger.debug(`Refreshing and remapping DHD mixer faders`)
            if (this.subscriptionAbortController) {
                this.subscriptionAbortController.abort()
            }
            this.subscriptionAbortController = new AbortController()
            this.setupMixerConnection(
                this.subscriptionAbortController.signal
            ).catch((err) => {
                logger.error(
                    `Error trying to set up the mixer connection: ${err}`
                )
            })
        },
        20,
        {
            trailing: true,
        }
    )

    updateFadeIOLevel(channelIndex: number, outputLevel: number) {
        const channelType =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ].channelType

        const target = this.sisyfosChannelIdToDHDTargets.get(channelIndex)
        if (target?.faderId === undefined) return

        const levelProto =
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_OUT_GAIN[0]
        const levelMixerMessage = this.fillAddress(
            levelProto.mixerMessage,
            target.faderId
        )

        const onProto =
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_MUTE_ON[0]
        const onMixerMessage = this.fillAddress(
            onProto.mixerMessage,
            target.faderId
        )

        const value = floatToDB(outputLevel, levelProto.min)

        const isPgm = value > levelProto.min

        if (isPgm !== this.faderOnState.get(target.faderId)) {
            logger.trace(
                `Sending out on state: ${isPgm} (was: ${this.faderOnState.get(target.faderId)}) to channel ${channelIndex} (faderId: ${target.faderId})`
            )

            this.dhdConnection
                .setAttribute(onMixerMessage, isPgm)
                .then((setIsPgm) => {
                    this.faderOnState.set(target.faderId, setIsPgm)
                })
                .catch((e) => {
                    logger.error(`Could not set attribute: ${e}`)
                })
        }

        logger.trace(
            `Sending out value: ${value} (${outputLevel}) to channel ${channelIndex} (faderId: ${target.faderId})`
        )

        this.dhdConnection.setAttribute(levelMixerMessage, value).catch((e) => {
            logger.error(`Could not set attribute: ${e}`)
        })
    }

    async updatePflState(channelIndex: number) {
        return true
    }

    updateMuteState(channelIndex: number, muteOn: boolean) {
        return true
    }

    updateAMixState(channelIndex: number, amixOn: boolean) {
        return true
    }

    updateNextAux(channelIndex: number, level: number) {
        return true
    }

    updateInputGain(channelIndex: number, gain: number) {
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex].channel[
                channelIndex
            ]
        const channelType = channel.channelType
        const proto =
            this.mixerProtocol.channelTypes[channelType].toMixer
                .CHANNEL_INPUT_GAIN[0]

        const target = this.sisyfosChannelIdToDHDTargets.get(channelIndex)
        if (target?.faderId === undefined) return

        const mixerMessage = this.fillAddress(
            proto.mixerMessage,
            target.faderId
        )

        this.dhdConnection
            .setAttribute(mixerMessage, aGainFloatToDB(gain))
            .catch((e) => {
                logger.error(`Could not set attribute: ${e}`)
            })
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

    injectCommand(command: string[]) {
        return true
    }

    updateChannelSetting(
        channelIndex: number,
        setting: string,
        value: string
    ) {}
}

function floatToDB(f: number, min = -90): number {
    const scale = (-min - 60) / 0.0625 // scale for the bottom of the fader
    if (f >= 0.5) {
        return f * 40 - 30 // max dB value: +10.
    } else if (f >= 0.25) {
        return f * 80 - 50
    } else if (f >= 0.0625) {
        return f * 160 - 70
    } else if (f > 0.0) {
        return f * scale + min // min dB value: -90 or -oo
    } else {
        return -160
    }
}

function dbToFloat(d: number, min = -90): number {
    let f: number
    const scale = (-min - 60) / 0.0625 // scale for the bottom of the fader

    if (d < -60) {
        f = (d + -min) / scale
    } else if (d < -30) {
        f = (d + 70) / 160
    } else if (d < -10) {
        f = (d + 50) / 80
    } else if (d <= 10) {
        f = (d + 30) / 40
    } else {
        f = 1
    }
    return Math.max(0, f)
}

function aGainFloatToDB(f: number): number {
    // the DHD analog gain range is from -30 to 84 dB, with 1 dB steps
    // f = 0.75 must correspond to 0 dB, so we need to scale the fader value accordingly
    if (f >= 0.75) {
        return Math.round(((f - 0.75) * 84) / 0.25) // max dB value: +84.
    } else {
        return Math.round(((f - 0.75) * 30) / 0.75) // min dB value: -30
    }
}

function aGainDBToFloat(d: number): number {
    if (d >= 0) {
        return Math.min(1, (d * 0.25) / 84 + 0.75)
    } else if (d >= -30) {
        return (d * 0.75) / 30 + 0.75
    } else {
        return 0
    }
}

interface DHDMessageBase {
    msgID: number
    // method: "auth" | "set" | "get" | "subscribe" | "unsubscribe" | "event" // "event" is undocumented
}

interface DHDErrResMessage extends DHDMessageBase {
    success: false
    error: string
}

interface DHDSetReqMessage extends DHDMessageBase {
    method: 'set'
    path: string
    payload: any
}

interface DHDSetResMessage extends DHDMessageBase {
    method: 'set'
    path: string
    payload: any
    success: true
}

interface DHDGetReqMessage extends DHDMessageBase {
    method: 'get'
    path: string
}

interface DHDGetResMessage extends DHDMessageBase {
    method: 'get'
    path: string
    payload: any
    success: true
}

interface DHDAuthReqMessage extends DHDMessageBase {
    method: 'auth'
    token: string
}

interface DHDAuthResMessage extends DHDMessageBase {
    method: 'auth'
    token: string
    success: true
}

interface DHDSubscribeReqMessage extends DHDMessageBase {
    method: 'subscribe'
    path: string
}

interface DHDSubscribeResMessage extends DHDMessageBase {
    method: 'subscribe'
    path: string
    success: true
}

interface DHDUpdateMessage {
    method: 'update'
    payload: any
}

interface DHDEventMessage {
    method: 'event'
    payload: unknown
    type: unknown
}

interface DHDUnsubscribeReqMessage extends DHDMessageBase {
    method: 'unsubscribe'
    path: string
}

interface DHDUnsubscribeResMessage extends DHDMessageBase {
    method: 'unsubscribe'
    path: string
    success: true
}

type DHDAnyResMessage =
    | DHDErrResMessage
    | DHDUnsubscribeResMessage
    | DHDSubscribeResMessage
    | DHDAuthResMessage
    | DHDGetResMessage
    | DHDSetResMessage

type DHDIncomingMessage = DHDAnyResMessage | DHDUpdateMessage
type DHDOutgoingMessage =
    | DHDAuthReqMessage
    | DHDSetReqMessage
    | DHDGetReqMessage
    | DHDSubscribeReqMessage
    | DHDUnsubscribeReqMessage
type DHDUntaggedOutgoingMessage = Omit<DHDOutgoingMessage, 'msgID'>

type DHDResponseHandler = (
    err: any,
    res: Readonly<DHDAnyResMessage> | null
) => void
type DHDUpdateHandler<T> = (subTreeValue: Readonly<T>) => void

class DHDWebSocketClient extends EventEmitter<{
    error: [string]
    warn: [string]
    close: []
    open: []
    event: [DHDEventMessage['type'], DHDEventMessage['payload']]
}> {
    private msgIDListeners: Map<number, DHDResponseHandler> = new Map()
    private updateListeners: Map<string, DHDUpdateHandler<unknown>[]> =
        new Map()

    private protocolLastMsgID = 0

    private wsConnection: WebSocket

    private pingInterval: NodeJS.Timeout

    constructor(
        url: string,
        token: string,
        private readonly options?: {
            pingInterval?: number
        }
    ) {
        super()

        this.setupConnection(url, token)
    }

    private setupConnection = (url: string, token: string) => {
        this.wsConnection = new WebSocket(url)

        this.wsConnection.addListener('error', (error: any) => {
            if (
                (error.message + '').match(/econnrefused/i) ||
                (error.message + '').match(/disconnected/i)
            ) {
                this.emit(
                    'error',
                    `WebSockets connection not established: ${error.message}`
                )
            } else {
                this.emit(
                    'error',
                    `WebSockets connection unknown error: ${error}`
                )
            }
        })
        this.wsConnection.addListener('message', this.onMessage)
        this.wsConnection.addListener('close', () => {
            this.emit('close')
            this.msgIDListeners.forEach((handler) => {
                const error = new Error(
                    'Connection closed before response was received'
                )
                handler(error, null)
            })
            if (this.pingInterval !== undefined) {
                clearInterval(this.pingInterval)
            }
        })
        this.wsConnection.addListener('open', () => {
            this.authorize(token)
                .then(() => {
                    if (this.options?.pingInterval) {
                        this.pingInterval = setInterval(() => {
                            this.wsConnection.ping()
                        }, this.options.pingInterval)
                    }
                    this.emit('open')
                })
                .catch((err) => {
                    this.emit('error', `Could not authorize: ${err}`)
                    this.close()
                })
        })
    }

    private getNextMsgID = (): number => {
        const msgID = this.protocolLastMsgID++
        // wrap around the msgID when needed
        if (this.protocolLastMsgID >= Number.MAX_SAFE_INTEGER) {
            this.protocolLastMsgID = Number.MIN_SAFE_INTEGER
        }

        return msgID
    }

    /**
     * Send a message to DHD Mixer with a sequence number as msgID
     * @param message Message to be sent, without the msgID parameter
     * @param onReply A function that will be invoked when a response to this message is received
     * @returns the `msgID` of the sent message
     */
    private sendMessage = (
        message: DHDUntaggedOutgoingMessage,
        onReply?: DHDResponseHandler
    ): number => {
        if (this.wsConnection.readyState !== 1) {
            throw new Error(
                `Connection is in an invalid state for sending messages: ${this.wsConnection.readyState}`
            )
        }

        const taggedMessage = message as DHDOutgoingMessage
        taggedMessage.msgID = this.getNextMsgID()

        if (onReply) {
            this.msgIDListeners.set(taggedMessage.msgID, onReply)
        }

        this.wsConnection.send(JSON.stringify(message))

        return taggedMessage.msgID
    }

    private onResponseMessage = (message: DHDAnyResMessage) => {
        const msgID = message.msgID
        const listener = this.msgIDListeners.get(msgID)
        if (listener) {
            listener(null, message)
        } else {
            this.emit(
                'warn',
                `Message msgID ${msgID} received, but noone is listening: ${JSON.stringify(message)}`
            )
        }
        this.msgIDListeners.delete(msgID)
    }

    private onUpdateMessage = (message: DHDUpdateMessage) => {
        function getValueAtPath(path: string, obj: any) {
            const explodedPath = path.split('/') // the path we have in the Map already has the leading "/" stripped
            let target = obj
            for (let i = 0; i < explodedPath.length; i++) {
                target = target[explodedPath[i]]
                if (target === undefined) return undefined
            }
            return target
        }

        for (const [path, listeners] of this.updateListeners.entries()) {
            const value = getValueAtPath(path, message.payload)
            // the path is not present in the update message, skip
            if (value === undefined) continue

            // only send the sub-tree into the listeners
            for (const listener of listeners) {
                listener(value)
            }
        }
    }

    private onMessage = (data: Buffer | ArrayBuffer | Buffer[]) => {
        try {
            const message = JSON.parse(data.toString('utf-8'))
            if (message.msgID !== undefined) {
                // all responses have a msgID
                this.onResponseMessage(message as DHDAnyResMessage)
            } else if (message.method === 'update') {
                // "update" messages have no msgID
                this.onUpdateMessage(message as DHDUpdateMessage)
            } else if (message.method === 'event') {
                this.emit(`event`, message.payload, message.type)
            } else {
                this.emit(
                    `warn`,
                    `Unknown message received: ${JSON.stringify(message)}`
                )
            }
        } catch {
            this.emit(
                'error',
                `Invalid message received: ${data.toString('utf-8')}`
            )
        }
    }

    private authorize = async (token: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.sendMessage(
                {
                    method: 'auth',
                    token: token,
                } satisfies Omit<
                    DHDAuthReqMessage,
                    'msgID'
                > as DHDUntaggedOutgoingMessage,
                (err, response) => {
                    if (err) {
                        reject(err)
                        return
                    }

                    if (response.success && response.method === 'auth') {
                        resolve()
                    } else {
                        reject(
                            `Invalid response: "${JSON.stringify(response)}"`
                        )
                    }
                }
            )
        })
    }

    public close = async (): Promise<void> => {
        this.msgIDListeners.clear()
        this.updateListeners.clear()
        this.wsConnection.close()
    }

    /**
     * Set the device sub-tree to match a given value
     * @param path
     * @param payload Can be an object or a scalar value if `path` targets a scalar value in the device tree
     * @returns
     */
    public setAttribute = async <T = any>(
        path: string,
        payload: T
    ): Promise<T> => {
        return new Promise((resolve, reject) => {
            this.sendMessage(
                {
                    method: 'set',
                    path: path,
                    payload: payload,
                } satisfies Omit<
                    DHDSetReqMessage,
                    'msgID'
                > as DHDUntaggedOutgoingMessage,
                (err, response) => {
                    if (err) {
                        reject(err)
                        return
                    }

                    if (response.success && response.method === 'set') {
                        resolve(response.payload)
                    } else {
                        reject(
                            `Invalid response: "${JSON.stringify(response)}"`
                        )
                    }
                }
            )
        })
    }

    /**
     * Get the current state of the device sub-tree at a given path
     * @param path
     * @returns Can be an object or a scalar value
     */
    public getAttribute = async <T = any>(path: string): Promise<T> => {
        return new Promise((resolve, reject) => {
            this.sendMessage(
                {
                    method: 'get',
                    path: path,
                } satisfies Omit<
                    DHDGetReqMessage,
                    'msgID'
                > as DHDUntaggedOutgoingMessage,
                (err, response) => {
                    if (err) {
                        reject(err)
                        return
                    }

                    if (response.success && response.method === 'get') {
                        resolve(response.payload)
                    } else {
                        reject(
                            `Invalid response: "${JSON.stringify(response)}"`
                        )
                    }
                }
            )
        })
    }

    /**
     * Subscribe to updates of the device sub-tree
     * @param path
     * @param listener A method that will receive updates
     * @returns An object with a method that will end sending updates to the `listener`
     */
    public subscribeToPath = async <T>(
        path: string,
        listener: DHDUpdateHandler<T>,
        signal: AbortSignal
    ): Promise<void> => {
        if (!path.startsWith('/')) {
            throw new Error(
                `Path needs to start with a "/" character, got "${path}"`
            )
        }

        return new Promise((resolve, reject) => {
            this.sendMessage(
                {
                    method: 'subscribe',
                    path: path,
                } satisfies Omit<
                    DHDSubscribeReqMessage,
                    'msgID'
                > as DHDUntaggedOutgoingMessage,
                (err, response) => {
                    if (err) {
                        reject(err)
                        return
                    }

                    if (response.success && response.method === 'subscribe') {
                        const processedPath = path.substring(1) // strip the leading "/" in the path, we won't be using it for matching the listeners

                        let updateListeners =
                            this.updateListeners.get(processedPath)
                        if (!updateListeners) {
                            updateListeners = []
                            this.updateListeners.set(
                                processedPath,
                                updateListeners
                            )
                        }

                        updateListeners.push(listener)

                        addAbortListener(signal, () => {
                            const filteredListeners = this.updateListeners
                                .get(processedPath)
                                .filter((handler) => handler !== listener)
                            this.updateListeners.set(
                                processedPath,
                                filteredListeners
                            )
                            if (filteredListeners.length === 0) {
                                // There are no more listeners for this path, unsubscribe:
                                this.sendMessage(
                                    {
                                        method: 'unsubscribe',
                                        path: path,
                                    } satisfies Omit<
                                        DHDUnsubscribeReqMessage,
                                        'msgID'
                                    > as DHDUntaggedOutgoingMessage,
                                    (err, response) => {
                                        if (
                                            err ||
                                            !response?.success ||
                                            response?.method !== 'unsubscribe'
                                        ) {
                                            this.emit(
                                                'warn',
                                                `Could not unsubscribe to ${path}: ${JSON.stringify(err ?? response)}`
                                            )
                                        }
                                    }
                                )
                                this.updateListeners.delete(processedPath)
                            }
                        })

                        this.getAttribute<T>(path)
                            .then((value) => {
                                listener(value)
                                resolve()
                            })
                            .catch(() => {})
                    } else {
                        reject(
                            `Invalid response: "${JSON.stringify(response)}"`
                        )
                    }
                }
            )
        })
    }
}
