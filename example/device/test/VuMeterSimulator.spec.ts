import { VuMeterSimulator } from '../src/vu/VuMeterSimulator'

describe('VuMeterSimulator', () => {
    it('produces distinct levels per channel at the same time', () => {
        const simulator = new VuMeterSimulator({
            channelCount: 4,
            intervalMs: 50,
        })

        const levels = Array.from({ length: 4 }, (_, channel) =>
            simulator.levelAt(channel, 1.5)
        )

        expect(
            new Set(levels.map((level) => level.toFixed(3))).size
        ).toBeGreaterThan(1)
        for (const level of levels) {
            expect(level).toBeGreaterThanOrEqual(0.12)
            expect(level).toBeLessThanOrEqual(0.88)
        }
    })

    it('returns zero for muted channels', () => {
        const simulator = new VuMeterSimulator({
            channelCount: 2,
            intervalMs: 50,
            isMuted: (channel) => channel === 1,
        })

        expect(simulator.levelAt(1, 0)).toBe(0)
        expect(simulator.levelAt(0, 0)).toBeGreaterThan(0)
    })

    it('emits vuLevel messages on each tick', () => {
        jest.useFakeTimers()
        const simulator = new VuMeterSimulator({
            channelCount: 2,
            intervalMs: 40,
        })
        const handler = jest.fn()

        simulator.start(handler)
        jest.advanceTimersByTime(40)

        expect(handler).toHaveBeenCalled()
        expect(handler.mock.calls[0][0]).toMatchObject({
            type: 'vuLevel',
            channel: 0,
            vuIndex: 0,
        })

        simulator.stop()
        jest.useRealTimers()
    })
})
