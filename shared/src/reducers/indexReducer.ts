import { combineReducers } from 'redux'
import {
    Channels,
    channels,
    defaultChannelsReducerState,
} from './channelsReducer'
import {
    defaultSettingsReducerState,
    Settings,
    settings,
} from './settingsReducer'
import { Faders, faders, defaultFadersReducerState } from './fadersReducer'
import { FaderActions } from '../actions/faderActions'
import { ChannelActions } from '../actions/channelActions'
import { SettingsActions } from '../actions/settingsActions'

export interface RootState {
    faders: Faders[]
    channels: Channels[]
    settings: Settings[]
}

export type RootAction = FaderActions | ChannelActions | SettingsActions

// Default Root State:
const DEFAULT_STATE: RootState = {
    faders: defaultFadersReducerState(0),
    channels: defaultChannelsReducerState([{ numberOfTypeInCh: [1] }]),
    settings: defaultSettingsReducerState,
}

export const createEnhancedReducer = () => {
    const reducer = (
        state: RootState | undefined,
        action: RootAction
    ): RootState => {
        const currentState = state || DEFAULT_STATE

        const nextState = {
            faders: faders(
                currentState.faders || DEFAULT_STATE.faders,
                action,
                currentState
            ),
            channels: channels(
                currentState.channels || DEFAULT_STATE.channels,
                action,
                currentState
            ),
            settings: settings(
                currentState.settings || DEFAULT_STATE.settings,
                action
            ),
        }
        return nextState
    }

    return reducer
}
