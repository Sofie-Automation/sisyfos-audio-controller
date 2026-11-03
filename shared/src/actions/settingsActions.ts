import { CustomPages, PageType } from '../reducers/settingsReducer'

export enum SettingsActionTypes {
    TOGGLE_SHOW_SETTINGS = 'TOGGLE_SHOW_SETTINGS',
    TOGGLE_SHOW_PAGES_SETUP = 'TOGGLE_SHOW_PAGES_SETUP',
    TOGGLE_SHOW_LABEL_SETTINGS = 'TOGGLE_SHOW_LABEL_SETTINGS',
    TOGGLE_SHOW_CHAN_STRIP = 'TOGGLE_SHOW_CHAN_STRIP',
    TOGGLE_SHOW_CHAN_STRIP_FULL = 'TOGGLE_SHOW_CHAN_STRIP_FULL',
    TOGGLE_SHOW_OPTION = 'TOGGLE_SHOW_OPTION',
    TOGGLE_SHOW_MONITOR_OPTIONS = 'TOGGLE_SHOW_MONITOR_OPTIONS',
    TOGGLE_SHOW_STORAGE = 'TOGGLE_SHOW_STORAGE',
    TOGGLE_SHOW_CHAN_LAYOUT_SETTINGS = 'TOGGLE_SHOW_CHAN_LAYOUT_SETTINGS',
    UPDATE_SETTINGS = 'UPDATE_SETTINGS',
    SET_MIXER_ONLINE = 'SET_MIXER_ONLINE',
    SET_SERVER_ONLINE = 'SET_SERVER_ONLINE',
    SET_PAGE = 'SET_PAGE',
    SET_PAGES_LIST = 'SET_PAGES_LIST',
}

export type SettingsActions =
    | { type: SettingsActionTypes.TOGGLE_SHOW_SETTINGS }
    | { type: SettingsActionTypes.TOGGLE_SHOW_PAGES_SETUP }
    | { type: SettingsActionTypes.TOGGLE_SHOW_LABEL_SETTINGS }
    | { type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP; channel: number }
    | { type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP_FULL; channel: number }
    | { type: SettingsActionTypes.TOGGLE_SHOW_OPTION; channel: number }
    | { type: SettingsActionTypes.TOGGLE_SHOW_MONITOR_OPTIONS; channel: number }
    | { type: SettingsActionTypes.TOGGLE_SHOW_STORAGE }
    | {
          type: SettingsActionTypes.TOGGLE_SHOW_CHAN_LAYOUT_SETTINGS
          channel: number
      }
    | { type: SettingsActionTypes.UPDATE_SETTINGS; settings: any }
    | {
          type: SettingsActionTypes.SET_MIXER_ONLINE
          mixerIndex: number
          mixerOnline: boolean
      }
    | { type: SettingsActionTypes.SET_SERVER_ONLINE; serverOnline: boolean }
    | {
          type: SettingsActionTypes.SET_PAGE
          pageType: PageType
          id: number | string
      }
    | { type: SettingsActionTypes.SET_PAGES_LIST; customPages: CustomPages[] }
