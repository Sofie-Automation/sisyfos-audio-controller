import { store, state } from '../reducers/store'
import { logger } from './logger'
import { remoteConnections } from '../mainClasses'

import {
    MixerProtocolGeneric,
    FxParam,
    MixerConnectionTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChMixerConnection } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelReference } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { sendChLevelsToOuputServer } from './outputLevelServer'
import { MixerConnection } from './mixerConnections'
import { SecondOutRowButtonType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { mixerRegistry } from '../plugins/MixerRegistry'

export class MixerGenericConnection {
    mixerProtocol: MixerProtocolGeneric[]
    mixerConnection: MixerConnection[]
    mixerTimers: {
        chTimer: NodeJS.Timeout[]
        fadeActiveTimer: NodeJS.Timeout[]
    }[]
    currentOutputLevel: number[]

    constructor() {
        this.mixerProtocol = []
        this.mixerConnection = []
        this.currentOutputLevel = []
        // Get mixer protocol
        state.settings[0].mixers.forEach((none: any, index: number) => {
            const presetKey = state.settings[0].mixers[index].mixerProtocol
            this.mixerProtocol.push(mixerRegistry.getProtocol(presetKey))
            const connection = mixerRegistry.createConnection(presetKey, index)
            if (connection) {
                this.mixerConnection[index] = connection
            } else {
                logger.error(
                    `Failed to create mixer connection for preset "${presetKey}"`
                )
            }
        })

        // Setup timers for fade in & out
        this.initializeTimers()
    }

    initializeTimers = () => {
        // Setup timers for fade in & out
        this.mixerTimers = []
        state.channels[0].chMixerConnection.forEach(
            (chMixerConnection: ChMixerConnection, mixerIndex: number) => {
                this.mixerTimers.push({ chTimer: [], fadeActiveTimer: [] })
                state.channels[0].chMixerConnection[mixerIndex].channel.forEach(
                    (channel) => {
                        this.mixerTimers[mixerIndex].chTimer.push(undefined)
                        this.mixerTimers[mixerIndex].fadeActiveTimer.push(
                            undefined
                        )
                    }
                )
            }
        )
    }

    clearTimer = (mixerIndex: number, channelIndex: number) => {
        if (this.mixerTimers[mixerIndex]?.chTimer[channelIndex]) {
            clearInterval(this.mixerTimers[mixerIndex].chTimer[channelIndex])
        }
    }

    delayedFadeActiveDisable = (mixerIndex: number, channelIndex: number) => {
        this.mixerTimers[mixerIndex].fadeActiveTimer[channelIndex] = setTimeout(
            () => {
                logger.trace(
                    `Clearing fadeActive on ${mixerIndex} Ch ${channelIndex}`
                )

                store.dispatch({
                    type: ChannelActionTypes.FADE_ACTIVE,
                    mixerIndex: mixerIndex,
                    channel: channelIndex,
                    active: false,
                })
            },
            state.settings[0].mixers[0].protocolLatency
        )
    }

    getPresetFileExtention = (): string => {
        //TODO: atm mixer presets only supports first mixer connected to Sisyfos
        return this.mixerProtocol[0].presetFileExtension || ''
    }

    loadMixerPreset = (presetName: string) => {
        //TODO: atm mixer presets only supports first mixer connected to Sisyfos
        this.mixerConnection[0].loadMixerPreset(presetName)
    }

    checkForAutoResetThreshold = (channel: number) => {
        if (
            state.faders[0].fader[channel].faderLevel <=
            state.settings[0].autoResetLevel / 100
        ) {
            store.dispatch({
                type: FaderActionTypes.SET_FADER_LEVEL,
                faderIndex: channel,
                level: this.mixerProtocol[0].fader.zero,
            })
        }
    }

    updateFadeToBlack = () => {
        state.faders[0].fader.forEach((channel: any, index: number) => {
            this.updateOutLevel(index, -1)
        })
    }

    updateOutLevels = () => {
        state.faders[0].fader.forEach((channel: any, index: number) => {
            this.updateOutLevel(index, -1)
            this.updateNextAux(index)
        })
    }

    updateOutLevel = (
        faderIndex: number,
        fadeTime: number,
        mixerIndexToSkip: number = -1
    ) => {
        if (!state.faders[0].fader[faderIndex]) return
        if (fadeTime === -1) {
            if (state.faders[0].fader[faderIndex].voOn) {
                fadeTime = state.settings[0].voFadeTime
            } else {
                fadeTime = state.settings[0].fadeTime

                // Set fadetime if SLOW FADE Button is ON:
                if (
                    state.settings[0].secondOutRowButton ===
                        SecondOutRowButtonType.SLOW_FADE &&
                    state.faders[0].fader[faderIndex].slowFadeOn
                ) {
                    fadeTime = state.settings[0].voFadeTime
                }
            }
        }

        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                if (assignedChannel.mixerIndex !== mixerIndexToSkip) {
                    this.fadeInOut(
                        assignedChannel.mixerIndex,
                        assignedChannel.channelIndex,
                        faderIndex,
                        fadeTime
                    )
                }
            }
        )

        if (remoteConnections) {
            remoteConnections.updateRemoteFaderState(
                faderIndex,
                state.faders[0].fader[faderIndex].faderLevel
            )
        }
    }

    updateInputGain = (faderIndex: number) => {
        if (!state.faders[0].fader[faderIndex]) return
        let level = state.faders[0].fader[faderIndex].inputGain
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[
                    assignedChannel.mixerIndex
                ].updateInputGain(assignedChannel.channelIndex, level)
            }
        )
    }

    updateInputSelector = (faderIndex: number) => {
        let inputSelected = state.faders[0].fader[faderIndex].inputSelector
        logger.trace(`${faderIndex} ${inputSelected}`)
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[
                    assignedChannel.mixerIndex
                ].updateInputSelector(
                    assignedChannel.channelIndex,
                    inputSelected
                )
            }
        )
    }

    updatePflState = (faderIndex: number) => {
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[assignedChannel.mixerIndex].updatePflState(
                    assignedChannel.channelIndex
                )
            }
        )
    }

    updateMuteState = (faderIndex: number, mixerIndexToSkip: number = -1) => {
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                if (assignedChannel.mixerIndex !== mixerIndexToSkip) {
                    this.mixerConnection[
                        assignedChannel.mixerIndex
                    ].updateMuteState(
                        assignedChannel.channelIndex,
                        state.faders[0].fader[faderIndex].muteOn
                    )
                }
            }
        )
    }

    updateAMixState = (faderIndex: number) => {
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[
                    assignedChannel.mixerIndex
                ].updateAMixState(
                    assignedChannel.channelIndex,
                    state.faders[0].fader[faderIndex].amixOn
                )
            }
        )
    }

    updateNextAux = (faderIndex: number) => {
        let level = 0
        if (state.faders[0].fader[faderIndex].pstOn) {
            level = state.faders[0].fader[faderIndex].faderLevel
        } else if (state.faders[0].fader[faderIndex].pstVoOn) {
            level =
                (state.faders[0].fader[faderIndex].faderLevel *
                    (100 - state.settings[0].voLevel)) /
                100
        }
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[assignedChannel.mixerIndex].updateNextAux(
                    assignedChannel.channelIndex,
                    level
                )
            }
        )
    }

    updateFx = (fxParam: FxParam, faderIndex: number) => {
        let level: number = state.faders[0].fader[faderIndex][fxParam][0]
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[assignedChannel.mixerIndex].updateFx(
                    assignedChannel.channelIndex,
                    fxParam,
                    level
                )
            }
        )
    }

    updateAuxLevel = (channelIndex: number, auxSendIndex: number) => {
        let channel =
            state.channels[0].chMixerConnection[0].channel[channelIndex]
        if (channel.auxLevel[auxSendIndex] > -1) {
            this.mixerConnection[0].updateAuxLevel(
                channelIndex,
                auxSendIndex,
                channel.auxLevel[auxSendIndex]
            )
        }
    }

    updateChannelName = (channelIndex: number) => {
        this.mixerConnection[0].updateChannelName(channelIndex)
    }

    injectCommand = (command: string[]) => {
        this.mixerConnection[0].injectCommand(command)
    }

    updateChannelSettings = (
        channelIndex: number,
        setting: string,
        value: string
    ) => {
        if (this.mixerProtocol[0].protocol === MixerConnectionTypes.CasparCG) {
            this.mixerConnection[0].updateChannelSetting(
                channelIndex,
                setting,
                value
            )
        }
    }

    fadeInOut = (
        mixerIndex: number,
        channelIndex: number,
        faderIndex: number,
        fadeTime: number
    ) => {
        const isOnAir =
            state.faders[0].fader[faderIndex].pgmOn ||
            state.faders[0].fader[faderIndex].voOn

        if (
            !isOnAir &&
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ]?.outputLevel === 0
        ) {
            return
        }
        if (
            this.mixerTimers.length === 1 &&
            this.mixerTimers[0].chTimer.length === 1
        ) {
            this.initializeTimers()
        }
        //Clear Old timer or set Fade to active:
        if (
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ]?.fadeActive
        ) {
            clearInterval(
                this.mixerTimers[mixerIndex].fadeActiveTimer[channelIndex]
            )
            this.clearTimer(mixerIndex, channelIndex)
        }
        if (isOnAir && fadeTime === 0) {
            // If fadeTime is 0 - jump to level and don't use timer
            this.jumpToLevel(mixerIndex, channelIndex, faderIndex)
        } else if (isOnAir) {
            this.fadeUp(mixerIndex, channelIndex, fadeTime, faderIndex)
        } else {
            this.fadeDown(mixerIndex, channelIndex, fadeTime)
        }
        store.dispatch({
            type: ChannelActionTypes.FADE_ACTIVE,
            mixerIndex: mixerIndex,
            channel: channelIndex,
            active: true,
        })
    }

    jumpToLevel = (
        mixerIndex: number,
        channelIndex: number,
        faderIndex: number
    ) => {
        let targetVal = state.faders[0].fader[faderIndex].faderLevel
        if (state.faders[0].fader[faderIndex].voOn) {
            targetVal = (targetVal * (100 - state.settings[0].voLevel)) / 100
        }
        this.mixerConnection[mixerIndex].updateFadeIOLevel(
            channelIndex,
            targetVal
        )
        store.dispatch({
            type: ChannelActionTypes.SET_OUTPUT_LEVEL,
            mixerIndex: mixerIndex,
            channel: channelIndex,
            level: targetVal,
        })
        this.currentOutputLevel[channelIndex] = targetVal
        sendChLevelsToOuputServer(mixerIndex, channelIndex, targetVal)
        this.delayedFadeActiveDisable(mixerIndex, channelIndex)
    }

    fadeUp = (
        mixerIndex: number,
        channelIndex: number,
        fadeTime: number,
        faderIndex: number
    ) => {
        let startLevel =
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ].outputLevel

        if (
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ].fadeActive &&
            this.currentOutputLevel[channelIndex] !== undefined
        ) {
            logger.trace(
                `Preparing fade on ${mixerIndex} Ch ${channelIndex} level ${startLevel} is overriden by ${this.currentOutputLevel[channelIndex]} because fadeActive`
            )

            startLevel = this.currentOutputLevel[channelIndex]
        }

        let targetVal = state.faders[0].fader[faderIndex].faderLevel

        if (state.faders[0].fader[faderIndex].voOn) {
            targetVal = (targetVal * (100 - state.settings[0].voLevel)) / 100
        }

        this.fade(fadeTime, mixerIndex, channelIndex, startLevel, targetVal)
    }

    fadeDown = (mixerIndex: number, channelIndex: number, fadeTime: number) => {
        let startLevel =
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ].outputLevel

        if (
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ].fadeActive &&
            this.currentOutputLevel[channelIndex] !== undefined
        ) {
            startLevel = this.currentOutputLevel[channelIndex]
        }

        this.fade(fadeTime, mixerIndex, channelIndex, startLevel, 0)
    }

    fade(
        fadeTime: number,
        mixerIndex: number,
        channelIndex: number,
        startLevel: number,
        endLevel: number
    ) {
        const startTimeAsMs = Date.now()
        const updateInterval: number = Math.floor(
            1000 / this.mixerProtocol[mixerIndex].MAX_UPDATES_PER_SECOND
        )

        logger.trace(
            `Initiating fade on ${mixerIndex} Ch ${channelIndex} started ${startTimeAsMs}: from ${startLevel} to ${endLevel} at ${startTimeAsMs}`
        )

        this.clearTimer(mixerIndex, channelIndex)

        this.mixerTimers[mixerIndex].chTimer[channelIndex] = setInterval(
            () =>
                this.updateOutputLevel(
                    startTimeAsMs,
                    fadeTime,
                    mixerIndex,
                    channelIndex,
                    startLevel,
                    endLevel
                ),
            updateInterval
        )
        this.updateOutputLevel(
            startTimeAsMs,
            fadeTime,
            mixerIndex,
            channelIndex,
            startLevel,
            endLevel
        )
    }

    private updateOutputLevel(
        startTimeAsMs: number,
        fadeTime: number,
        mixerIndex: number,
        channelIndex: number,
        startLevel: number,
        endLevel: number
    ) {
        const currentTimeMS = Date.now()
        const elapsedTimeMS = currentTimeMS - startTimeAsMs

        if (elapsedTimeMS >= fadeTime || endLevel === startLevel) {
            this.currentOutputLevel[channelIndex] = endLevel

            logger.trace(
                `Finishing fade on ${mixerIndex} Ch ${channelIndex} started ${startTimeAsMs}: from ${startLevel} to ${endLevel}, fadeTime: ${fadeTime}, elapsed: ${elapsedTimeMS}`
            )
            this.mixerConnection[mixerIndex].updateFadeIOLevel(
                channelIndex,
                endLevel
            )
            this.clearTimer(mixerIndex, channelIndex)
            store.dispatch({
                type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                mixerIndex: mixerIndex,
                channel: channelIndex,
                level: endLevel,
            })
            sendChLevelsToOuputServer(mixerIndex, channelIndex, endLevel)
            this.delayedFadeActiveDisable(mixerIndex, channelIndex)
            return true
        }

        const diff = endLevel - startLevel
        const progress = Math.max(0, Math.min(1, elapsedTimeMS / fadeTime))
        const newLevel = startLevel + diff * progress

        this.currentOutputLevel[channelIndex] = newLevel

        logger.trace(
            `Doing fade on ${mixerIndex} Ch ${channelIndex} started ${startTimeAsMs}: from ${startLevel} to ${endLevel}, level: ${newLevel}, progress: ${progress}, fadeTime: ${fadeTime}, elapsed: ${elapsedTimeMS}`
        )

        this.mixerConnection[mixerIndex].updateFadeIOLevel(
            channelIndex,
            newLevel
        )

        store.dispatch({
            type: ChannelActionTypes.SET_OUTPUT_LEVEL,
            mixerIndex: mixerIndex,
            channel: channelIndex,
            level: endLevel,
        })
        sendChLevelsToOuputServer(
            mixerIndex,
            channelIndex,
            this.currentOutputLevel[channelIndex]
        )
    }
}
