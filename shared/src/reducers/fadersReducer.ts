import { FaderActionTypes } from '../actions/faderActions'
import { NumberOfChannels } from './channelsReducer'
import { RootAction, RootState } from './indexReducer'
import { PgmOnFollowMixerBehaviour } from './settingsReducer'
export interface Faders {
    fader: Array<Fader>
    vuMeters: Array<VuMeters>
}

export interface ChannelReference {
    mixerIndex: number
    channelIndex: number
    /** When linking faders, it tracks the index of a fader this channel originated from */
    borrowedFromFaderIndex?: number
}

export interface Fader {
    faderLevel: number
    inputGain: number
    inputSelector: number
    label: string
    userLabel?: string
    pgmOn: boolean
    voOn: boolean
    slowFadeOn: boolean
    pstOn: boolean
    pstVoOn: boolean
    pflOn: boolean
    muteOn: boolean
    amixOn: boolean
    [fxparam: number]: Array<number>
    monitor: number
    showChannel: boolean
    showInMiniMonitor: boolean
    ignoreAutomation: boolean
    disabled: boolean
    assignedChannels?: ChannelReference[]
    isLinked?: boolean

    /**
     * Assuming that the protocol has a "feature", can it be enabled on this fader?
     * If the capibilities object does not exist, yes is assumed.
     */
    capabilities?: {
        hasAMix?: boolean
        hasInputSelector?: boolean
        isLinkablePrimary?: boolean
        isLinkableSecondary?: boolean
    }
}

export interface VuMeters {
    reductionVal: number
}

export const defaultFadersReducerState = (
    numberOfFaders: number,
    numberOfChannels?: NumberOfChannels[]
): Faders[] => {
    let defaultObj: Array<Faders> = [
        {
            fader: [],
            vuMeters: [],
        },
    ]

    const channels: ChannelReference[] = []
    numberOfChannels?.forEach((mixer, mixerIndex) => {
        let channelIndex = 0
        for (const typeCount of mixer.numberOfTypeInCh) {
            for (let i = 0; i < typeCount; i++) {
                channels.push({ mixerIndex, channelIndex })
                channelIndex++
            }
        }
    })

    for (let index = 0; index < numberOfFaders; index++) {
        defaultObj[0].fader[index] = {
            faderLevel: 0.75,
            inputGain: 0.75,
            inputSelector: 1,
            label: '',
            pgmOn: false,
            voOn: false,
            slowFadeOn: false,
            pstOn: false,
            pstVoOn: false,
            pflOn: false,
            muteOn: false,
            amixOn: false,
            monitor: index + 1, // route fader - aux 1:1 as default
            showChannel: true,
            showInMiniMonitor: false,
            ignoreAutomation: false,
            disabled: false,

            assignedChannels: channels[index] ? [channels[index]] : [],
        }
        defaultObj[0].vuMeters.push({
            reductionVal: 0.0,
        })
    }
    return defaultObj
}

