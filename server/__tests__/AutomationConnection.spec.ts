// Mock the mainClasses module
jest.mock('../src/mainClasses', () => ({
    mixerGenericConnection: {
        checkForAutoResetThreshold: jest.fn(),
        updateOutLevel: jest.fn(),
        updateNextAux: jest.fn(),
        updateMuteState: jest.fn(),
        updateInputGain: jest.fn(),
        updateInputSelector: jest.fn(),
        updateChannelName: jest.fn(),
        updateFadeToBlack: jest.fn(),
        updateOutLevels: jest.fn(),
    },
    automationConnection: null,
    remoteConnections: null,
}))

// Mock the MainThreadHandler module:
import { MainThreadHandlers } from '../src/MainThreadHandler'

const mockMainThreadHandler: Partial<MainThreadHandlers> = {
    updatePartialStore: jest.fn(),
    updateFullClientStore: jest.fn(),
    reIndexAssignedChannelsRelation: jest.fn(),
    cleanUpAssignedChannelsOnFaders: jest.fn(),
    loadMixerPreset: jest.fn(),
    snapshotHandler: {} as any, // Mock other required properties
}

// Before the describe block:
declare global {
    namespace NodeJS {
        interface Global {
            mainThreadHandler: MainThreadHandlers
        }
    }
}

// Mock UDPPort
let messageHandler: (message: any, timeTag?: any, info?: any) => void
const mockUdpInstance = {
    on: jest.fn().mockImplementation((event, handler) => {
        // Store the message handler when it's registered
        if (event === 'message') {
            messageHandler = handler
        }
        return {
            on: jest.fn().mockReturnThis(),
            open: jest.fn(),
        }
    }),
    open: jest.fn(),
    send: jest.fn(),
}
const MockUDPPort = jest.fn().mockImplementation(() => mockUdpInstance)

// Mock the osc module
jest.mock('osc', () => ({
    UDPPort: MockUDPPort,
}))

import { EventEmitter } from 'events'
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { defaultChannelsReducerState } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { defaultFadersReducerState } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { defaultSettingsReducerState } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { store } from '../src/reducers/store'
import { AutomationConnection } from '../src/utils/AutomationConnection'
import osc from 'osc'

// Update the mock to extend EventEmitter
class MockOscConnection extends EventEmitter {
    open() {}
    send() {}
}

