import fs from 'fs'
import path from 'path'
import WebSocket from 'ws'
import { getSisyfosHost } from './sisyfosHost'
import type {
    ChannelReference,
    Fader,
    MixerProtocolGeneric,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

const SET_MIXER_ONLINE = 'SET_MIXER_ONLINE'
const SET_FADER_LEVEL = 'SET_FADER_LEVEL'
const SET_OUTPUT_LEVEL = 'SET_OUTPUT_LEVEL'
const TOGGLE_PGM = 'TOGGLE_PGM'
const SET_MUTE = 'SET_MUTE'
const SET_PFL = 'SET_PFL'
const SET_AUX_LEVEL = 'SET_AUX_LEVEL'
const SET_CHANNEL_LABEL = 'SET_CHANNEL_LABEL'
const SET_FADER_FX = 'SET_FADER_FX'
const SET_INPUT_GAIN = 'SET_INPUT_GAIN'
const SET_INPUT_SELECTOR = 'SET_INPUT_SELECTOR'
const SET_AMIX = 'SET_AMIX'
const IGNORE_AUTOMATION = 'IGNORE_AUTOMATION'

const DEFAULT_DEVICE_URL = 'ws://localhost:8082'
const INITIAL_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 30000
const VU_TYPE_CHANNEL = 'vuChannel'
const FX_PARAM_COUNT = 22

type SendVuLevel = (
    faderIndex: number,
    type: string,
    channelIndex: number,
    level: number
) => void

let cachedSendVuLevel: SendVuLevel | undefined

interface DeviceMessage {
    type: string
    source?: string
    channel?: number
    level?: number
    mute?: boolean
    pfl?: boolean
    amixOn?: boolean
    name?: string
    fxParam?: number
    selected?: number
    auxIndex?: number
    vuIndex?: number
    presetName?: string
    message?: string
}

interface PresetChannelEntry {
    index: number
    faderLevel?: number
    inputGain?: number
    inputSelector?: number
    mute?: boolean
    pfl?: boolean
    amixOn?: boolean
    nextAuxLevel?: number
    auxLevels?: number[]
    name?: string
    fx?: number[]
}

export class WebSocketMixerConnection {
    readonly mixerProtocol: MixerProtocolGeneric
    readonly mixerIndex: number

    private ws: WebSocket | null = null
    private subscribed = false
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    private pingTimer: ReturnType<typeof setInterval> | null = null
    private reconnectDelayMs = INITIAL_RECONNECT_MS
    private disposed = false

    constructor(mixerProtocol: MixerProtocolGeneric, mixerIndex: number) {
        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex

        const { store, state } = getSisyfosHost().store

        store.dispatch({
            type: SET_MIXER_ONLINE,
            mixerIndex: this.mixerIndex,
            mixerOnline: false,
        })

        if (!state.channels[0].chMixerConnection[this.mixerIndex]) {
            state.channels[0].chMixerConnection[this.mixerIndex] = {
                channel: [],
            }
        }

        this.connect()
    }

    private get deviceUrl(): string {
        const { state } = getSisyfosHost().store
        const url = state.settings[0].mixers[this.mixerIndex]?.deviceUrl
        return url?.trim() || DEFAULT_DEVICE_URL
    }

    private connect(): void {
        if (this.disposed) {
            return
        }

        const { logger } = getSisyfosHost()

        this.clearPingTimer()
        this.subscribed = false

        if (this.ws) {
            this.ws.removeAllListeners()
            if (
                this.ws.readyState === WebSocket.OPEN ||
                this.ws.readyState === WebSocket.CONNECTING
            ) {
                this.ws.close()
            }
            this.ws = null
        }

        logger.info(
            `Mock WebSocket plugin connecting to ${this.deviceUrl} (mixer ${this.mixerIndex})`
        )

        const ws = new WebSocket(this.deviceUrl)
        this.ws = ws

        ws.on('open', () => {
            logger.info(`Mock WebSocket open: ${this.deviceUrl}`)
        })

        ws.on('message', (data) => {
            this.handleMessage(data.toString())
        })

        ws.on('error', (error) => {
            logger.error(`Mock WebSocket error: ${error.message}`)
        })

        ws.on('close', () => {
            this.setMixerOnline(false)
            this.clearPingTimer()
            this.subscribed = false
            logger.info(`Mock WebSocket closed: ${this.deviceUrl}`)
            this.scheduleReconnect()
        })
    }

    private scheduleReconnect(): void {
        if (this.disposed || this.reconnectTimer) {
            return
        }

        const delay = this.reconnectDelayMs
        this.reconnectDelayMs = Math.min(
            this.reconnectDelayMs * 2,
            MAX_RECONNECT_MS
        )

        const { logger } = getSisyfosHost()
        logger.info(`Mock WebSocket reconnect in ${delay}ms`)

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
        }, delay)
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
    }

    private clearPingTimer(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer)
            this.pingTimer = null
        }
    }

    private send(message: Record<string, unknown>): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return
        }
        this.ws.send(JSON.stringify(message))
    }

    private handleMessage(raw: string): void {
        let message: DeviceMessage
        try {
            message = JSON.parse(raw) as DeviceMessage
        } catch {
            getSisyfosHost().logger.error(`Mock WebSocket invalid JSON: ${raw}`)
            return
        }

        switch (message.type) {
            case 'online':
                this.onOnline()
                break
            case 'error':
                getSisyfosHost().logger.error(
                    `Mock device error: ${message.message ?? raw}`
                )
                break
            case 'pong':
            case 'snapshot':
            case 'clientStatus':
                break
            case 'presetLoaded':
                if (message.presetName) {
                    getSisyfosHost().logger.info(
                        `Mock device preset loaded: ${message.presetName}`
                    )
                }
                break
            case 'vuLevel':
                this.handleVuLevel(message)
                break
            default:
                if (message.source === 'hardware') {
                    this.handleHardwareFeedback(message)
                }
                break
        }
    }

    private onOnline(): void {
        this.send({ type: 'subscribe', clientType: 'sisyfos' })
        this.subscribed = true
        this.reconnectDelayMs = INITIAL_RECONNECT_MS
        this.clearReconnectTimer()
        this.pushSisyfosSnapshotToDevice()
        this.setMixerOnline(true)
        global.mainThreadHandler.updateFullClientStore()
        this.startPingTimer()
    }

    private startPingTimer(): void {
        this.clearPingTimer()
        const pingTime = this.mixerProtocol.pingTime ?? 0
        if (pingTime <= 0) {
            return
        }

        this.pingTimer = setInterval(() => {
            this.send({ type: 'ping' })
        }, pingTime)
    }

    private setMixerOnline(online: boolean): void {
        const { store } = getSisyfosHost().store
        store.dispatch({
            type: SET_MIXER_ONLINE,
            mixerIndex: this.mixerIndex,
            mixerOnline: online,
        })
        global.mainThreadHandler.updateMixerOnline(this.mixerIndex, online)
    }

    private getAssignedFaderIndex(channelIndex: number): number {
        const { state } = getSisyfosHost().store
        return state.faders[0].fader.findIndex((fader: Fader) =>
            fader.assignedChannels?.some(
                (assigned: ChannelReference) =>
                    assigned.mixerIndex === this.mixerIndex &&
                    assigned.channelIndex === channelIndex
            )
        )
    }

    private handleVuLevel(message: DeviceMessage): void {
        const channel = message.channel
        if (
            channel === undefined ||
            channel < 0 ||
            typeof message.level !== 'number'
        ) {
            return
        }

        const assignedFaderIndex = this.getAssignedFaderIndex(channel)
        if (assignedFaderIndex < 0) {
            return
        }

        const vuIndex =
            typeof message.vuIndex === 'number' ? message.vuIndex : 0
        getSendVuLevel()(
            assignedFaderIndex,
            VU_TYPE_CHANNEL,
            vuIndex,
            message.level
        )
    }

    private handleHardwareFeedback(message: DeviceMessage): void {
        const channel = message.channel
        if (channel === undefined || channel < 0) {
            return
        }

        switch (message.type) {
            case 'faderLevel':
                if (typeof message.level === 'number') {
                    this.handleHardwareFaderLevel(channel, message.level)
                }
                break
            case 'mute':
                if (typeof message.mute === 'boolean') {
                    this.handleHardwareMute(channel, message.mute)
                }
                break
            case 'pfl':
                if (typeof message.pfl === 'boolean') {
                    this.handleHardwarePfl(channel, message.pfl)
                }
                break
            case 'amixOn':
                if (typeof message.amixOn === 'boolean') {
                    this.handleHardwareAMix(channel, message.amixOn)
                }
                break
            case 'nextAux':
                if (typeof message.level === 'number') {
                    this.handleHardwareNextAux(channel, message.level)
                }
                break
            case 'auxLevel':
                if (
                    typeof message.auxIndex === 'number' &&
                    typeof message.level === 'number'
                ) {
                    this.handleHardwareAuxLevel(
                        channel,
                        message.auxIndex,
                        message.level
                    )
                }
                break
            case 'channelName':
                if (typeof message.name === 'string') {
                    this.handleHardwareChannelName(channel, message.name)
                }
                break
            case 'fx':
                if (
                    typeof message.fxParam === 'number' &&
                    typeof message.level === 'number'
                ) {
                    this.handleHardwareFx(
                        channel,
                        message.fxParam,
                        message.level
                    )
                }
                break
            case 'inputGain':
                if (typeof message.level === 'number') {
                    this.handleHardwareInputGain(channel, message.level)
                }
                break
            case 'inputSelector':
                if (typeof message.selected === 'number') {
                    this.handleHardwareInputSelector(channel, message.selected)
                }
                break
        }
    }

    private handleHardwareInputSelector(
        channelIndex: number,
        selected: number
    ): void {
        const { store } = getSisyfosHost().store
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex < 0) {
            return
        }

        store.dispatch({
            type: SET_INPUT_SELECTOR,
            faderIndex: assignedFaderIndex,
            selected,
        })
        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
    }

    private handleHardwareInputGain(channelIndex: number, level: number): void {
        const { store } = getSisyfosHost().store
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex < 0) {
            return
        }

        store.dispatch({
            type: SET_INPUT_GAIN,
            faderIndex: assignedFaderIndex,
            level,
        })
        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
    }

    private handleHardwareFx(
        channelIndex: number,
        fxParam: number,
        level: number
    ): void {
        const { store } = getSisyfosHost().store
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex < 0) {
            return
        }

        store.dispatch({
            type: SET_FADER_FX,
            faderIndex: assignedFaderIndex,
            fxParam,
            level,
        })
        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
    }

    private handleHardwareFaderLevel(
        channelIndex: number,
        level: number
    ): void {
        const { store, state } = getSisyfosHost().store
        const { mixerGenericConnection, remoteConnections } =
            getSisyfosHost().mainClasses

        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        const channelState =
            state.channels[0].chMixerConnection[this.mixerIndex]?.channel[
                channelIndex
            ]

        if (
            assignedFaderIndex < 0 ||
            !channelState ||
            channelState.fadeActive
        ) {
            return
        }

        const fader = state.faders[0].fader[assignedFaderIndex]
        if (!fader) {
            return
        }

        const autoResetLevel = state.settings[0].autoResetLevel / 100

        if (level > this.mixerProtocol.fader.min || level > autoResetLevel) {
            store.dispatch({
                type: SET_FADER_LEVEL,
                faderIndex: assignedFaderIndex,
                level,
            })
            fader.assignedChannels?.forEach(
                (assignedChannel: ChannelReference) => {
                    if (assignedChannel.mixerIndex === this.mixerIndex) {
                        store.dispatch({
                            type: SET_OUTPUT_LEVEL,
                            mixerIndex: this.mixerIndex,
                            channel: assignedChannel.channelIndex,
                            level,
                        })
                    }
                }
            )
            if (!fader.pgmOn) {
                if (level > this.mixerProtocol.fader.min || level > 0) {
                    store.dispatch({
                        type: TOGGLE_PGM,
                        faderIndex: assignedFaderIndex,
                    })
                }
            }
        } else if (fader.pgmOn || fader.voOn) {
            store.dispatch({
                type: SET_FADER_LEVEL,
                faderIndex: assignedFaderIndex,
                level,
            })
            fader.assignedChannels?.forEach(
                (assignedChannel: ChannelReference) => {
                    if (assignedChannel.mixerIndex === this.mixerIndex) {
                        store.dispatch({
                            type: SET_OUTPUT_LEVEL,
                            mixerIndex: this.mixerIndex,
                            channel: assignedChannel.channelIndex,
                            level,
                        })
                    }
                }
            )
        }

        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
        mixerGenericConnection.updateOutLevel(
            assignedFaderIndex,
            0,
            this.mixerIndex
        )
        if (remoteConnections) {
            remoteConnections.updateRemoteFaderState(assignedFaderIndex, level)
        }
    }

    private handleHardwareMute(channelIndex: number, muteOn: boolean): void {
        const { store } = getSisyfosHost().store
        const { mixerGenericConnection } = getSisyfosHost().mainClasses

        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex < 0) {
            return
        }

        store.dispatch({
            type: SET_MUTE,
            faderIndex: assignedFaderIndex,
            muteOn,
        })
        mixerGenericConnection.updateMuteState(
            assignedFaderIndex,
            this.mixerIndex
        )
        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
    }

    private handleHardwarePfl(channelIndex: number, pflOn: boolean): void {
        const { store } = getSisyfosHost().store
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex < 0) {
            return
        }

        store.dispatch({
            type: SET_PFL,
            faderIndex: assignedFaderIndex,
            pflOn,
        })
        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
    }

    private handleHardwareAMix(channelIndex: number, amixOn: boolean): void {
        const { store } = getSisyfosHost().store
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex < 0) {
            return
        }

        store.dispatch({
            type: SET_AMIX,
            faderIndex: assignedFaderIndex,
            state: amixOn,
        })
        global.mainThreadHandler.updatePartialStore(assignedFaderIndex)
    }

    private handleHardwareNextAux(channelIndex: number, level: number): void {
        const { store, state } = getSisyfosHost().store
        const { remoteConnections } = getSisyfosHost().mainClasses

        const nextSendAux =
            state.settings[0].mixers[this.mixerIndex].nextSendAux
        if (nextSendAux < 0) {
            return
        }

        const auxIndex = nextSendAux - 1
        const channelState =
            state.channels[0].chMixerConnection[this.mixerIndex]?.channel[
                channelIndex
            ]
        if (!channelState || channelState.auxLevel[auxIndex] <= -1) {
            return
        }

        store.dispatch({
            type: SET_AUX_LEVEL,
            mixerIndex: this.mixerIndex,
            channel: channelIndex,
            auxIndex,
            level,
        })
        global.mainThreadHandler.updateFullClientStore()
        if (remoteConnections) {
            remoteConnections.updateRemoteAuxPanels()
        }
    }

    private handleHardwareAuxLevel(
        channelIndex: number,
        auxIndex: number,
        level: number
    ): void {
        const { store, state } = getSisyfosHost().store
        const { remoteConnections } = getSisyfosHost().mainClasses

        const channelState =
            state.channels[0].chMixerConnection[this.mixerIndex]?.channel[
                channelIndex
            ]
        if (!channelState || channelState.auxLevel[auxIndex] <= -1) {
            return
        }

        store.dispatch({
            type: SET_AUX_LEVEL,
            mixerIndex: this.mixerIndex,
            channel: channelIndex,
            auxIndex,
            level,
        })
        global.mainThreadHandler.updateFullClientStore()
        if (remoteConnections) {
            remoteConnections.updateRemoteAuxPanels()
        }
    }

    private handleHardwareChannelName(
        channelIndex: number,
        name: string
    ): void {
        const { store, state } = getSisyfosHost().store

        if (state.settings[0].labelControlsIgnoreAutomation) {
            const faderIndex =
                state.channels[0].chMixerConnection[this.mixerIndex].channel[
                    channelIndex
                ].assignedFader
            store.dispatch({
                type: IGNORE_AUTOMATION,
                faderIndex,
                state: name.startsWith(state.settings[0].labelIgnorePrefix),
            })
        }

        store.dispatch({
            type: SET_CHANNEL_LABEL,
            mixerIndex: this.mixerIndex,
            channel: channelIndex,
            label: name,
        })
        global.mainThreadHandler.updatePartialStore(
            this.getAssignedFaderIndex(channelIndex)
        )
    }

    updateFadeIOLevel(channelIndex: number, outputLevel: number): void {
        this.send({
            type: 'setFaderLevel',
            channel: channelIndex,
            level: outputLevel,
        })
    }

    updateMuteState(channelIndex: number, muteOn: boolean): void {
        this.send({
            type: 'setMute',
            channel: channelIndex,
            mute: muteOn,
        })
    }

    updatePflState(channelIndex: number): void {
        const { state } = getSisyfosHost().store
        const pflOn = state.faders[0].fader[channelIndex]?.pflOn ?? false
        this.send({
            type: 'setPfl',
            channel: channelIndex,
            pfl: pflOn,
        })
    }

    updateNextAux(channelIndex: number, level: number): void {
        this.send({
            type: 'setNextAux',
            channel: channelIndex,
            level,
        })
    }

    updateChannelName(channelIndex: number): void {
        const { state } = getSisyfosHost().store
        let channelName = state.faders[0].fader[channelIndex]?.label ?? ''
        if (state.settings[0].labelControlsIgnoreAutomation) {
            channelName =
                state.channels[0].chMixerConnection[this.mixerIndex].channel[
                    channelIndex
                ]?.label ?? channelName
        }
        this.send({
            type: 'setChannelName',
            channel: channelIndex,
            name: channelName,
        })
    }

    updateFx(channelIndex: number, fxParam: number, level: number): void {
        this.send({
            type: 'setFx',
            channel: channelIndex,
            fxParam,
            level,
        })
    }

    updateInputGain(channelIndex: number, level: number): void {
        this.send({
            type: 'setInputGain',
            channel: channelIndex,
            level,
        })
    }

    updateInputSelector(channelIndex: number, inputSelected: number): void {
        this.send({
            type: 'setInputSelector',
            channel: channelIndex,
            selected: inputSelected,
        })
    }

    updateAMixState(channelIndex: number, aMixOn: boolean): void {
        this.send({
            type: 'setAMix',
            channel: channelIndex,
            amixOn: aMixOn,
        })
    }

    updateAuxLevel(
        channelIndex: number,
        auxSendIndex: number,
        level: number
    ): void {
        this.send({
            type: 'setAuxLevel',
            channel: channelIndex,
            auxIndex: auxSendIndex,
            level,
        })
    }

    loadMixerPreset(presetName: string): void {
        const { logger } = getSisyfosHost()
        logger.info(`Mock WebSocket loading preset: ${presetName}`)

        setImmediate(() => this.applyLoadMixerPreset(presetName, logger))
    }

    private applyLoadMixerPreset(
        presetName: string,
        logger: { info: (msg: string) => void; error: (msg: string) => void }
    ): void {
        let presetPath: string
        try {
            presetPath = this.resolvePresetPath(presetName)
        } catch (error) {
            logger.error(
                `Mock WebSocket preset not found: ${presetName} (${String(error)})`
            )
            return
        }

        let channels: PresetChannelEntry[]
        try {
            const raw = fs.readFileSync(presetPath, 'utf8')
            const parsed = JSON.parse(raw) as { channels?: unknown }
            if (!Array.isArray(parsed.channels)) {
                throw new Error('expected { "channels": [...] }')
            }
            channels = parsed.channels.map((entry, fallbackIndex) =>
                this.normalizePresetChannel(entry, fallbackIndex)
            )
        } catch (error) {
            logger.error(
                `Mock WebSocket invalid preset ${presetName}: ${String(error)}`
            )
            return
        }

        for (const entry of channels) {
            this.applyPresetChannel(entry)
        }

        global.mainThreadHandler.updateFullClientStore()
        logger.info(`Mock WebSocket preset applied: ${presetName}`)
    }

    private resolvePresetPath(presetName: string): string {
        const trimmed = presetName.trim()
        if (!trimmed || trimmed.includes('..') || path.isAbsolute(trimmed)) {
            throw new Error('invalid preset name')
        }

        const storageFolder = this.getSisyfosStorageFolder()
        const candidates = trimmed.toLowerCase().endsWith('.json')
            ? [trimmed]
            : [trimmed, `${trimmed}.json`]

        for (const candidate of candidates) {
            const resolved = path.resolve(storageFolder, candidate)
            if (
                !resolved.startsWith(path.resolve(storageFolder) + path.sep) &&
                resolved !== path.resolve(storageFolder)
            ) {
                continue
            }
            if (fs.existsSync(resolved)) {
                return resolved
            }
        }

        throw new Error(`preset file not found in ${storageFolder}`)
    }

    private getSisyfosStorageFolder(): string {
        const root =
            process.env.SISYFOS_ROOT ?? path.resolve(__dirname, '../..')
        const serverDist = path.join(root, 'server/dist/server/src')
        return require(path.join(serverDist, 'constants/storagePaths'))
            .STORAGE_FOLDER as string
    }

    private normalizePresetChannel(
        entry: unknown,
        fallbackIndex: number
    ): PresetChannelEntry {
        if (!entry || typeof entry !== 'object') {
            throw new Error(`channels[${fallbackIndex}] must be an object`)
        }
        const channel = entry as Record<string, unknown>
        const index =
            typeof channel.index === 'number' ? channel.index : fallbackIndex
        return {
            index,
            faderLevel:
                typeof channel.faderLevel === 'number'
                    ? channel.faderLevel
                    : undefined,
            inputGain:
                typeof channel.inputGain === 'number'
                    ? channel.inputGain
                    : undefined,
            inputSelector:
                typeof channel.inputSelector === 'number'
                    ? channel.inputSelector
                    : undefined,
            mute: typeof channel.mute === 'boolean' ? channel.mute : undefined,
            pfl: typeof channel.pfl === 'boolean' ? channel.pfl : undefined,
            amixOn:
                typeof channel.amixOn === 'boolean'
                    ? channel.amixOn
                    : undefined,
            nextAuxLevel:
                typeof channel.nextAuxLevel === 'number'
                    ? channel.nextAuxLevel
                    : undefined,
            auxLevels: Array.isArray(channel.auxLevels)
                ? channel.auxLevels.filter(
                      (level): level is number => typeof level === 'number'
                  )
                : undefined,
            name: typeof channel.name === 'string' ? channel.name : undefined,
            fx: Array.isArray(channel.fx)
                ? channel.fx.filter(
                      (level): level is number => typeof level === 'number'
                  )
                : undefined,
        }
    }

    private captureSisyfosChannelState(
        channelIndex: number
    ): PresetChannelEntry | null {
        const { state } = getSisyfosHost().store
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)
        if (assignedFaderIndex < 0) {
            return null
        }

        const fader = state.faders[0].fader[assignedFaderIndex]
        const channel =
            state.channels[0].chMixerConnection[this.mixerIndex]?.channel[
                channelIndex
            ]
        if (!fader || !channel) {
            return null
        }

        const fx: number[] = []
        for (let fxParam = 0; fxParam < FX_PARAM_COUNT; fxParam++) {
            fx.push(fader[fxParam]?.[0] ?? 0)
        }

        let nextAuxLevel = 0
        if (fader.pstOn) {
            nextAuxLevel = fader.faderLevel
        } else if (fader.pstVoOn) {
            nextAuxLevel =
                (fader.faderLevel * (100 - state.settings[0].voLevel)) / 100
        }

        const label =
            fader.userLabel ||
            fader.label ||
            channel.label ||
            `CH ${channelIndex + 1}`

        return {
            index: channelIndex,
            faderLevel: channel.outputLevel ?? fader.faderLevel,
            inputGain: fader.inputGain,
            inputSelector: fader.inputSelector,
            mute: fader.muteOn,
            pfl: fader.pflOn,
            amixOn: fader.amixOn,
            nextAuxLevel,
            auxLevels: [...channel.auxLevel],
            name: label,
            fx,
        }
    }

    private pushSisyfosSnapshotToDevice(): void {
        const { state } = getSisyfosHost().store
        const { logger } = getSisyfosHost()
        const channels =
            state.channels[0].chMixerConnection[this.mixerIndex]?.channel

        if (!channels?.length) {
            return
        }

        let pushedChannels = 0
        channels.forEach((_channel, channelIndex) => {
            const entry = this.captureSisyfosChannelState(channelIndex)
            if (!entry) {
                return
            }
            this.pushChannelStateToDevice(entry)
            pushedChannels++
        })

        logger.info(
            `Mock WebSocket pushed Sisyfos snapshot to device (${pushedChannels}/${channels.length} channels)`
        )
    }

    private pushChannelStateToDevice(entry: PresetChannelEntry): void {
        const channelIndex = entry.index

        if (typeof entry.faderLevel === 'number') {
            this.updateFadeIOLevel(channelIndex, entry.faderLevel)
        }

        if (typeof entry.inputGain === 'number') {
            this.updateInputGain(channelIndex, entry.inputGain)
        }

        if (typeof entry.inputSelector === 'number') {
            this.updateInputSelector(channelIndex, entry.inputSelector)
        }

        if (typeof entry.mute === 'boolean') {
            this.updateMuteState(channelIndex, entry.mute)
        }

        if (typeof entry.pfl === 'boolean') {
            this.send({
                type: 'setPfl',
                channel: channelIndex,
                pfl: entry.pfl,
            })
        }

        if (typeof entry.amixOn === 'boolean') {
            this.updateAMixState(channelIndex, entry.amixOn)
        }

        if (typeof entry.nextAuxLevel === 'number') {
            this.updateNextAux(channelIndex, entry.nextAuxLevel)
        }

        if (entry.auxLevels) {
            entry.auxLevels.forEach((level, auxIndex) => {
                if (level <= -1) {
                    return
                }
                this.updateAuxLevel(channelIndex, auxIndex, level)
            })
        }

        if (typeof entry.name === 'string') {
            this.send({
                type: 'setChannelName',
                channel: channelIndex,
                name: entry.name,
            })
        }

        if (entry.fx) {
            entry.fx.forEach((level, fxParam) => {
                this.updateFx(channelIndex, fxParam, level)
            })
        }
    }

    private applyPresetChannel(entry: PresetChannelEntry): void {
        const channelIndex = entry.index
        const { store } = getSisyfosHost().store
        const assignedFaderIndex = this.getAssignedFaderIndex(channelIndex)

        this.pushChannelStateToDevice(entry)

        if (typeof entry.faderLevel === 'number' && assignedFaderIndex >= 0) {
            store.dispatch({
                type: SET_FADER_LEVEL,
                faderIndex: assignedFaderIndex,
                level: entry.faderLevel,
            })
            store.dispatch({
                type: SET_OUTPUT_LEVEL,
                mixerIndex: this.mixerIndex,
                channel: channelIndex,
                level: entry.faderLevel,
            })
        }

        if (typeof entry.inputGain === 'number' && assignedFaderIndex >= 0) {
            store.dispatch({
                type: SET_INPUT_GAIN,
                faderIndex: assignedFaderIndex,
                level: entry.inputGain,
            })
        }

        if (
            typeof entry.inputSelector === 'number' &&
            assignedFaderIndex >= 0
        ) {
            store.dispatch({
                type: SET_INPUT_SELECTOR,
                faderIndex: assignedFaderIndex,
                selected: entry.inputSelector,
            })
        }

        if (typeof entry.mute === 'boolean' && assignedFaderIndex >= 0) {
            store.dispatch({
                type: SET_MUTE,
                faderIndex: assignedFaderIndex,
                muteOn: entry.mute,
            })
        }

        if (typeof entry.pfl === 'boolean' && assignedFaderIndex >= 0) {
            store.dispatch({
                type: SET_PFL,
                faderIndex: assignedFaderIndex,
                pflOn: entry.pfl,
            })
        }

        if (typeof entry.amixOn === 'boolean' && assignedFaderIndex >= 0) {
            store.dispatch({
                type: SET_AMIX,
                faderIndex: assignedFaderIndex,
                state: entry.amixOn,
            })
        }

        if (entry.auxLevels) {
            entry.auxLevels.forEach((level, auxIndex) => {
                store.dispatch({
                    type: SET_AUX_LEVEL,
                    mixerIndex: this.mixerIndex,
                    channel: channelIndex,
                    auxIndex,
                    level,
                })
            })
        }

        if (typeof entry.name === 'string') {
            store.dispatch({
                type: SET_CHANNEL_LABEL,
                mixerIndex: this.mixerIndex,
                channel: channelIndex,
                label: entry.name,
            })
        }

        if (entry.fx && assignedFaderIndex >= 0) {
            entry.fx.forEach((level, fxParam) => {
                store.dispatch({
                    type: SET_FADER_FX,
                    faderIndex: assignedFaderIndex,
                    fxParam,
                    level,
                })
            })
        }
    }

    injectCommand(_command: string[]): void {}
    updateChannelSetting(
        _channelIndex: number,
        _setting: string,
        _value: string
    ): void {}
}

function getSendVuLevel(): SendVuLevel {
    if (cachedSendVuLevel) {
        return cachedSendVuLevel
    }

    const root = process.env.SISYFOS_ROOT ?? path.resolve(__dirname, '../..')
    const serverDist = path.join(root, 'server/dist/server/src')
    cachedSendVuLevel = require(path.join(serverDist, 'utils/vuServer'))
        .sendVuLevel as SendVuLevel
    return cachedSendVuLevel
}
