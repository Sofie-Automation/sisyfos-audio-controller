import { FxParam } from '../constants/MixerProtocolInterface'
import { Fader, Faders } from '../reducers/fadersReducer'

// Move all consts to this type
export enum FaderActionTypes {
    SET_VU_REDUCTION_LEVEL = 'SET_VU_REDUCTION_LEVEL',
    SET_COMPLETE_FADER_STATE = 'SET_COMPLETE_FADER_STATE',
    SET_SINGLE_FADER_STATE = 'SET_SINGLE_FADER_STATE',
    SET_FADER_LEVEL = 'SET_FADER_LEVEL',
    SET_INPUT_GAIN = 'SET_INPUT_GAIN',
    SET_INPUT_SELECTOR = 'SET_INPUT_SELECTOR',
    SET_FADER_LABEL = 'SET_FADER_LABEL',
    SET_USER_LABEL = 'SET_USER_LABEL',
    SET_FADER_FX = 'SET_FADER_FX',
    SET_FADER_MONITOR = 'SET_FADER_MONITOR',
    SET_ASSIGNED_CHANNEL = 'SET_ASSIGNED_CHANNEL',
    REMOVE_ALL_ASSIGNED_CHANNELS = 'REMOVE_ALL_ASSIGNED_CHANNELS',
    ASSIGN_ONE_TO_ONE = 'ASSIGN_ONE_TO_ONE',
    TOGGLE_PGM = 'TOGGLE_PGM',
    TOGGLE_PGM_UI = 'TOGGLE_PGM_UI',
    SET_PGM = 'SET_PGM',
    TOGGLE_VO = 'TOGGLE_VO',
    SET_VO = 'SET_VO',
    TOGGLE_SLOW_FADE = 'TOGGLE_SLOW_FADE',
    TOGGLE_PST = 'TOGGLE_PST',
    SET_PST = 'SET_PST',
    SET_PST_VO = 'SET_PST_VO',
    TOGGLE_PFL = 'TOGGLE_PFL',
    SET_PFL = 'SET_PFL',
    TOGGLE_MUTE = 'TOGGLE_MUTE',
    SET_MUTE = 'SET_MUTE',
    SHOW_CHANNEL = 'SHOW_CHANNEL',
    SHOW_IN_MINI_MONITOR = 'SHOW_IN_MINI_MONITOR',
    IGNORE_AUTOMATION = 'IGNORE_AUTOMATION',
    X_MIX = 'X_MIX',
    NEXT_MIX = 'NEXT_MIX',
    FADE_TO_BLACK = 'FADE_TO_BLACK',
    UPDATE_LABEL_LIST = 'UPDATE_LABEL_LIST',
    FLUSH_FADER_LABELS = 'FLUSH_FADER_LABELS',
    CLEAR_PST = 'CLEAR_PST',
    SNAP_RECALL = 'SNAP_RECALL',
    SET_CHANNEL_DISABLED = 'SET_CHANNEL_DISABLED',
    TOGGLE_AMIX = 'TOGGLE_AMIX',
    SET_AMIX = 'SET_AMIX',
    SET_CAPABILITY = 'SET_CAPABILITY',
    TOGGLE_ALL_MANUAL = 'TOGGLE_ALL_MANUAL',
    SET_LINK = 'SET_LINK',
}

export type FaderActions =
    | {
          type: FaderActionTypes.SET_VU_REDUCTION_LEVEL
          faderIndex: number
          level: number
      }
    | {
          type: FaderActionTypes.SET_COMPLETE_FADER_STATE
          numberOfFaders: number
          allState: Faders
      }
    | {
          type: FaderActionTypes.SET_SINGLE_FADER_STATE
          faderIndex: number
          state: Fader
      }
    | {
          type: FaderActionTypes.SET_FADER_LEVEL
          faderIndex: number
          level: number
      }
    | {
          type: FaderActionTypes.SET_INPUT_GAIN
          faderIndex: number
          level: number
      }
    | {
          type: FaderActionTypes.SET_INPUT_SELECTOR
          faderIndex: number
          selected: number
      }
    | {
          type: FaderActionTypes.SET_FADER_LABEL
          faderIndex: number
          label: string
      }
    | {
          type: FaderActionTypes.SET_USER_LABEL
          faderIndex: number
          label: string
      }
    | {
          type: FaderActionTypes.SET_FADER_FX
          fxParam: FxParam
          faderIndex: number
          level: number
      }
    | {
          type: FaderActionTypes.SET_FADER_MONITOR
          faderIndex: number
          auxIndex: number
      }
    | {
          type: FaderActionTypes.SET_ASSIGNED_CHANNEL
          faderIndex: number
          mixerIndex: number
          channelIndex: number
          assigned: boolean
      }
    | { type: FaderActionTypes.REMOVE_ALL_ASSIGNED_CHANNELS }
    | { type: FaderActionTypes.ASSIGN_ONE_TO_ONE }
    | { type: FaderActionTypes.TOGGLE_PGM; faderIndex: number }
    | { type: FaderActionTypes.TOGGLE_PGM_UI; faderIndex: number }
    | { type: FaderActionTypes.SET_PGM; faderIndex: number; pgmOn: boolean }
    | { type: FaderActionTypes.TOGGLE_VO; faderIndex: number }
    | { type: FaderActionTypes.SET_VO; faderIndex: number; voOn: boolean }
    | { type: FaderActionTypes.TOGGLE_SLOW_FADE; faderIndex: number }
    | { type: FaderActionTypes.TOGGLE_PST; faderIndex: number }
    | { type: FaderActionTypes.SET_PST; faderIndex: number; pstOn: boolean }
    | {
          type: FaderActionTypes.SET_PST_VO
          faderIndex: number
          pstVoOn: boolean
      }
    | { type: FaderActionTypes.TOGGLE_PFL; faderIndex: number }
    | { type: FaderActionTypes.SET_PFL; faderIndex: number; pflOn: boolean }
    | { type: FaderActionTypes.TOGGLE_MUTE; faderIndex: number }
    | { type: FaderActionTypes.SET_MUTE; faderIndex: number; muteOn: boolean }
    | {
          type: FaderActionTypes.SHOW_CHANNEL
          faderIndex: number
          showChannel: boolean
      }
    | {
          type: FaderActionTypes.SHOW_IN_MINI_MONITOR
          faderIndex: number
          showInMiniMonitor: boolean
      }
    | {
          type: FaderActionTypes.IGNORE_AUTOMATION
          faderIndex: number
          state?: boolean
      }
    | { type: FaderActionTypes.X_MIX }
    | { type: FaderActionTypes.NEXT_MIX }
    | { type: FaderActionTypes.FADE_TO_BLACK }
    | {
          type: FaderActionTypes.UPDATE_LABEL_LIST
          update: Record<number, string>
      }
    | { type: FaderActionTypes.FLUSH_FADER_LABELS }
    | { type: FaderActionTypes.CLEAR_PST }
    | {
          type: FaderActionTypes.SNAP_RECALL
          snapshotIndex: number
      }
    | {
          type: FaderActionTypes.SET_CHANNEL_DISABLED
          faderIndex: number
          disabled: boolean
      }
    | { type: FaderActionTypes.TOGGLE_AMIX; faderIndex: number }
    | { type: FaderActionTypes.SET_LINK; faderIndex: number; linkOn: boolean }
    | { type: FaderActionTypes.SET_AMIX; faderIndex: number; state: boolean }
    | {
          type: FaderActionTypes.SET_CAPABILITY
          faderIndex: number
          capability: string
          enabled: boolean
      }
    | { type: FaderActionTypes.TOGGLE_ALL_MANUAL }