export const faders = (
    state = defaultFadersReducerState(0),
    action: RootAction,
    fullState?: RootState
): Array<Faders> => {
    if (!(action.type in FaderActionTypes)) {
        return state
    }
    let nextState = [structuredClone(state[0])]
    // Check if faderIndex is valid:
    // this is a left over from the old code, where faderIndex checked on the action type
    // The check is probably because of some calls prior to initialisation of the state
    if (
        'faderIndex' in action &&
        (action.faderIndex < 0 ||
            action.faderIndex >= nextState[0].fader.length)
    ) {
        return nextState
    }

    switch (action.type) {
        case FaderActionTypes.SET_VU_REDUCTION_LEVEL:
            if (
                typeof nextState[0].vuMeters[action.faderIndex] !== 'undefined'
            ) {
                nextState[0].vuMeters[action.faderIndex].reductionVal =
                    action.level
            }
            return nextState
        case FaderActionTypes.SET_COMPLETE_FADER_STATE:
            nextState = defaultFadersReducerState(action.numberOfFaders)
            action.allState.fader?.forEach((fader: any, index: number) => {
                if (index < nextState[0].fader.length) {
                    nextState[0].fader[index] = fader
                }
            })
            return nextState
        case FaderActionTypes.SET_SINGLE_FADER_STATE:
            nextState[0].fader[action.faderIndex] = action.state
            return nextState
        case FaderActionTypes.SET_FADER_LEVEL:
            if (
                fullState.settings[0].pgmOnFollowsMixer ===
                    PgmOnFollowMixerBehaviour.Auto &&
                !nextState[0].fader[action.faderIndex].ignoreAutomation
            ) {
                nextState[0].fader[action.faderIndex].pgmOn =
                    action.level >= 0.01
            } else if (
                fullState.settings[0].pgmOnFollowsMixer ===
                    PgmOnFollowMixerBehaviour.Manual &&
                nextState[0].fader[action.faderIndex].ignoreAutomation
            ) {
                nextState[0].fader[action.faderIndex].pgmOn =
                    action.level >= 0.01
            } else if (
                fullState.settings[0].pgmOnFollowsMixer ===
                PgmOnFollowMixerBehaviour.Global
            ) {
                nextState[0].fader[action.faderIndex].pgmOn =
                    action.level >= 0.01
            }
            nextState[0].fader[action.faderIndex].faderLevel = action.level
            return nextState
        case FaderActionTypes.SET_INPUT_GAIN:
            nextState[0].fader[action.faderIndex].inputGain = action.level

            return nextState
        case FaderActionTypes.SET_INPUT_SELECTOR:
            nextState[0].fader[action.faderIndex].inputSelector =
                action.selected
            return nextState
        case FaderActionTypes.SET_FADER_FX:
            if (!nextState[0].fader[action.faderIndex][action.fxParam]) {
                nextState[0].fader[action.faderIndex][action.fxParam] = []
            }
            nextState[0].fader[action.faderIndex][action.fxParam][0] =
                action.level ?? 0
            return nextState
        case FaderActionTypes.SET_FADER_MONITOR:
            nextState[0].fader[action.faderIndex].monitor = action.auxIndex
            return nextState
        case FaderActionTypes.SET_FADER_LABEL:
            if (!nextState[0].fader[action.faderIndex]) return nextState
            nextState[0].fader[action.faderIndex].label = action.label
            return nextState
        case FaderActionTypes.TOGGLE_PGM:
            if (
                fullState.settings[0].pgmOnFollowsMixer ===
                    PgmOnFollowMixerBehaviour.Auto &&
                !nextState[0].fader[action.faderIndex].ignoreAutomation
            ) {
                nextState[0].fader[action.faderIndex].pgmOn =
                    nextState[0].fader[action.faderIndex].faderLevel >= 0.01
            } else if (
                fullState.settings[0].pgmOnFollowsMixer ===
                    PgmOnFollowMixerBehaviour.Manual &&
                nextState[0].fader[action.faderIndex].ignoreAutomation
            ) {
                nextState[0].fader[action.faderIndex].pgmOn =
                    nextState[0].fader[action.faderIndex].faderLevel >= 0.01
            } else if (
                fullState.settings[0].pgmOnFollowsMixer ===
                PgmOnFollowMixerBehaviour.Global
            ) {
                nextState[0].fader[action.faderIndex].pgmOn =
                    nextState[0].fader[action.faderIndex].faderLevel >= 0.01
            } else {
                nextState[0].fader[action.faderIndex].pgmOn =
                    !nextState[0].fader[action.faderIndex].pgmOn
            }
            nextState[0].fader[action.faderIndex].voOn = false
            return nextState
        case FaderActionTypes.TOGGLE_PGM_UI:
            if (
                fullState.settings[0].pgmOnFollowsMixer ===
                    PgmOnFollowMixerBehaviour.Auto &&
                !nextState[0].fader[action.faderIndex].ignoreAutomation
            ) {
                nextState[0].fader[action.faderIndex].pgmOn = false
                nextState[0].fader[action.faderIndex].faderLevel = 0
            } else if (
                fullState.settings[0].pgmOnFollowsMixer ===
                    PgmOnFollowMixerBehaviour.Manual &&
                !nextState[0].fader[action.faderIndex].ignoreAutomation
            ) {
                nextState[0].fader[action.faderIndex].pgmOn = false
                nextState[0].fader[action.faderIndex].faderLevel = 0
            } else if (
                fullState.settings[0].pgmOnFollowsMixer ===
                PgmOnFollowMixerBehaviour.Global
            ) {
                nextState[0].fader[action.faderIndex].pgmOn = false
                nextState[0].fader[action.faderIndex].faderLevel = 0
            } else {
                nextState[0].fader[action.faderIndex].pgmOn =
                    !nextState[0].fader[action.faderIndex].pgmOn
            }
            nextState[0].fader[action.faderIndex].voOn = false
            return nextState
        case FaderActionTypes.SET_PGM:
            if (isPgmOnFollowsMixer(action.faderIndex, fullState)) {
                console.log('Setting PGM following mixer')
                nextState[0].fader[action.faderIndex].pgmOn =
                    nextState[0].fader[action.faderIndex].faderLevel >= 0.01
            } else {
                console.log('Setting PGM manually to', !!action.pgmOn)
                nextState[0].fader[action.faderIndex].pgmOn = !!action.pgmOn
            }
            nextState[0].fader[action.faderIndex].voOn = false
            return nextState
        case FaderActionTypes.TOGGLE_VO:
            nextState[0].fader[action.faderIndex].voOn =
                !nextState[0].fader[action.faderIndex].voOn
            nextState[0].fader[action.faderIndex].pgmOn = false
            return nextState
        case FaderActionTypes.SET_VO:
            nextState[0].fader[action.faderIndex].voOn = !!action.voOn
            nextState[0].fader[action.faderIndex].pgmOn = false
            return nextState
        case FaderActionTypes.TOGGLE_SLOW_FADE:
            nextState[0].fader[action.faderIndex].slowFadeOn =
                !nextState[0].fader[action.faderIndex].slowFadeOn
            return nextState
        case FaderActionTypes.TOGGLE_PST:
            if (nextState[0].fader[action.faderIndex].pstOn) {
                nextState[0].fader[action.faderIndex].pstOn = false
                // Disable toggle to pstVoOn, to enable change pstVoOn: true here:
                nextState[0].fader[action.faderIndex].pstVoOn = false
            } else if (nextState[0].fader[action.faderIndex].pstVoOn) {
                nextState[0].fader[action.faderIndex].pstOn = false
                nextState[0].fader[action.faderIndex].pstVoOn = false
            } else {
                nextState[0].fader[action.faderIndex].pstOn = true
                nextState[0].fader[action.faderIndex].pstVoOn = false
            }
            return nextState
        case FaderActionTypes.SET_PST:
            nextState[0].fader[action.faderIndex].pstOn = !!action.pstOn
            nextState[0].fader[action.faderIndex].pstVoOn = false
            return nextState
        case FaderActionTypes.SET_PST_VO:
            nextState[0].fader[action.faderIndex].pstVoOn = !!action.pstVoOn
            nextState[0].fader[action.faderIndex].pstOn = false
            return nextState
        case FaderActionTypes.TOGGLE_PFL:
            nextState[0].fader[action.faderIndex].pflOn =
                !nextState[0].fader[action.faderIndex].pflOn
            return nextState
        case FaderActionTypes.SET_PFL:
            nextState[0].fader[action.faderIndex].pflOn = !!action.pflOn
            return nextState
        case FaderActionTypes.TOGGLE_MUTE:
            nextState[0].fader[action.faderIndex].muteOn =
                !nextState[0].fader[action.faderIndex].muteOn
            return nextState
        case FaderActionTypes.SET_MUTE:
            nextState[0].fader[action.faderIndex].muteOn = !!action.muteOn
            return nextState
        case FaderActionTypes.SHOW_CHANNEL:
            nextState[0].fader[action.faderIndex].showChannel =
                !!action.showChannel
            return nextState
        case FaderActionTypes.SHOW_IN_MINI_MONITOR: //faderIndexz // showInMiniMonitor
            nextState[0].fader[action.faderIndex].showInMiniMonitor =
                !!action.showInMiniMonitor
            return nextState
        case FaderActionTypes.IGNORE_AUTOMATION: //channel // ignoreAutomation
            if (action.state === undefined) {
                nextState[0].fader[action.faderIndex].ignoreAutomation =
                    !nextState[0].fader[action.faderIndex].ignoreAutomation
            } else {
                nextState[0].fader[action.faderIndex].ignoreAutomation =
                    !!action.state
            }
            return nextState
        case FaderActionTypes.X_MIX: //none
            nextState[0].fader.forEach((item, index) => {
                if (!state[0].fader[index].ignoreAutomation) {
                    let nextPgmOn = state[0].fader[index].pstOn
                    let nextVoOn = state[0].fader[index].pstVoOn
                    nextState[0].fader[index].pstOn =
                        state[0].fader[index].pgmOn
                    nextState[0].fader[index].pstVoOn =
                        state[0].fader[index].voOn
                    nextState[0].fader[index].pgmOn = nextPgmOn
                    nextState[0].fader[index].voOn = nextVoOn
                }
            })
            return nextState
        case FaderActionTypes.NEXT_MIX: //none
            nextState[0].fader.forEach((item, index) => {
                nextState[0].fader[index].pgmOn = state[0].fader[index].pstOn
                nextState[0].fader[index].voOn = state[0].fader[index].pstVoOn
                nextState[0].fader[index].pstOn = false
                nextState[0].fader[index].pstVoOn = false
            })
            return nextState
        case FaderActionTypes.FADE_TO_BLACK: //none
            nextState[0].fader.forEach((item, index) => {
                nextState[0].fader[index].pgmOn = false
                nextState[0].fader[index].voOn = false
            })
            return nextState
        case FaderActionTypes.CLEAR_PST: //none
            nextState[0].fader.forEach((item, index) => {
                nextState[0].fader[index].pstOn = false
                nextState[0].fader[index].pstVoOn = false
            })
            return nextState
        case FaderActionTypes.SET_CHANNEL_DISABLED:
            if (!nextState[0].fader[action.faderIndex]) return nextState
            nextState[0].fader[action.faderIndex].disabled = action.disabled
            return nextState
        case FaderActionTypes.TOGGLE_AMIX: //channel
            nextState[0].fader[action.faderIndex].amixOn =
                !nextState[0].fader[action.faderIndex].amixOn
            return nextState
        case FaderActionTypes.SET_AMIX: //channel
            nextState[0].fader[action.faderIndex].amixOn = action.state
            return nextState
        case FaderActionTypes.SET_LINK: {
            const wasLinked = nextState[0].fader[action.faderIndex].isLinked
            const currentFader = nextState[0].fader[action.faderIndex]
            if (!currentFader?.capabilities?.isLinkablePrimary) {
                currentFader.isLinked = false
                return nextState
            }
            const nextFaderIndex = action.faderIndex + 1
            const nextFader = nextState[0].fader[nextFaderIndex]
            if (wasLinked) {
                if (!action.linkOn) {
                    const channelsToUnlink =
                        currentFader.assignedChannels?.filter(
                            (channelReference) =>
                                channelReference.borrowedFromFaderIndex != null
                        )
                    if (channelsToUnlink?.length) {
                        channelsToUnlink.forEach((channelReference) => {
                            if (channelReference.borrowedFromFaderIndex == null)
                                return
                            const targetFader =
                                nextState[0].fader[
                                    channelReference.borrowedFromFaderIndex
                                ]
                            if (targetFader) {
                                currentFader.assignedChannels =
                                    currentFader.assignedChannels?.filter(
                                        (ref) => ref !== channelReference
                                    )
                                delete channelReference.borrowedFromFaderIndex
                                targetFader.assignedChannels =
                                    targetFader.assignedChannels ?? []
                                targetFader.assignedChannels.push(
                                    channelReference
                                )
                                targetFader.faderLevel = currentFader.faderLevel
                                targetFader.inputGain = currentFader.inputGain
                            }
                        })
                    }
                }
            } else {
                if (action.linkOn) {
                    const channelsToReassign: ChannelReference[] | undefined =
                        nextFader?.assignedChannels?.map((channel) => ({
                            ...channel,
                            borrowedFromFaderIndex: nextFaderIndex,
                        }))
                    if (
                        channelsToReassign?.length &&
                        nextFader.capabilities?.isLinkableSecondary
                    ) {
                        nextFader.assignedChannels = []
                        currentFader.assignedChannels =
                            currentFader.assignedChannels ?? []
                        currentFader.assignedChannels.push(
                            ...channelsToReassign
                        )
                    }
                }
            }
            currentFader.isLinked = action.linkOn
            if (nextFader?.capabilities?.isLinkableSecondary) {
                nextFader.isLinked = action.linkOn
            }
            return nextState
        }
        case FaderActionTypes.REMOVE_ALL_ASSIGNED_CHANNELS: //channel
            nextState[0].fader.forEach((fader) => {
                fader.assignedChannels = []
            })
            return nextState
        case FaderActionTypes.ASSIGN_ONE_TO_ONE:
            nextState[0].fader.forEach((fader, index) => {
                setAssignedChannel(nextState, {
                    mixerIndex: 0,
                    assigned: true,
                    channelIndex: index,
                    faderIndex: index,
                })
                fader.capabilities = {
                    ...fader.capabilities,
                    isLinkablePrimary: false,
                    isLinkableSecondary: false,
                }
                fader.isLinked = false
            })
            return nextState
        case FaderActionTypes.SET_ASSIGNED_CHANNEL:
            setAssignedChannel(nextState, action)
            return nextState
        case FaderActionTypes.SET_CAPABILITY:
            nextState[0].fader[action.faderIndex].capabilities = {
                ...nextState[0].fader[action.faderIndex].capabilities,
                [action.capability]: action.enabled,
            }
            // remove object if empty:
            if (
                Object.entries(
                    nextState[0].fader[action.faderIndex].capabilities!
                ).length === 0
            ) {
                delete nextState[0].fader[action.faderIndex].capabilities
            }
            return nextState
        case FaderActionTypes.TOGGLE_ALL_MANUAL:
            const isAllManual =
                nextState[0].fader.find((f) => f.ignoreAutomation !== true) ===
                undefined

            if (isAllManual) {
                nextState[0].fader.forEach((f) => {
                    f.ignoreAutomation = false
                })
            } else {
                nextState[0].fader.forEach((f) => {
                    f.ignoreAutomation = true
                })
            }
            return nextState
        case FaderActionTypes.UPDATE_LABEL_LIST:
            Object.entries(action.update).forEach(
                ([index, label]: [string, string]) => {
                    nextState[0].fader[Number(index)].userLabel =
                        label === '' ? undefined : label
                }
            )
            return nextState
        case FaderActionTypes.FLUSH_FADER_LABELS:
            for (const fader of nextState[0].fader) {
                fader.label = ''
            }
            return nextState
        default:
            return nextState
    }
}

