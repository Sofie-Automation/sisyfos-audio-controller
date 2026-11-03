import { SettingsActionTypes } from '../actions/settingsActions'
import { RootAction } from './indexReducer'

export enum PageType {
    All,
    CustomPage,
}

export enum PgmOnFollowMixerBehaviour {
    None = 0,
    Global = 1,
    Manual = 2,
    Auto = 3,
}

export enum FirstInRowButtonType {
    NONE = 0,
    AUTO_MANUAL = 1,
}

export enum SecondInRowButtonType {
    NONE = 0,
    MUTE = 1,
}

export enum ThirdInRowButtonType {
    NONE = 0,
    AMIX = 1,
    LINK_CHANNELS = 2,
    CHANNEL_OPTIONS = 3,
}

export enum SecondOutRowButtonType {
    NONE = 0,
    VO = 1,
    SLOW_FADE = 2,
}

export enum ThirdOutRowButtonType {
    NONE = 0,
    PST = 1,
    PFL = 2,
    CUE_NEXT = 3,
}

export interface Settings {
    /* Sisyfos Settings Version: */
    sisyfosVersion?: string

    /** UI state (non persistant) */
    showSettings: boolean
    showPagesSetup: boolean
    showLabelSettings: boolean
    showChanStrip: number
    showChanStripFull: number
    showChanLayoutSettings: number
    showOptions: number | false
    showMonitorOptions: number
    showStorage: boolean
    currentPage: {
        type: PageType
        start?: number
        id?: string
    }
    customPages: Array<CustomPages>

    /** User config */
    numberOfMixers: number
    mixers: MixerSettings[]
    enableRemoteFader: boolean
    remoteFaderMidiInputPort: string
    remoteFaderMidiOutputPort: string
    numberOfFaders: number
    fadeTime: number // Default fade time for PGM ON - OFF
    voFadeTime: number // Default fade time for VO ON - OFF
    voLevel: number // Relative level of PGM in %
    autoResetLevel: number // Autoreset before pgm on, if level is lower than in %
    firstInRowButton: FirstInRowButtonType
    secondInRowButton: SecondInRowButtonType
    thirdInRowButton: ThirdInRowButtonType
    secondOutRowButton: SecondOutRowButtonType
    thirdOutRowButton: ThirdOutRowButtonType
    labelControlsIgnoreAutomation: boolean
    labelIgnorePrefix: string
    pgmOnFollowsMixer: PgmOnFollowMixerBehaviour
    offtubeMode: boolean
    enablePages: boolean
    numberOfCustomPages: number
    chanStripFollowsPFL: boolean
    labelType: 'automatic' | 'user' | 'automation' | 'channel'

    /** Connection state */
    serverOnline: boolean

    // Deprecated:
    automationMode?: boolean
    showPfl?: boolean
}

export interface CustomPages {
    id: string
    label: string
    faders: Array<number>
}

export interface MixerSettings {
    mixerProtocol: string
    deviceIp: string
    devicePort: number
    deviceUrl: string
    deviceToken: string
    mixerId: string
    protocolLatency: number // If a protocol has latency and feedback, the amount of time before enabling receiving data from channel again
    mixerMidiInputPort: string
    mixerMidiOutputPort: string
    numberOfChannelsInType: Array<number>
    numberOfAux: number
    nextSendAux: number
    mixerOnline: boolean
    localIp: string
    localOscPort: number
    channelMatrixPrefix?: string // Channel prefix for VMix mixers (e.g., "EXT")
}

