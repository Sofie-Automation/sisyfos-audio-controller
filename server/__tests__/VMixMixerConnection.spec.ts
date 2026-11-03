import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

const mockDispatch = jest.fn()
const mockSendVuLevel = jest.fn()
const mockUpdatePartialStore = jest.fn()

let mockState: any = {
    settings: [{ mixers: [] }],
    channels: [{ chMixerConnection: [] }],
    faders: [{ fader: [] }],
}

jest.mock('../src/reducers/store', () => ({
    store: {
        dispatch: mockDispatch,
    },
    get state() {
        return mockState
    },
}))

jest.mock('../src/utils/vuServer', () => ({
    sendVuLevel: (...args: any[]) => mockSendVuLevel(...args),
}))

jest.mock('../src/utils/logger', () => ({
    logger: {
        trace: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

jest.mock('../src/mainClasses', () => ({
    remoteConnections: {},
}))

import { VMixMixerConnection } from '../src/utils/mixerConnections/VMixMixerConnection'

const createConnection = (lastMasterState?: {
    volume: number
    muted: boolean
}) => {
    const connection: any = Object.create(VMixMixerConnection.prototype)

    connection.mixerIndex = 0
    connection.mixerProtocol = {
        channelTypes: [
            { channelTypeName: 'DEFAULT' },
            { channelTypeName: 'MASTER' },
        ],
    } as any
    connection.lastMasterState = lastMasterState

    return connection
}

const createMasterState = ({
    muted,
    outputLevel = 1,
    muteOn = false,
    pgmOn = false,
    voOn = false,
}: {
    muted: boolean
    outputLevel?: number
    muteOn?: boolean
    pgmOn?: boolean
    voOn?: boolean
}) => {
    mockState = {
        settings: [
            {
                mixers: [{ mixerOnline: true }],
                voLevel: 100,
            },
        ],
        channels: [
            {
                chMixerConnection: [
                    {
                        channel: [
                            {
                                channelType: 1,
                                outputLevel,
                                fadeActive: false,
                            },
                        ],
                    },
                ],
            },
        ],
        faders: [
            {
                fader: [
                    {
                        muteOn,
                        pgmOn,
                        voOn,
                        assignedChannels: [{ mixerIndex: 0, channelIndex: 0 }],
                    },
                ],
            },
        ],
    }

    return {
        volume: 100,
        muted,
        audioMeter: {
            left: 1,
            right: 1,
        },
    } as any
}

const dispatchedActions = () => mockDispatch.mock.calls.map((call) => call[0])

describe('VMixMixerConnection master feedback', () => {
    beforeEach(() => {
        mockDispatch.mockReset()
        mockSendVuLevel.mockReset()
        mockUpdatePartialStore.mockReset()
        ;(global as any).mainThreadHandler = {
            updatePartialStore: mockUpdatePartialStore,
        }
    })

    it('marks the master as on-air on the initial unmuted feedback', () => {
        const connection = createConnection()
        const master = createMasterState({ muted: false, outputLevel: 1 })

        ;(connection as any)['handleMasterState'](master)

        expect(dispatchedActions()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: FaderActionTypes.SET_PGM,
                    faderIndex: 0,
                    pgmOn: true,
                }),
                expect.objectContaining({
                    type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                    channel: 0,
                    mixerIndex: 0,
                    level: 1,
                }),
            ])
        )
        expect(mockUpdatePartialStore).toHaveBeenCalledWith(0)
    })

    it('clears the master on-air state when vMix mutes it', () => {
        const connection = createConnection({ volume: 1, muted: false })
        const master = createMasterState({
            muted: true,
            outputLevel: 1,
            muteOn: false,
            pgmOn: true,
        })

        ;(connection as any)['handleMasterState'](master)

        expect(dispatchedActions()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: FaderActionTypes.SET_MUTE,
                    faderIndex: 0,
                    muteOn: true,
                }),
                expect.objectContaining({
                    type: FaderActionTypes.SET_PGM,
                    faderIndex: 0,
                    pgmOn: false,
                }),
            ])
        )
        expect(mockUpdatePartialStore).toHaveBeenCalledWith(0)
    })

    it('restores the master on-air state when vMix unmutes it', () => {
        const connection = createConnection({ volume: 1, muted: true })
        const master = createMasterState({
            muted: false,
            outputLevel: 1,
            muteOn: true,
            pgmOn: false,
        })

        ;(connection as any)['handleMasterState'](master)

        expect(dispatchedActions()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: FaderActionTypes.SET_MUTE,
                    faderIndex: 0,
                    muteOn: false,
                }),
                expect.objectContaining({
                    type: FaderActionTypes.SET_PGM,
                    faderIndex: 0,
                    pgmOn: true,
                }),
            ])
        )
        expect(mockUpdatePartialStore).toHaveBeenCalledWith(0)
    })
})
