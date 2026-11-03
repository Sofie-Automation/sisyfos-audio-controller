import { VMixConnectionWatchdog } from '../VMixConnectionWatchdog'

jest.useFakeTimers()

describe('VMixConnectionWatchdog', () => {
    let onTimeoutMock: jest.Mock
    let watchdog: VMixConnectionWatchdog
    const TIMEOUT_MS = 2000

    beforeEach(() => {
        onTimeoutMock = jest.fn()
        watchdog = new VMixConnectionWatchdog(onTimeoutMock, TIMEOUT_MS)
        jest.clearAllTimers()
    })

    afterEach(() => {
        watchdog.stop()
    })

    describe('start', () => {
        it('should trigger timeout after 2 seconds', () => {
            watchdog.start()

            jest.advanceTimersByTime(1999)
            expect(onTimeoutMock).not.toHaveBeenCalled()

            jest.advanceTimersByTime(1)
            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })

        it('should not trigger multiple timeouts when started multiple times', () => {
            watchdog.start()
            watchdog.start()
            watchdog.start()

            jest.advanceTimersByTime(2000)

            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })

        it('should replace existing timeout when started again', () => {
            watchdog.start()

            jest.advanceTimersByTime(1000)

            watchdog.start()

            jest.advanceTimersByTime(1999)
            expect(onTimeoutMock).not.toHaveBeenCalled()

            jest.advanceTimersByTime(1)
            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('stop', () => {
        it('should cancel pending timeout', () => {
            watchdog.start()

            jest.advanceTimersByTime(1000)

            watchdog.stop()

            jest.advanceTimersByTime(1000)

            expect(onTimeoutMock).not.toHaveBeenCalled()
        })

        it('should not throw when called multiple times', () => {
            watchdog.start()

            expect(() => {
                watchdog.stop()
                watchdog.stop()
                watchdog.stop()
            }).not.toThrow()
        })

        it('should not throw when called without start', () => {
            expect(() => {
                watchdog.stop()
            }).not.toThrow()
        })
    })

    describe('typical usage patterns', () => {
        it('should monitor connection with periodic resets', () => {
            watchdog.start()

            // Simulate periodic XML responses
            for (let i = 0; i < 10; i++) {
                jest.advanceTimersByTime(500)
                watchdog.start()
            }

            // Should never timeout
            expect(onTimeoutMock).not.toHaveBeenCalled()
        })

        it('should trigger when responses stop', () => {
            watchdog.start()

            // Responses coming in regularly
            jest.advanceTimersByTime(500)
            watchdog.start()

            jest.advanceTimersByTime(500)
            watchdog.start()

            jest.advanceTimersByTime(500)
            watchdog.start()

            // No more responses, watchdog should trigger after 2s
            jest.advanceTimersByTime(2000)

            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })

        it('should handle start-stop-start cycle', () => {
            watchdog.start()

            jest.advanceTimersByTime(1000)

            watchdog.stop()

            jest.advanceTimersByTime(5000)
            expect(onTimeoutMock).not.toHaveBeenCalled()

            watchdog.start()

            jest.advanceTimersByTime(2000)
            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })

        it('should handle connection loss and recovery', () => {
            // Connection established
            watchdog.start()

            // Regular updates
            jest.advanceTimersByTime(100)
            watchdog.start()

            jest.advanceTimersByTime(100)
            watchdog.start()

            // Connection lost, watchdog stops
            watchdog.stop()

            jest.advanceTimersByTime(5000)
            expect(onTimeoutMock).not.toHaveBeenCalled()

            // Connection reestablished
            watchdog.start()

            jest.advanceTimersByTime(100)
            watchdog.start()

            jest.advanceTimersByTime(100)
            watchdog.start()

            // Should still work after recovery
            jest.advanceTimersByTime(2000)
            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('edge cases', () => {
        it('should handle very rapid start calls', () => {
            watchdog.start()

            for (let i = 0; i < 1000; i++) {
                watchdog.start()
            }

            jest.advanceTimersByTime(1999)
            expect(onTimeoutMock).not.toHaveBeenCalled()

            jest.advanceTimersByTime(1)
            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })

        it('should only trigger timeout once', () => {
            watchdog.start()

            jest.advanceTimersByTime(2000)
            expect(onTimeoutMock).toHaveBeenCalledTimes(1)

            jest.advanceTimersByTime(5000)
            expect(onTimeoutMock).toHaveBeenCalledTimes(1)
        })

        it('should not interfere with multiple instances', () => {
            const onTimeout2Mock = jest.fn()
            const watchdog2 = new VMixConnectionWatchdog(
                onTimeout2Mock,
                TIMEOUT_MS
            )

            watchdog.start()
            watchdog2.start()

            jest.advanceTimersByTime(1000)

            watchdog.stop()

            jest.advanceTimersByTime(1000)

            expect(onTimeoutMock).not.toHaveBeenCalled()
            expect(onTimeout2Mock).toHaveBeenCalledTimes(1)

            watchdog2.stop()
        })
    })
})
