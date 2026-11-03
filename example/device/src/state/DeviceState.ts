import { EventEmitter } from 'events'
import {
    ChannelState,
    DeviceSnapshot,
    FeedbackMessage,
    MessageSource,
    ProtocolError,
} from './types'
import { createDefaultAuxLevels, isValidAuxIndex } from './auxLevels'
import { createDefaultFx, isValidFxParam } from './fxParams'

function clampLevel(level: number): number {
    return Math.min(1, Math.max(0, level))
}

function createDefaultChannel(
    index: number,
    auxSendCount: number
): ChannelState {
    return {
        index,
        faderLevel: 0.75,
        inputGain: 0.75,
        inputSelector: 1,
        mute: false,
        pfl: false,
        amixOn: false,
        nextAuxLevel: 0,
        auxLevels: createDefaultAuxLevels(auxSendCount),
        name: `CH${index + 1}`,
        fx: createDefaultFx(),
    }
}

export interface DeviceStateEvents {
    feedback: [FeedbackMessage]
}

export class DeviceState extends EventEmitter {
    private readonly channels: ChannelState[]

    constructor(
        channelCount: number,
        private readonly inputSelectorCount = 4,
        private readonly auxSendCount = 4
    ) {
        super()
        if (channelCount < 1) {
            throw new Error('channelCount must be at least 1')
        }
        if (inputSelectorCount < 1) {
            throw new Error('inputSelectorCount must be at least 1')
        }
        if (auxSendCount < 1) {
            throw new Error('auxSendCount must be at least 1')
        }
        this.channels = Array.from({ length: channelCount }, (_, index) =>
            createDefaultChannel(index, auxSendCount)
        )
    }

    getInputSelectorCount(): number {
        return this.inputSelectorCount
    }

    getAuxSendCount(): number {
        return this.auxSendCount
    }

    getChannelCount(): number {
        return this.channels.length
    }

    getChannel(index: number): ChannelState {
        const channel = this.getChannelRef(index)
        return {
            ...channel,
            auxLevels: [...channel.auxLevels],
            fx: [...channel.fx],
        }
    }

    getSnapshot(): DeviceSnapshot {
        return {
            online: true,
            inputSelectorCount: this.inputSelectorCount,
            auxSendCount: this.auxSendCount,
            channels: this.channels.map((channel) => ({
                ...channel,
                auxLevels: [...channel.auxLevels],
                fx: [...channel.fx],
            })),
        }
    }

    setFaderLevel(
        channel: number,
        level: number,
        source: MessageSource = 'command'
    ): void {
        const ch = this.getChannelRef(channel)
        const clamped = clampLevel(level)
        if (ch.faderLevel === clamped) {
            return
        }
        ch.faderLevel = clamped
        this.emitFeedback({
            type: 'faderLevel',
            channel,
            level: clamped,
            source,
        })
    }

    setInputGain(
        channel: number,
        level: number,
        source: MessageSource = 'command'
    ): void {
        const ch = this.getChannelRef(channel)
        const clamped = clampLevel(level)
        if (ch.inputGain === clamped) {
            return
        }
        ch.inputGain = clamped
        this.emitFeedback({
            type: 'inputGain',
            channel,
            level: clamped,
            source,
        })
    }

    setInputSelector(
        channel: number,
        selected: number,
        source: MessageSource = 'command'
    ): void {
        if (!Number.isInteger(selected)) {
            throw new ProtocolError(`Invalid selected: ${selected}`)
        }
        if (selected < 1 || selected > this.inputSelectorCount) {
            throw new ProtocolError(
                `Invalid selected: ${selected} (valid range 1–${this.inputSelectorCount})`
            )
        }
        const ch = this.getChannelRef(channel)
        if (ch.inputSelector === selected) {
            return
        }
        ch.inputSelector = selected
        this.emitFeedback({
            type: 'inputSelector',
            channel,
            selected,
            source,
        })
    }

    setMute(
        channel: number,
        mute: boolean,
        source: MessageSource = 'command'
    ): void {
        const ch = this.getChannelRef(channel)
        if (ch.mute === mute) {
            return
        }
        ch.mute = mute
        this.emitFeedback({ type: 'mute', channel, mute, source })
    }

    setPfl(
        channel: number,
        pfl: boolean,
        source: MessageSource = 'command'
    ): void {
        const ch = this.getChannelRef(channel)
        if (ch.pfl === pfl) {
            return
        }
        ch.pfl = pfl
        this.emitFeedback({ type: 'pfl', channel, pfl, source })
    }

    setAMix(
        channel: number,
        amixOn: boolean,
        source: MessageSource = 'command'
    ): void {
        const ch = this.getChannelRef(channel)
        if (ch.amixOn === amixOn) {
            return
        }
        ch.amixOn = amixOn
        this.emitFeedback({ type: 'amixOn', channel, amixOn, source })
    }

    setNextAux(
        channel: number,
        level: number,
        source: MessageSource = 'command'
    ): void {
        const ch = this.getChannelRef(channel)
        const clamped = clampLevel(level)
        if (ch.nextAuxLevel === clamped) {
            return
        }
        ch.nextAuxLevel = clamped
        this.emitFeedback({ type: 'nextAux', channel, level: clamped, source })
    }

    setAuxLevel(
        channel: number,
        auxIndex: number,
        level: number,
        source: MessageSource = 'command'
    ): void {
        if (!isValidAuxIndex(auxIndex, this.auxSendCount)) {
            throw new ProtocolError(`Invalid auxIndex: ${auxIndex}`)
        }
        const ch = this.getChannelRef(channel)
        const clamped = clampLevel(level)
        if (ch.auxLevels[auxIndex] === clamped) {
            return
        }
        ch.auxLevels[auxIndex] = clamped
        this.emitFeedback({
            type: 'auxLevel',
            channel,
            auxIndex,
            level: clamped,
            source,
        })
    }

