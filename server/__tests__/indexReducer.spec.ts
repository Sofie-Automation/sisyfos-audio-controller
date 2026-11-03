import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { createEnhancedReducer } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import fs from 'fs'
const parsedEmptyStoreJSON = fs.readFileSync(
    '__tests__/__mocks__/parsedEmptyStore.json',
    'utf-8'
)

describe('Test initialize store', () => {
    let parsedInitialStore = JSON.parse(parsedEmptyStoreJSON)
    const reducer = createEnhancedReducer()
    it('should return the initial state of the whole Store', () => {
        // ** Uncomment to update initial settings state:
        // fs.writeFileSync('__tests__/__mocks__/parsedEmptyStore-UPDATE.json', JSON.stringify(data))

        // Call reducer with empty store
        // Test if it returns the initial state
        // Using SNAP_RECALL action as this doesn't change the state
        expect(
            reducer(JSON.parse(parsedEmptyStoreJSON), {
                type: FaderActionTypes.SNAP_RECALL,
                snapshotIndex: 0,
            })
        ).toEqual(parsedInitialStore)
    })

    it('should not mutate the previous state for nested reducer updates', () => {
        const previousState = JSON.parse(parsedEmptyStoreJSON)
        const baselineState = JSON.parse(parsedEmptyStoreJSON)

        reducer(previousState, {
            type: SettingsActionTypes.SET_MIXER_ONLINE,
            mixerIndex: 0,
            mixerOnline: true,
        })
        expect(previousState).toEqual(baselineState)

        reducer(previousState, {
            type: FaderActionTypes.SET_FADER_LEVEL,
            faderIndex: 0,
            level: 0.5,
        })
        expect(previousState).toEqual(baselineState)

        reducer(previousState, {
            type: ChannelActionTypes.SET_OUTPUT_LEVEL,
            mixerIndex: 0,
            channel: 0,
            level: 0.5,
        })
        expect(previousState).toEqual(baselineState)
    })
})
