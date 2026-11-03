'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.WebSocketMixerConnection = void 0
const fs_1 = __importDefault(require('fs'))
const path_1 = __importDefault(require('path'))
const ws_1 = __importDefault(require('ws'))
const sisyfosHost_1 = require('./sisyfosHost')
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
let cachedSendVuLevel
class WebSocketMixerConnection {
    constructor(mixerProtocol, mixerIndex) {
        this.ws = null
        this.subscribed = false
        this.reconnectTimer = null
        this.pingTimer = null
        this.reconnectDelayMs = INITIAL_RECONNECT_MS
        this.disposed = false
        this.mixerProtocol = mixerProtocol
        this.mixerIndex = mixerIndex
        const { store, state } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    get deviceUrl() {
        const { state } = (0, sisyfosHost_1.getSisyfosHost)().store
        const url = state.settings[0].mixers[this.mixerIndex]?.deviceUrl
        return url?.trim() || DEFAULT_DEVICE_URL
    }
    connect() {
        if (this.disposed) {
            return
        }
        const { logger } = (0, sisyfosHost_1.getSisyfosHost)()
        this.clearPingTimer()
        this.subscribed = false
        if (this.ws) {
            this.ws.removeAllListeners()
            if (
                this.ws.readyState === ws_1.default.OPEN ||
                this.ws.readyState === ws_1.default.CONNECTING
            ) {
                this.ws.close()
            }
            this.ws = null
        }
        logger.info(
            `Mock WebSocket plugin connecting to ${this.deviceUrl} (mixer ${this.mixerIndex})`
        )
        const ws = new ws_1.default(this.deviceUrl)
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
    scheduleReconnect() {
        if (this.disposed || this.reconnectTimer) {
            return
        }
        const delay = this.reconnectDelayMs
        this.reconnectDelayMs = Math.min(
            this.reconnectDelayMs * 2,
            MAX_RECONNECT_MS
        )
        const { logger } = (0, sisyfosHost_1.getSisyfosHost)()
        logger.info(`Mock WebSocket reconnect in ${delay}ms`)
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
        }, delay)
    }
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
    }
    clearPingTimer() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer)
            this.pingTimer = null
        }
    }
    send(message) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN) {
            return
        }
        this.ws.send(JSON.stringify(message))
    }
    handleMessage(raw) {
        let message
        try {
            message = JSON.parse(raw)
        } catch {
            ;(0, sisyfosHost_1.getSisyfosHost)().logger.error(
                `Mock WebSocket invalid JSON: ${raw}`
            )
            return
        }
        switch (message.type) {
            case 'online':
                this.onOnline()
                break
            case 'error':
                ;(0, sisyfosHost_1.getSisyfosHost)().logger.error(
                    `Mock device error: ${message.message ?? raw}`
                )
                break
            case 'pong':
            case 'snapshot':
            case 'clientStatus':
                break
            case 'presetLoaded':
                if (message.presetName) {
                    ;(0, sisyfosHost_1.getSisyfosHost)().logger.info(
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
    onOnline() {
        this.send({ type: 'subscribe', clientType: 'sisyfos' })
        this.subscribed = true
        this.reconnectDelayMs = INITIAL_RECONNECT_MS
        this.clearReconnectTimer()
        this.pushSisyfosSnapshotToDevice()
        this.setMixerOnline(true)
        global.mainThreadHandler.updateFullClientStore()
        this.startPingTimer()
    }
    startPingTimer() {
        this.clearPingTimer()
        const pingTime = this.mixerProtocol.pingTime ?? 0
        if (pingTime <= 0) {
            return
        }
        this.pingTimer = setInterval(() => {
            this.send({ type: 'ping' })
        }, pingTime)
    }
    setMixerOnline(online) {
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
        store.dispatch({
            type: SET_MIXER_ONLINE,
            mixerIndex: this.mixerIndex,
            mixerOnline: online,
        })
        global.mainThreadHandler.updateMixerOnline(this.mixerIndex, online)
    }
    getAssignedFaderIndex(channelIndex) {
        const { state } = (0, sisyfosHost_1.getSisyfosHost)().store
        return state.faders[0].fader.findIndex((fader) =>
            fader.assignedChannels?.some(
                (assigned) =>
                    assigned.mixerIndex === this.mixerIndex &&
                    assigned.channelIndex === channelIndex
            )
        )
    }
    handleVuLevel(message) {
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
    handleHardwareFeedback(message) {
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
    handleHardwareInputSelector(channelIndex, selected) {
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    handleHardwareInputGain(channelIndex, level) {
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    handleHardwareFx(channelIndex, fxParam, level) {
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    handleHardwareFaderLevel(channelIndex, level) {
        const { store, state } = (0, sisyfosHost_1.getSisyfosHost)().store
        const { mixerGenericConnection, remoteConnections } = (0,
        sisyfosHost_1.getSisyfosHost)().mainClasses
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
            fader.assignedChannels?.forEach((assignedChannel) => {
                if (assignedChannel.mixerIndex === this.mixerIndex) {
                    store.dispatch({
                        type: SET_OUTPUT_LEVEL,
                        mixerIndex: this.mixerIndex,
                        channel: assignedChannel.channelIndex,
                        level,
                    })
                }
            })
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
            fader.assignedChannels?.forEach((assignedChannel) => {
                if (assignedChannel.mixerIndex === this.mixerIndex) {
                    store.dispatch({
                        type: SET_OUTPUT_LEVEL,
                        mixerIndex: this.mixerIndex,
                        channel: assignedChannel.channelIndex,
                        level,
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
        if (remoteConnections) {
            remoteConnections.updateRemoteFaderState(assignedFaderIndex, level)
        }
    }
    handleHardwareMute(channelIndex, muteOn) {
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
        const { mixerGenericConnection } = (0, sisyfosHost_1.getSisyfosHost)()
            .mainClasses
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
    handleHardwarePfl(channelIndex, pflOn) {
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    handleHardwareAMix(channelIndex, amixOn) {
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    handleHardwareNextAux(channelIndex, level) {
        const { store, state } = (0, sisyfosHost_1.getSisyfosHost)().store
        const { remoteConnections } = (0, sisyfosHost_1.getSisyfosHost)()
            .mainClasses
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
    handleHardwareAuxLevel(channelIndex, auxIndex, level) {
        const { store, state } = (0, sisyfosHost_1.getSisyfosHost)().store
        const { remoteConnections } = (0, sisyfosHost_1.getSisyfosHost)()
            .mainClasses
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
    handleHardwareChannelName(channelIndex, name) {
        const { store, state } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    updateFadeIOLevel(channelIndex, outputLevel) {
        this.send({
            type: 'setFaderLevel',
            channel: channelIndex,
            level: outputLevel,
        })
    }
    updateMuteState(channelIndex, muteOn) {
        this.send({
            type: 'setMute',
            channel: channelIndex,
            mute: muteOn,
        })
    }
    updatePflState(channelIndex) {
        const { state } = (0, sisyfosHost_1.getSisyfosHost)().store
        const pflOn = state.faders[0].fader[channelIndex]?.pflOn ?? false
        this.send({
            type: 'setPfl',
            channel: channelIndex,
            pfl: pflOn,
        })
    }
    updateNextAux(channelIndex, level) {
        this.send({
            type: 'setNextAux',
            channel: channelIndex,
            level,
        })
    }
    updateChannelName(channelIndex) {
        const { state } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    updateFx(channelIndex, fxParam, level) {
        this.send({
            type: 'setFx',
            channel: channelIndex,
            fxParam,
            level,
        })
    }
    updateInputGain(channelIndex, level) {
        this.send({
            type: 'setInputGain',
            channel: channelIndex,
            level,
        })
    }
    updateInputSelector(channelIndex, inputSelected) {
        this.send({
            type: 'setInputSelector',
            channel: channelIndex,
            selected: inputSelected,
        })
    }
    updateAMixState(channelIndex, aMixOn) {
        this.send({
            type: 'setAMix',
            channel: channelIndex,
            amixOn: aMixOn,
        })
    }
    updateAuxLevel(channelIndex, auxSendIndex, level) {
        this.send({
            type: 'setAuxLevel',
            channel: channelIndex,
            auxIndex: auxSendIndex,
            level,
        })
    }
    loadMixerPreset(presetName) {
        const { logger } = (0, sisyfosHost_1.getSisyfosHost)()
        logger.info(`Mock WebSocket loading preset: ${presetName}`)
        setImmediate(() => this.applyLoadMixerPreset(presetName, logger))
    }
    applyLoadMixerPreset(presetName, logger) {
        let presetPath
        try {
            presetPath = this.resolvePresetPath(presetName)
        } catch (error) {
            logger.error(
                `Mock WebSocket preset not found: ${presetName} (${String(error)})`
            )
            return
        }
        let channels
        try {
            const raw = fs_1.default.readFileSync(presetPath, 'utf8')
            const parsed = JSON.parse(raw)
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
    resolvePresetPath(presetName) {
        const trimmed = presetName.trim()
        if (
            !trimmed ||
            trimmed.includes('..') ||
            path_1.default.isAbsolute(trimmed)
        ) {
            throw new Error('invalid preset name')
        }
        const storageFolder = this.getSisyfosStorageFolder()
        const candidates = trimmed.toLowerCase().endsWith('.json')
            ? [trimmed]
            : [trimmed, `${trimmed}.json`]
        for (const candidate of candidates) {
            const resolved = path_1.default.resolve(storageFolder, candidate)
            if (
                !resolved.startsWith(
                    path_1.default.resolve(storageFolder) + path_1.default.sep
                ) &&
                resolved !== path_1.default.resolve(storageFolder)
            ) {
                continue
            }
            if (fs_1.default.existsSync(resolved)) {
                return resolved
            }
        }
        throw new Error(`preset file not found in ${storageFolder}`)
    }
    getSisyfosStorageFolder() {
        const root =
            process.env.SISYFOS_ROOT ??
            path_1.default.resolve(__dirname, '../..')
        const serverDist = path_1.default.join(root, 'server/dist/server/src')
        return require(
            path_1.default.join(serverDist, 'constants/storagePaths')
        ).STORAGE_FOLDER
    }
    normalizePresetChannel(entry, fallbackIndex) {
        if (!entry || typeof entry !== 'object') {
            throw new Error(`channels[${fallbackIndex}] must be an object`)
        }
        const channel = entry
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
                ? channel.auxLevels.filter((level) => typeof level === 'number')
                : undefined,
            name: typeof channel.name === 'string' ? channel.name : undefined,
            fx: Array.isArray(channel.fx)
                ? channel.fx.filter((level) => typeof level === 'number')
                : undefined,
        }
    }
    captureSisyfosChannelState(channelIndex) {
        const { state } = (0, sisyfosHost_1.getSisyfosHost)().store
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
        const fx = []
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
    pushSisyfosSnapshotToDevice() {
        const { state } = (0, sisyfosHost_1.getSisyfosHost)().store
        const { logger } = (0, sisyfosHost_1.getSisyfosHost)()
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
    pushChannelStateToDevice(entry) {
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
    applyPresetChannel(entry) {
        const channelIndex = entry.index
        const { store } = (0, sisyfosHost_1.getSisyfosHost)().store
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
    injectCommand(_command) {}
    updateChannelSetting(_channelIndex, _setting, _value) {}
}
exports.WebSocketMixerConnection = WebSocketMixerConnection
function getSendVuLevel() {
    if (cachedSendVuLevel) {
        return cachedSendVuLevel
    }
    const root =
        process.env.SISYFOS_ROOT ?? path_1.default.resolve(__dirname, '../..')
    const serverDist = path_1.default.join(root, 'server/dist/server/src')
    cachedSendVuLevel = require(
        path_1.default.join(serverDist, 'utils/vuServer')
    ).sendVuLevel
    return cachedSendVuLevel
}