export const defaultSettingsReducerState: Array<Settings> = [
    {
        showSettings: false,
        showPagesSetup: false,
        showLabelSettings: false,
        showChanStrip: -1,
        showChanStripFull: -1,
        showChanLayoutSettings: -1,
        showOptions: false,
        showMonitorOptions: -1,
        showStorage: false,
        currentPage: { type: PageType.All },
        numberOfMixers: 1,
        customPages: [],
        mixers: [
            {
                mixerProtocol: 'sslSystemT',
                deviceIp: '0.0.0.0',
                devicePort: 10024,
                deviceUrl: '',
                deviceToken: '',
                mixerId: '',
                protocolLatency: 220,
                mixerMidiInputPort: '',
                mixerMidiOutputPort: '',
                numberOfAux: 0,
                nextSendAux: -1,
                numberOfChannelsInType: [8],
                mixerOnline: false,
                localIp: '0.0.0.0',
                localOscPort: 1234,
            },
        ],
        enableRemoteFader: false,
        remoteFaderMidiInputPort: '',
        remoteFaderMidiOutputPort: '',
        numberOfFaders: 8,
        voLevel: 30,
        autoResetLevel: 5,
        firstInRowButton: FirstInRowButtonType.AUTO_MANUAL,
        secondInRowButton: SecondInRowButtonType.MUTE,
        thirdInRowButton: ThirdInRowButtonType.NONE,
        secondOutRowButton: SecondOutRowButtonType.VO,
        thirdOutRowButton: ThirdOutRowButtonType.CUE_NEXT,
        labelControlsIgnoreAutomation: false,
        labelIgnorePrefix: '#',
        pgmOnFollowsMixer: PgmOnFollowMixerBehaviour.None,
        offtubeMode: false,
        fadeTime: 120,
        voFadeTime: 280,
        enablePages: true,
        numberOfCustomPages: 4,
        chanStripFollowsPFL: true,
        serverOnline: true,
        labelType: 'automatic',
    },
]

export const settings = (
    state = defaultSettingsReducerState,
    action: RootAction
): Array<Settings> => {
    if (!(action.type in SettingsActionTypes)) {
        return state
    }
    let nextState = [structuredClone(state[0])]

    switch (action.type) {
        case SettingsActionTypes.TOGGLE_SHOW_SETTINGS:
            nextState[0].showSettings = !nextState[0].showSettings
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_PAGES_SETUP:
            nextState[0].showPagesSetup = !nextState[0].showPagesSetup
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_LABEL_SETTINGS:
            nextState[0].showLabelSettings = !nextState[0].showLabelSettings
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP:
            if (nextState[0].showChanStrip !== action.channel) {
                nextState[0].showChanStrip = action.channel
            } else {
                nextState[0].showChanStrip = -1
            }
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP_FULL:
            if (nextState[0].showChanStripFull !== action.channel) {
                nextState[0].showChanStripFull = action.channel
            } else {
                nextState[0].showChanStripFull = -1
            }
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_CHAN_LAYOUT_SETTINGS:
            if (nextState[0].showChanLayoutSettings !== action.channel) {
                nextState[0].showChanLayoutSettings = action.channel
            } else {
                nextState[0].showChanLayoutSettings = -1
            }
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_MONITOR_OPTIONS:
            if (nextState[0].showMonitorOptions !== action.channel) {
                nextState[0].showMonitorOptions = action.channel
            } else {
                nextState[0].showMonitorOptions = -1
            }
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_OPTION:
            nextState[0].showOptions =
                typeof nextState[0].showOptions === 'number'
                    ? false
                    : action.channel
            return nextState
        case SettingsActionTypes.TOGGLE_SHOW_STORAGE:
            nextState[0].showStorage = !nextState[0].showStorage
            return nextState
        case SettingsActionTypes.SET_PAGE:
            let currentPage
            if (typeof action.id === 'string') {
                currentPage = {
                    type: action.pageType,
                    id: action.id,
                    start: 0,
                }
            } else {
                currentPage = {
                    type: action.pageType,
                    id: '',
                    start: action.id,
                }
            }
            nextState[0].currentPage = currentPage
            return nextState
        case SettingsActionTypes.SET_PAGES_LIST:
            nextState[0].customPages = action.customPages
            return nextState
        case SettingsActionTypes.SET_MIXER_ONLINE:
            nextState[0].mixers[action.mixerIndex || 0].mixerOnline =
                action.mixerOnline
            return nextState
        case SettingsActionTypes.SET_SERVER_ONLINE:
            nextState[0].serverOnline = action.serverOnline
            return nextState
        case SettingsActionTypes.UPDATE_SETTINGS:
            nextState[0] = action.settings

            // ignore UI state:
            nextState[0].showSettings = state[0].showSettings || false
            nextState[0].showOptions = state[0].showOptions || false
            nextState[0].showPagesSetup = state[0].showPagesSetup || false
            nextState[0].showMonitorOptions = state[0].showMonitorOptions || -1
            nextState[0].showStorage = state[0].showStorage || false
            nextState[0].showChanStrip = state[0].showChanStrip || -1
            nextState[0].serverOnline = state[0].serverOnline || true
            nextState[0].currentPage = state[0].currentPage
            nextState[0].customPages = state[0].customPages

            if (!nextState[0].mixers) {
                nextState = [Object.assign({}, defaultSettingsReducerState[0])]
            }
            return nextState
        default:
            return nextState
    }
}