describe('AutomationConnection', () => {
    let automation: AutomationConnection
    let mockOscConnection: MockOscConnection
    let messageHandler: any

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
        global.mainThreadHandler = mockMainThreadHandler as any

        // Reset mock implementation
        mockUdpInstance.on.mockReturnThis()

        store.dispatch({
            type: FaderActionTypes.SET_COMPLETE_FADER_STATE,
            numberOfFaders: 8,
            allState: defaultFadersReducerState(8)[0],
        })

        store.dispatch({
            type: ChannelActionTypes.SET_COMPLETE_CH_STATE,
            numberOfTypeChannels: [{ numberOfTypeInCh: [8] }],
            allState: defaultChannelsReducerState([
                { numberOfTypeInCh: [8] },
            ])[0],
        })

        store.dispatch({
            type: SettingsActionTypes.UPDATE_SETTINGS,
            settings: defaultSettingsReducerState,
        })

        // Create automation instance
        automation = new AutomationConnection()
        mockOscConnection = new MockOscConnection()

        // Get the message handler that was registered
        const messageHandlerCall = mockUdpInstance.on.mock.calls.find(
            (call) => call[0] === 'message'
        )
        messageHandler = messageHandlerCall[1]

        // Set up fake timers before handling message
        jest.useFakeTimers()
    })
    describe('initialization', () => {
        it('should create UDP connection with correct settings', () => {
            expect(MockUDPPort).toHaveBeenCalledWith({
                localAddress: '0.0.0.0',
                localPort: 5255,
            })
        })

        it('should set up event listeners', () => {
            expect(mockUdpInstance.on).toHaveBeenCalledWith(
                'ready',
                expect.any(Function)
            )
            expect(mockUdpInstance.on).toHaveBeenCalledWith(
                'message',
                expect.any(Function)
            )
            expect(mockUdpInstance.on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            )
        })
    })

    describe('OSC Message Set State Handling', () => {
        describe('/ch/{value1}/pgm', () => {
            it('The initial state should be', () => {
                const state = store.getState()
                expect(state.faders[0].fader[0].pgmOn).toBe(false)
                expect(state.faders[0].fader[0].voOn).toBe(false)
            })
            it('should set channel PGM state ON', () => {
                messageHandler({
                    address: '/ch/1/pgm',
                    args: [1],
                })

                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].pgmOn).toBe(true)
                expect(state.faders[0].fader[0].voOn).toBe(false)
            })
            it('should set channel PGM state OFF', () => {
                messageHandler({
                    address: '/ch/1/pgm',
                    args: [0],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].pgmOn).toBe(false)
                expect(state.faders[0].fader[0].voOn).toBe(false)
            })
            it('should set channel VO state ON', () => {
                messageHandler({
                    address: '/ch/1/pgm',
                    args: [2],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].pgmOn).toBe(false)
                expect(state.faders[0].fader[0].voOn).toBe(true)
            })
            it('Shold set PGM on with fadeTime 1000ms', () => {
                messageHandler({
                    address: '/ch/1/pgm',
                    args: [1, 1000.0],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].pgmOn).toBe(true)
                expect(state.faders[0].fader[0].voOn).toBe(false)
            })
            it('Shold set PGM off with fadeTime 1000ms', () => {
                messageHandler({
                    address: '/ch/1/pgm',
                    args: [0, 1000.0],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].pgmOn).toBe(false)
                expect(state.faders[0].fader[0].voOn).toBe(false)
            })
        })
        describe('/ch/{value1}/pst', () => {
            it('The initial state should be', () => {
                const state = store.getState()
                expect(state.faders[0].fader[0].pstOn).toBe(false)
            })
            it('should set channel PST state ON', () => {
                messageHandler({
                    address: '/ch/1/pst',
                    args: [1],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].pstOn).toBe(true)
            })
            it('should set channel PST state OFF', () => {
                messageHandler({
                    address: '/ch/1/pst',
                    args: [0],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].pstOn).toBe(false)
            })
        })
        describe('/ch/{value1}/faderlevel', () => {
            it('The initial state should be', () => {
                const state = store.getState()
                expect(state.faders[0].fader[0].faderLevel).toBe(0.75)
            })
            it('should set channel fader level', () => {
                messageHandler({
                    address: '/ch/1/faderlevel',
                    args: [0.5],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].faderLevel).toBe(0.5)
            })
        })
        describe('/ch/{value1}/mute', () => {
            it('The initial state should be', () => {
                const state = store.getState()
                expect(state.faders[0].fader[0].muteOn).toBe(false)
            })
            it('should set channel mute state ON', () => {
                messageHandler({
                    address: '/ch/1/mute',
                    args: [1],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].muteOn).toBe(true)
            })
            it('should set channel mute state OFF', () => {
                messageHandler({
                    address: '/ch/1/mute',
                    args: [0],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].muteOn).toBe(false)
            })
        })
        describe('/ch/{value1}/inputgain', () => {
            it('The initial state should be', () => {
                const state = store.getState()
                expect(state.faders[0].fader[0].inputGain).toBe(0.75)
            })
            it('should set channel input gain', () => {
                messageHandler({
                    address: '/ch/1/inputgain',
                    args: [0.5],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].inputGain).toBe(0.5)
            })
        })
        describe('/ch/{value1}/inputselector', () => {
            it('The initial state should be', () => {
                const state = store.getState()
                expect(state.faders[0].fader[0].inputSelector).toBe(1)
            })
            it('should set channel input selector', () => {
                messageHandler({
                    address: '/ch/1/inputselector',
                    args: [2],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].inputSelector).toBe(2)
            })
        })
        describe('/ch/{value1}/visible', () => {
            it('The initial state should be', () => {
                const state = store.getState()
                expect(state.faders[0].fader[0].showChannel).toBe(true)
            })
            it('should set channel visible state', () => {
                messageHandler({
                    address: '/ch/1/visible',
                    args: [0],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].showChannel).toBe(false)
            })
        })
        describe('/setchannel/{value1}', () => {
            it('should set channel state', () => {
                messageHandler({
                    address: '/setchannel/1',
                    args: [
                        JSON.stringify({
                            faderLevel: 0.75,
                            pgmOn: true,
                            voOn: false,
                            pstOn: true,
                            showChannel: true,
                            muteOn: true,
                            inputGain: 0.75,
                            inputSelector: 1,
                            label: 'CH 1',
                        }),
                    ],
                })
                jest.runAllTimers()

                const state = store.getState()
                expect(state.faders[0].fader[0].showChannel).toBe(true)
                expect(state.faders[0].fader[0].pgmOn).toBe(true)
                expect(state.faders[0].fader[0].voOn).toBe(false)
                expect(state.faders[0].fader[0].pstOn).toBe(true)
                expect(state.faders[0].fader[0].faderLevel).toBe(0.75)
                expect(state.faders[0].fader[0].muteOn).toBe(true)
                expect(state.faders[0].fader[0].inputGain).toBe(0.75)
                expect(state.faders[0].fader[0].inputSelector).toBe(1)
                expect(state.faders[0].fader[0].label).toBe('CH 1')
            })
        })
    })
    describe('OSC Message Get State Handling', () => {
        describe('ping pong', () => {
            it('should respond to a ping message', () => {
                messageHandler(
                    {
                        address: '/ping/12',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/pong',
                        args: [{ type: 's', value: '12' }],
                    },
                    '127.0.0.1',
                    5255
                )
            })
        })
        describe('Full Sisyfos State', () => {
            it('/info should send full state', () => {
                messageHandler(
                    {
                        address: '/state/full',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/state/full',
                        args: [
                            {
                                type: 's',
                                value: '{"channel":[{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 1","muteOn":false},{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 2","muteOn":false},{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 3","muteOn":false},{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 4","muteOn":false},{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 5","muteOn":false},{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 6","muteOn":false},{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 7","muteOn":false},{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"inputGain":0.75,"inputSelector":1,"label":"CH 8","muteOn":false}]}',
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
        })
        describe('/ch/{value1}/state', () => {
            it('should send channel state', () => {
                // Need to include info about where to send the response
                messageHandler(
                    {
                        address: '/ch/1/state',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )

                jest.runAllTimers()

                // The expected response should match the OSC message format
                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/ch/01/state',
                        args: [
                            {
                                type: 's',
                                value: '{"channel":[{"faderLevel":0.75,"pgmOn":false,"voOn":false,"pstOn":false,"showChannel":true,"label":"CH 1","muteOn":false,"inputGain":0.75,"inputSelector":1}]}',
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
        })
        describe('All channel state options', () => {
            it('/ch/{value1}/pgm/state should return channel PGM state', () => {
                messageHandler(
                    {
                        address: '/ch/1/pgm/state',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/ch/01/pgm/state',
                        args: [
                            {
                                type: 'i',
                                value: false,
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
            it('/ch/{value1}/pst/state should return channel PST state', () => {
                messageHandler(
                    {
                        address: '/ch/1/pst/state',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/ch/01/pst/state',
                        args: [
                            {
                                type: 'i',
                                value: false,
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
            it('/ch/{value1}/faderlevel/state should return channel fader level', () => {
                messageHandler(
                    {
                        address: '/ch/1/faderlevel/state',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/ch/01/faderlevel/state',
                        args: [
                            {
                                type: 'f',
                                value: 0.75,
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
            it('/ch/{value1}/mute/state should return channel mute state', () => {
                messageHandler(
                    {
                        address: '/ch/1/mute/state',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/ch/01/mute/state',
                        args: [
                            {
                                type: 'i',
                                value: false,
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
            it('/ch/{value1}/inputgain/state should return channel input gain', () => {
                messageHandler(
                    {
                        address: '/ch/1/inputgain/state',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/ch/01/inputgain/state',
                        args: [
                            {
                                type: 'f',
                                value: 0.75,
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
            it('/ch/{value1}/inputselector/state should return channel input selector', () => {
                messageHandler(
                    {
                        address: '/ch/1/inputselector/state',
                        args: [],
                    },
                    undefined,
                    {
                        address: '127.0.0.1',
                        port: 5255,
                    }
                )
                jest.runAllTimers()

                expect(mockUdpInstance.send).toHaveBeenCalledWith(
                    {
                        address: '/ch/01/inputselector/state',
                        args: [
                            {
                                type: 'i',
                                value: 1,
                            },
                        ],
                    },
                    '127.0.0.1',
                    5255
                )
            })
        })
    })
})
