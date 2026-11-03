import { createEnhancedReducer } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

import fs from 'fs'
const parsedFullStoreJSON = fs.readFileSync(
    '__tests__/__mocks__/parsedFullStore.json',
    'utf-8'
)

describe('Test redux settingsReducer actions', () => {
    const reducer = createEnhancedReducer()
    /**
     * TEST TOGGLE_SHOW_CHAN_STRIP:
     */

    it('should return the new showChanStrip state on settings', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        nextState.settings[0].showChanStrip = 3
        expect(
            reducer(parsedFullStore, {
                type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP,
                channel: 3,
            })
        ).toEqual(nextState)

        parsedFullStore = JSON.parse(parsedFullStoreJSON)
        expect(
            reducer(nextState, {
                type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP,
                channel: -1,
            })
        ).toEqual(parsedFullStore)
    })

    /**
     * TEST TOGGLE_SHOW_OPTION:
     */

    it('should return the new showOptions state on settings', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        nextState.settings[0].showOptions = 3
        expect(
            reducer(parsedFullStore, {
                type: SettingsActionTypes.TOGGLE_SHOW_OPTION,
                channel: 3,
            })
        ).toEqual(nextState)

        parsedFullStore = JSON.parse(parsedFullStoreJSON)
        expect(
            reducer(nextState, {
                type: SettingsActionTypes.TOGGLE_SHOW_OPTION,
                channel: 3,
            })
        ).toEqual(parsedFullStore)
    })

    /**
     * TEST TOGGLE_SHOW_SETTINGS:
     */

    it('should return the new showSettings state on settings', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        nextState.settings[0].showSettings = true
        expect(
            reducer(parsedFullStore, {
                type: SettingsActionTypes.TOGGLE_SHOW_SETTINGS,
            })
        ).toEqual(nextState)
    })

    /**
     * TEST TOGGLE_SHOW_STORAGE:
     */

    it('should return the new showStorage state on settings', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        nextState.settings[0].showStorage = true
        expect(
            reducer(parsedFullStore, {
                type: SettingsActionTypes.TOGGLE_SHOW_STORAGE,
            })
        ).toEqual(nextState)
    })

    /**
     * TEST UPDATE_SETTINGS:
     */

    it('should return the new settings state on settings', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        expect(
            reducer(parsedFullStore, {
                type: SettingsActionTypes.UPDATE_SETTINGS,
                settings: parsedFullStore.settings[0],
            })
        ).toEqual(nextState)
    })
})
