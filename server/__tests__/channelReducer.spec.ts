import { createEnhancedReducer } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    Channel,
    NumberOfChannels,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

import fs from 'fs'
const parsedFullStoreJSON = fs.readFileSync(
    '__tests__/__mocks__/parsedFullStore.json',
    'utf-8'
)

describe('Test redux channelReducer actions', () => {
    // Create an instance of the enhanced reducer before tests
    const reducer = createEnhancedReducer()

    /**
     * TEST SET_OUTPUT_LEVEL:
     */
    it('should return the new output_level state on channels', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        nextState.channels[0].chMixerConnection[0].channel[10].outputLevel = 0.5

        expect(
            reducer(parsedFullStore, {
                type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                mixerIndex: 0,
                channel: 10,
                level: 0.5,
            })
        ).toEqual(nextState)
    })

    /**
     * TEST SET_ASSIGNED_FADER:
     */
    it('should return the new assignedFader state on channels', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        nextState.channels[0].chMixerConnection[0].channel[10].assignedFader = 2

        expect(
            reducer(parsedFullStore, {
                type: ChannelActionTypes.SET_ASSIGNED_FADER,
                mixerIndex: 0,
                channel: 10,
                faderNumber: 2,
            })
        ).toEqual(nextState)
    })

    /**
     * TEST FADE_ACTIVE:
     */
    it('should return the new FADE_ACTIVE state on channels', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        nextState.channels[0].chMixerConnection[0].channel[10].fadeActive = true

        expect(
            reducer(parsedFullStore, {
                type: ChannelActionTypes.FADE_ACTIVE,
                mixerIndex: 0,
                channel: 10,
                active: true,
            })
        ).toEqual(nextState)
    })

    /**
     * TEST SET_COMPLETE_CHANNEL_STATE:
     */
    it('should return the new COMPLETE_CHANNEL_STATE on channels', () => {
        let parsedFullStore = JSON.parse(parsedFullStoreJSON)
        let nextState = JSON.parse(parsedFullStoreJSON)
        let channels: Channel[] = []
        let numberOfChannels: NumberOfChannels[] = [{ numberOfTypeInCh: [24] }]

        for (let i = 0; i < 24; i++) {
            channels.push({
                channelType: 0,
                channelTypeIndex: i,
                assignedFader: i,
                auxLevel: [],
                fadeActive: false,
                outputLevel: 0.75,
            })
            nextState.channels[0].chMixerConnection[0].channel[i].outputLevel =
                0.75
        }

        expect(
            reducer(parsedFullStore, {
                type: ChannelActionTypes.SET_COMPLETE_CH_STATE,
                allState: { chMixerConnection: [{ channel: channels }] },
                numberOfTypeChannels: numberOfChannels,
            })
        ).toEqual(nextState)
    })
})