    setChannelName(
        channel: number,
        name: string,
        source: MessageSource = 'command'
    ): void {
        const trimmed = name.trim()
        if (!trimmed) {
            throw new ProtocolError('Channel name cannot be empty')
        }
        const ch = this.getChannelRef(channel)
        if (ch.name === trimmed) {
            return
        }
        ch.name = trimmed
        this.emitFeedback({
            type: 'channelName',
            channel,
            name: trimmed,
            source,
        })
    }

    setFx(
        channel: number,
        fxParam: number,
        level: number,
        source: MessageSource = 'command'
    ): void {
        if (!isValidFxParam(fxParam)) {
            throw new ProtocolError(`Invalid fxParam: ${fxParam}`)
        }
        const ch = this.getChannelRef(channel)
        const clamped = clampLevel(level)
        if (ch.fx[fxParam] === clamped) {
            return
        }
        ch.fx[fxParam] = clamped
        this.emitFeedback({
            type: 'fx',
            channel,
            fxParam,
            level: clamped,
            source,
        })
    }

    loadPreset(
        presetName: string,
        channels: ChannelState[],
        source: MessageSource = 'command'
    ): void {
        for (const entry of channels) {
            this.setFaderLevel(entry.index, entry.faderLevel, source)
            this.setInputGain(entry.index, entry.inputGain, source)
            this.setInputSelector(entry.index, entry.inputSelector, source)
            this.setMute(entry.index, entry.mute, source)
            this.setPfl(entry.index, entry.pfl, source)
            this.setAMix(entry.index, entry.amixOn, source)
            this.setNextAux(entry.index, entry.nextAuxLevel, source)
            this.setChannelName(entry.index, entry.name, source)

            for (let fxParam = 0; fxParam < entry.fx.length; fxParam++) {
                this.setFx(entry.index, fxParam, entry.fx[fxParam], source)
            }
            for (
                let auxIndex = 0;
                auxIndex < entry.auxLevels.length;
                auxIndex++
            ) {
                this.setAuxLevel(
                    entry.index,
                    auxIndex,
                    entry.auxLevels[auxIndex],
                    source
                )
            }
        }

        this.emitFeedback({ type: 'presetLoaded', presetName, source })
    }

    resetAll(source: MessageSource = 'command'): void {
        for (let index = 0; index < this.channels.length; index++) {
            const defaults = createDefaultChannel(index, this.auxSendCount)
            const ch = this.channels[index]
            if (ch.faderLevel !== defaults.faderLevel) {
                ch.faderLevel = defaults.faderLevel
                this.emitFeedback({
                    type: 'faderLevel',
                    channel: index,
                    level: defaults.faderLevel,
                    source,
                })
            }
            if (ch.inputGain !== defaults.inputGain) {
                ch.inputGain = defaults.inputGain
                this.emitFeedback({
                    type: 'inputGain',
                    channel: index,
                    level: defaults.inputGain,
                    source,
                })
            }
            if (ch.inputSelector !== defaults.inputSelector) {
                ch.inputSelector = defaults.inputSelector
                this.emitFeedback({
                    type: 'inputSelector',
                    channel: index,
                    selected: defaults.inputSelector,
                    source,
                })
            }
            if (ch.mute !== defaults.mute) {
                ch.mute = defaults.mute
                this.emitFeedback({
                    type: 'mute',
                    channel: index,
                    mute: defaults.mute,
                    source,
                })
            }
            if (ch.pfl !== defaults.pfl) {
                ch.pfl = defaults.pfl
                this.emitFeedback({
                    type: 'pfl',
                    channel: index,
                    pfl: defaults.pfl,
                    source,
                })
            }
            if (ch.amixOn !== defaults.amixOn) {
                ch.amixOn = defaults.amixOn
                this.emitFeedback({
                    type: 'amixOn',
                    channel: index,
                    amixOn: defaults.amixOn,
                    source,
                })
            }
            if (ch.nextAuxLevel !== defaults.nextAuxLevel) {
                ch.nextAuxLevel = defaults.nextAuxLevel
                this.emitFeedback({
                    type: 'nextAux',
                    channel: index,
                    level: defaults.nextAuxLevel,
                    source,
                })
            }
            if (ch.name !== defaults.name) {
                ch.name = defaults.name
                this.emitFeedback({
                    type: 'channelName',
                    channel: index,
                    name: defaults.name,
                    source,
                })
            }
            for (let fxParam = 0; fxParam < ch.fx.length; fxParam++) {
                if (ch.fx[fxParam] !== defaults.fx[fxParam]) {
                    ch.fx[fxParam] = defaults.fx[fxParam]
                    this.emitFeedback({
                        type: 'fx',
                        channel: index,
                        fxParam,
                        level: defaults.fx[fxParam],
                        source,
                    })
                }
            }
            for (let auxIndex = 0; auxIndex < ch.auxLevels.length; auxIndex++) {
                if (ch.auxLevels[auxIndex] !== defaults.auxLevels[auxIndex]) {
                    ch.auxLevels[auxIndex] = defaults.auxLevels[auxIndex]
                    this.emitFeedback({
                        type: 'auxLevel',
                        channel: index,
                        auxIndex,
                        level: defaults.auxLevels[auxIndex],
                        source,
                    })
                }
            }
        }
    }

    private getChannelRef(index: number): ChannelState {
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.channels.length
        ) {
            throw new ProtocolError(`Invalid channel index: ${index}`)
        }
        return this.channels[index]
    }

    private emitFeedback(message: FeedbackMessage): void {
        this.emit('feedback', message)
    }
}
