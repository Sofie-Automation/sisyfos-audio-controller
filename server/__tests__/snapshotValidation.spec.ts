import { isValidSnapshot } from '../src/utils/snapshotValidation'
import { defaultFadersReducerState } from '../../shared/src/reducers/fadersReducer'
import { defaultChannelsReducerState } from '../../shared/src/reducers/channelsReducer'

const snapshot = (): any => ({
    faderState: defaultFadersReducerState(4)[0],
    channelState: defaultChannelsReducerState([
        { numberOfTypeInCh: [2, 2] },
    ])[0],
})

describe('isValidSnapshot', () => {
    it('accepts a snapshot of the default state', () => {
        expect(isValidSnapshot(snapshot())).toBe(true)
    })

    it('accepts faders and channels missing newer fields', () => {
        const shot = snapshot()
        shot.faderState.fader = [{ faderLevel: 0.75 }]
        shot.channelState.chMixerConnection[0].channel = [{ channelType: 0 }]
        expect(isValidSnapshot(shot)).toBe(true)
    })

    it('accepts empty fader and channel lists', () => {
        expect(
            isValidSnapshot({
                faderState: { fader: [] },
                channelState: { chMixerConnection: [] },
            })
        ).toBe(true)
    })

    it.each([null, [], 'snapshot', 42])('rejects %p', (value) => {
        expect(isValidSnapshot(value)).toBe(false)
    })

    it('rejects a missing faderState or channelState', () => {
        const noFaders = snapshot()
        delete noFaders.faderState
        const noChannels = snapshot()
        delete noChannels.channelState
        expect(isValidSnapshot(noFaders)).toBe(false)
        expect(isValidSnapshot(noChannels)).toBe(false)
    })

    it.each([null, 'fader', [], 1])('rejects a fader entry of %p', (fader) => {
        const shot = snapshot()
        shot.faderState.fader[1] = fader
        expect(isValidSnapshot(shot)).toBe(false)
    })

    it('rejects a mixer connection without a channel array', () => {
        const shot = snapshot()
        shot.channelState.chMixerConnection.push({})
        expect(isValidSnapshot(shot)).toBe(false)
    })

    it('rejects a channel without a numeric channelType', () => {
        const nullChannel = snapshot()
        nullChannel.channelState.chMixerConnection[0].channel[0] = null
        const stringType = snapshot()
        stringType.channelState.chMixerConnection[0].channel[0].channelType =
            '0'
        expect(isValidSnapshot(nullChannel)).toBe(false)
        expect(isValidSnapshot(stringType)).toBe(false)
    })
})