function setAssignedChannel(
    nextState: { fader: Fader[] }[],
    action: {
        faderIndex: number
        mixerIndex: number
        channelIndex: number
        assigned: boolean
    }
) {
    let newAssignments: ChannelReference[] =
        nextState[0].fader[action.faderIndex].assignedChannels || []

    if (action.assigned) {
        if (
            !newAssignments.some((channel) => {
                return (
                    channel.mixerIndex === action.mixerIndex &&
                    channel.channelIndex === action.channelIndex
                )
            })
        ) {
            newAssignments.push({
                mixerIndex: action.mixerIndex,
                channelIndex: action.channelIndex,
            })
            newAssignments.sort(
                (n1: ChannelReference, n2: ChannelReference) =>
                    n1.channelIndex - n2.channelIndex
            )
            newAssignments.sort(
                (n1: ChannelReference, n2: ChannelReference) =>
                    n1.mixerIndex - n2.mixerIndex
            )
        }
    } else {
        newAssignments = newAssignments.filter((channel: ChannelReference) => {
            return !(
                channel.channelIndex === action.channelIndex &&
                channel.mixerIndex === action.mixerIndex
            )
        })
    }

    nextState[0].fader[action.faderIndex].assignedChannels = newAssignments
}

function isPgmOnFollowsMixer(
    faderIndex: number,
    fullState: RootState
): boolean {
    const fader = fullState.faders[0].fader[faderIndex]
    const settings = fullState.settings[0]

    if (settings.pgmOnFollowsMixer === PgmOnFollowMixerBehaviour.Global) {
        return true
    }

    if (
        settings.pgmOnFollowsMixer === PgmOnFollowMixerBehaviour.Auto &&
        !fader.ignoreAutomation
    ) {
        return true
    }

    if (
        settings.pgmOnFollowsMixer === PgmOnFollowMixerBehaviour.Manual &&
        fader.ignoreAutomation
    ) {
        return true
    }

    return false
}
