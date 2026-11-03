import { ChannelActionTypes } from '../actions/channelActions'
import { RootAction, RootState } from './indexReducer'

export interface Channels {
    chMixerConnection: ChMixerConnection[]
}

export interface ChMixerConnection {
    channel: Array<Channel>
}

export interface Channel {
    channelType: number
    channelTypeIndex: number
    assignedFader: number
    label?: string
    fadeActive: boolean
    outputLevel: number
    auxLevel: number[]
    privateData?: {
        [key: string]: string
    }
}

export interface NumberOfChannels {
    numberOfTypeInCh: number[]
}

export const defaultChannelsReducerState = (
    numberOfChannels: NumberOfChannels[]
): Channels[] => {
    let defaultObj: Channels[] = [
        {
            chMixerConnection: [],
        },
    ]

    for (
        let mixerIndex = 0;
        mixerIndex < numberOfChannels.length;
        mixerIndex++
    ) {
        let totalNumberOfChannels = 0
        defaultObj[0].chMixerConnection.push({ channel: [] })
        numberOfChannels[mixerIndex].numberOfTypeInCh.forEach(
            (channelTypeSize: any, typeIndex: number) => {
                for (let index = 0; index < channelTypeSize; index++) {
                    defaultObj[0].chMixerConnection[mixerIndex].channel[
                        totalNumberOfChannels
                    ] = {
                        channelType: typeIndex,
                        channelTypeIndex: index,
                        assignedFader: totalNumberOfChannels,
                        fadeActive: false,
                        outputLevel: 0.0,
                        auxLevel: [],
                    }
                    totalNumberOfChannels++
                }
            }
        )
    }

    return defaultObj
}

export const channels = (
    state = defaultChannelsReducerState([{ numberOfTypeInCh: [1] }]),
    action: RootAction,
    fullState?: RootState
): Array<Channels> => {
    if (!(action.type in ChannelActionTypes)) {
        return state
    }
    let nextState = [structuredClone(state[0])]

    if (
        'mixerIndex' in action &&
        nextState[0].chMixerConnection[action.mixerIndex] === undefined
    ) {
        return nextState
    }
    if (
        'mixerIndex' in action &&
        'channel' in action &&
        nextState[0].chMixerConnection[action.mixerIndex]?.channel[
            action.channel
        ] === undefined
    ) {
        return nextState
    }

    switch (action.type) {
        case ChannelActionTypes.SET_OUTPUT_LEVEL:
            nextState[0].chMixerConnection[action.mixerIndex].channel[
                action.channel
            ].outputLevel = action.level
            return nextState
        case ChannelActionTypes.SET_COMPLETE_CH_STATE:
            nextState = defaultChannelsReducerState(action.numberOfTypeChannels)

            action.allState.chMixerConnection.forEach(
                (
                    allStateChMixerConnection: ChMixerConnection,
                    mixerIndex: number
                ) => {
                    let typeIndex = 0
                    let chIndexInType = 0
                    let chIndexInState = 0
                    allStateChMixerConnection.channel.forEach(
                        (allStateChannel: any, index: number) => {
                            // Only proceed if channel type is equal or greater than the current type index
                            // To avoid setting state for channel types that has been removed, or ingesting channels out of order
                            if (
                                allStateChannel.channelType >= typeIndex &&
                                action.numberOfTypeChannels[mixerIndex]
                                    .numberOfTypeInCh.length >
                                    allStateChannel.channelType
                            ) {
                                // If new channel type:
                                if (allStateChannel.channelType > typeIndex) {
                                    typeIndex = allStateChannel.channelType
                                    chIndexInType = 0
                                    // Set channel index in state to the first channel of the new type
                                    // Can happen if number of channels has been changed in settings
                                    chIndexInState =
                                        nextState[0].chMixerConnection[
                                            mixerIndex
                                        ].channel.findIndex(
                                            (channel: Channel) =>
                                                channel.channelType ===
                                                typeIndex
                                        )
                                }

                                // Only set channel state if it exists in next state
                                // And only if it does not exceed the number of channels in the type
                                // This is to avoid setting state for channels that has been removed
                                if (
                                    nextState[0].chMixerConnection[mixerIndex]
                                        .channel[chIndexInState] !==
                                        undefined &&
                                    action.numberOfTypeChannels[mixerIndex]
                                        .numberOfTypeInCh[typeIndex] >
                                        chIndexInType &&
                                    chIndexInState > -1
                                ) {
                                    nextState[0].chMixerConnection[
                                        mixerIndex
                                    ].channel[chIndexInState] =
                                        allStateChMixerConnection.channel[index]
                                    nextState[0].chMixerConnection[
                                        mixerIndex
                                    ].channel[chIndexInState].channelTypeIndex =
                                        chIndexInType
                                    nextState[0].chMixerConnection[
                                        mixerIndex
                                    ].channel[chIndexInState].channelType =
                                        typeIndex
                                }
                            }
                            chIndexInState++
                            chIndexInType++
                        }
                    )
                }
            )

            return nextState
        case ChannelActionTypes.SET_SINGLE_CH_STATE:
            nextState[0].chMixerConnection[0].channel[action.channelIndex] =
                action.state
            return nextState
        case ChannelActionTypes.FADE_ACTIVE:
            nextState[0].chMixerConnection[action.mixerIndex].channel[
                action.channel
            ].fadeActive = !!action.active
            return nextState
        case ChannelActionTypes.SET_ASSIGNED_FADER:
            if (
                nextState[0].chMixerConnection[action.mixerIndex].channel
                    .length > action.channel
            ) {
                nextState[0].chMixerConnection[action.mixerIndex].channel[
                    action.channel
                ].assignedFader = action.faderNumber
            }
            return nextState
        case ChannelActionTypes.SET_AUX_LEVEL:
            let auxLevels =
                nextState[0].chMixerConnection[action.mixerIndex].channel[
                    action.channel
                ].auxLevel
            if (action.auxIndex >= auxLevels.length) {
                for (let i = 0; i < action.auxIndex; i++) {
                    if (auxLevels[i] === null) {
                        auxLevels[action.auxIndex] = -1
                    }
                }
            }
            auxLevels[action.auxIndex] = action.level
            nextState[0].chMixerConnection[action.mixerIndex].channel[
                action.channel
            ].auxLevel = auxLevels
            return nextState
        case ChannelActionTypes.SET_PRIVATE:
            if (
                !nextState[0].chMixerConnection[action.mixerIndex].channel[
                    action.channel
                ].privateData
            ) {
                nextState[0].chMixerConnection[action.mixerIndex].channel[
                    action.channel
                ].privateData = {}
            }
            nextState[0].chMixerConnection[action.mixerIndex].channel[
                action.channel
            ].privateData![action.tag] = action.value
            return nextState
        case ChannelActionTypes.SET_CHANNEL_LABEL:
            nextState[0].chMixerConnection[action.mixerIndex].channel[
                action.channel
            ].label = action.label
            return nextState
        case ChannelActionTypes.FLUSH_CHANNEL_LABELS:
            for (const mixer of nextState[0].chMixerConnection) {
                for (const ch of mixer.channel) {
                    ch.label = undefined
                }
            }
            return nextState
        default:
            return nextState
    }
}
