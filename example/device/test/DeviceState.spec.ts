import { DeviceState } from '../src/state/DeviceState'
import { ProtocolError } from '../src/state/types'

describe('DeviceState', () => {
    it('creates 8 default channels', () => {
        const state = new DeviceState(8)
        const snapshot = state.getSnapshot()

        expect(snapshot.online).toBe(true)
        expect(snapshot.channels).toHaveLength(8)
        expect(snapshot.channels[0]).toEqual({
            index: 0,
            faderLevel: 0.75,
            inputGain: 0.75,
            inputSelector: 1,
            mute: false,
            pfl: false,
            amixOn: false,
            nextAuxLevel: 0,
            auxLevels: [0, 0, 0, 0],
            name: 'CH1',
            fx: expect.arrayContaining([0]),
        })
        expect(snapshot.channels[0].fx).toHaveLength(22)
        expect(snapshot.inputSelectorCount).toBe(4)
        expect(snapshot.auxSendCount).toBe(4)
    })

    it('emits feedback when fader level changes', () => {
        const state = new DeviceState(8)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setFaderLevel(0, 0.5, 'command')

        expect(state.getChannel(0).faderLevel).toBe(0.5)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith({
            type: 'faderLevel',
            channel: 0,
            level: 0.5,
            source: 'command',
        })
    })

    it('does not emit when value is unchanged', () => {
        const state = new DeviceState(8)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setFaderLevel(0, 0.75)

        expect(handler).not.toHaveBeenCalled()
    })

    it('clamps fader level to 0..1', () => {
        const state = new DeviceState(8)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setFaderLevel(0, 1.5)
        state.setFaderLevel(1, -0.5)

        expect(state.getChannel(0).faderLevel).toBe(1)
        expect(state.getChannel(1).faderLevel).toBe(0)
        expect(handler).toHaveBeenCalledTimes(2)
    })

    it('emits feedback when aux level changes', () => {
        const state = new DeviceState(8, 4, 4)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setAuxLevel(0, 2, 0.5, 'hardware')

        expect(state.getChannel(0).auxLevels[2]).toBe(0.5)
        expect(handler).toHaveBeenCalledWith({
            type: 'auxLevel',
            channel: 0,
            auxIndex: 2,
            level: 0.5,
            source: 'hardware',
        })
    })

    it('throws ProtocolError for invalid auxIndex', () => {
        const state = new DeviceState(8, 4, 4)

        expect(() => state.setAuxLevel(0, -1, 0.5)).toThrow(ProtocolError)
        expect(() => state.setAuxLevel(0, 4, 0.5)).toThrow(ProtocolError)
    })

    it('emits feedback when amix changes', () => {
        const state = new DeviceState(8)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setAMix(0, true, 'hardware')

        expect(state.getChannel(0).amixOn).toBe(true)
        expect(handler).toHaveBeenCalledWith({
            type: 'amixOn',
            channel: 0,
            amixOn: true,
            source: 'hardware',
        })
    })

    it('emits feedback when input selector changes', () => {
        const state = new DeviceState(8, 4)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setInputSelector(0, 3, 'hardware')

        expect(state.getChannel(0).inputSelector).toBe(3)
        expect(handler).toHaveBeenCalledWith({
            type: 'inputSelector',
            channel: 0,
            selected: 3,
            source: 'hardware',
        })
    })

    it('throws ProtocolError for invalid input selector', () => {
        const state = new DeviceState(8, 4)

        expect(() => state.setInputSelector(0, 0)).toThrow(ProtocolError)
        expect(() => state.setInputSelector(0, 5)).toThrow(ProtocolError)
    })

    it('emits feedback when input gain changes', () => {
        const state = new DeviceState(8)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setInputGain(0, 0.5, 'hardware')

        expect(state.getChannel(0).inputGain).toBe(0.5)
        expect(handler).toHaveBeenCalledWith({
            type: 'inputGain',
            channel: 0,
            level: 0.5,
            source: 'hardware',
        })
    })

    it('emits feedback when fx changes', () => {
        const state = new DeviceState(8)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.setFx(0, 12, 0.5, 'hardware')

        expect(state.getChannel(0).fx[12]).toBe(0.5)
        expect(handler).toHaveBeenCalledWith({
            type: 'fx',
            channel: 0,
            fxParam: 12,
            level: 0.5,
            source: 'hardware',
        })
    })

    it('throws ProtocolError for invalid fxParam', () => {
        const state = new DeviceState(8)

        expect(() => state.setFx(0, 22, 0.5)).toThrow(ProtocolError)
        expect(() => state.setFx(0, -1, 0.5)).toThrow(ProtocolError)
    })

    it('throws ProtocolError for invalid channel', () => {
        const state = new DeviceState(8)

        expect(() => state.setMute(8, true)).toThrow(ProtocolError)
        expect(() => state.setMute(-1, true)).toThrow(ProtocolError)
    })

    it('resets all channels to defaults', () => {
        const state = new DeviceState(2)
        state.setFaderLevel(0, 0.2)
        state.setMute(1, true)

        const handler = jest.fn()
        state.on('feedback', handler)
        state.resetAll('hardware')

        expect(state.getChannel(0).faderLevel).toBe(0.75)
        expect(state.getChannel(1).mute).toBe(false)
        expect(handler.mock.calls.length).toBeGreaterThan(0)
        expect(
            handler.mock.calls.every(([msg]) => msg.source === 'hardware')
        ).toBe(true)
    })

    it('loads preset channel state and emits presetLoaded', () => {
        const state = new DeviceState(2, 4, 4)
        const handler = jest.fn()
        state.on('feedback', handler)

        state.loadPreset(
            'test-preset.json',
            [
                {
                    index: 0,
                    faderLevel: 0.4,
                    inputGain: 0.5,
                    inputSelector: 2,
                    mute: true,
                    pfl: false,
                    amixOn: true,
                    nextAuxLevel: 0.3,
                    auxLevels: [0.1, 0, 0, 0],
                    name: 'Loaded',
                    fx: Array.from({ length: 22 }, () => 0),
                },
            ],
            'command'
        )

        expect(state.getChannel(0).faderLevel).toBe(0.4)
        expect(state.getChannel(0).mute).toBe(true)
        expect(state.getChannel(0).name).toBe('Loaded')
        expect(handler).toHaveBeenCalledWith({
            type: 'presetLoaded',
            presetName: 'test-preset.json',
            source: 'command',
        })
    })
})
