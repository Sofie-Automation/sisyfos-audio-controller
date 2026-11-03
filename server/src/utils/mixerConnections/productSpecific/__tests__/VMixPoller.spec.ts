import { VMixPoller } from '../VMixPoller'

jest.useFakeTimers()

describe('VMixPoller', () => {
    let sendRequestMock: jest.Mock
    let isConnectedMock: jest.Mock
    let onFallbackMock: jest.Mock
    let poller: VMixPoller

    const DEFAULT_POLL_INTERVAL_MS = 80
    const DEFAULT_MIN_POLL_INTERVAL_MS = 20
    const FALLBACK_POLL_INTERVAL_MS = 500

    beforeEach(() => {
        sendRequestMock = jest.fn()
        isConnectedMock = jest.fn(() => true)
        onFallbackMock = jest.fn()
        poller = new VMixPoller(
            sendRequestMock,
            isConnectedMock,
            onFallbackMock,
            DEFAULT_POLL_INTERVAL_MS,
            DEFAULT_MIN_POLL_INTERVAL_MS,
            FALLBACK_POLL_INTERVAL_MS
        )
        jest.clearAllTimers()
    })

    afterEach(() => {
        poller.stop()
    })

    describe('start', () => {
        it('should send initial XML request in 80ms', () => {
            poller.start()

            jest.advanceTimersByTime(80)

            expect(sendRequestMock).toHaveBeenCalledTimes(1)
        })

        it('should schedule fallback poll after sending request', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // Advance to fallback time (500ms from request)
            jest.advanceTimersByTime(500)

            expect(onFallbackMock).toHaveBeenCalledTimes(1)
            expect(sendRequestMock).toHaveBeenCalledTimes(2)
        })

        it('should not send request if disconnected', () => {
            isConnectedMock.mockReturnValue(false)

            poller.start()

            jest.advanceTimersByTime(100)

            expect(sendRequestMock).not.toHaveBeenCalled()
        })
    })

    describe('onResponseReceived', () => {
        it('should cancel fallback poll when response received', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // Receive response before fallback
            poller.onResponseReceived()

            // Advance past fallback time
            jest.advanceTimersByTime(500)

            // Fallback should not have triggered
            expect(onFallbackMock).not.toHaveBeenCalled()
        })

        it('should schedule next poll after default interval when response received', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            poller.onResponseReceived()

            // Should send next request 80ms after response received
            jest.advanceTimersByTime(80)

            expect(sendRequestMock).toHaveBeenCalledTimes(2)
        })

        it('should account for processing time when scheduling next poll', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // Simulate 30ms of processing time
            jest.advanceTimersByTime(30)
            poller.onResponseReceived()

            // Should send next request only 50ms later (80 - 30)
            jest.advanceTimersByTime(50)

            expect(sendRequestMock).toHaveBeenCalledTimes(2)
        })

        it('should respect minimum poll interval', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // Simulate 70ms of processing time
            jest.advanceTimersByTime(70)
            poller.onResponseReceived()

            // Should wait at least 20ms (minimum interval)
            jest.advanceTimersByTime(19)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            jest.advanceTimersByTime(1)
            expect(sendRequestMock).toHaveBeenCalledTimes(2)
        })

        it('should handle multiple responses received in quick succession', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // Receive first response
            poller.onResponseReceived()

            // Receive second response immediately (e.g., duplicate or delayed packet)
            // This should cancel the first scheduled poll and reschedule
            poller.onResponseReceived()

            // Should still respect minimum interval from the last request time
            // Since both responses came immediately, we still need 80ms from the original request
            jest.advanceTimersByTime(79)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            jest.advanceTimersByTime(1)
            expect(sendRequestMock).toHaveBeenCalledTimes(2)
        })
    })

    describe('stop', () => {
        it('should cancel all pending timeouts', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            poller.stop()

            // Advance past all timeouts
            jest.advanceTimersByTime(1000)

            // Should not send any more requests
            expect(sendRequestMock).toHaveBeenCalledTimes(1)
        })

        it('should not throw when called multiple times', () => {
            poller.start()

            expect(() => {
                poller.stop()
                poller.stop()
                poller.stop()
            }).not.toThrow()
        })
    })

    describe('continuous polling cycle', () => {
        it('should maintain polling cycle with regular responses', () => {
            poller.start()

            // First request
            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // Response received, next request
            poller.onResponseReceived()
            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(2)

            // Response received, next request
            poller.onResponseReceived()
            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(3)

            // Fallback should never trigger
            expect(onFallbackMock).not.toHaveBeenCalled()
        })

        it('should use fallback when no response received', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // No response received, fallback triggers (500ms from first request)
            jest.advanceTimersByTime(500)
            expect(onFallbackMock).toHaveBeenCalledTimes(1)
            expect(sendRequestMock).toHaveBeenCalledTimes(2)

            // Still no response, next fallback triggers (500ms from second request)
            jest.advanceTimersByTime(500)
            expect(onFallbackMock).toHaveBeenCalledTimes(2)
            expect(sendRequestMock).toHaveBeenCalledTimes(3)
        })

        it('should recover from fallback mode when response received', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // No response, fallback triggers
            jest.advanceTimersByTime(500)
            expect(onFallbackMock).toHaveBeenCalledTimes(1)
            expect(sendRequestMock).toHaveBeenCalledTimes(2)

            // Response received, should switch back to normal interval
            poller.onResponseReceived()
            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(3)

            // Receive response before fallback would trigger
            poller.onResponseReceived()

            // Should not have triggered fallback
            expect(onFallbackMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('connection state handling', () => {
        it('should not send request when disconnected during timeout', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            isConnectedMock.mockReturnValue(false)

            poller.onResponseReceived()
            jest.advanceTimersByTime(80)

            expect(sendRequestMock).toHaveBeenCalledTimes(1)
        })

        it('should handle reconnection gracefully', () => {
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            isConnectedMock.mockReturnValue(false)
            poller.onResponseReceived()
            jest.advanceTimersByTime(80)

            expect(sendRequestMock).toHaveBeenCalledTimes(1)

            // Reconnect
            isConnectedMock.mockReturnValue(true)
            poller.start()

            jest.advanceTimersByTime(80)
            expect(sendRequestMock).toHaveBeenCalledTimes(2)
        })
    })
})
