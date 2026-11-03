export class VMixPoller {
    private pollingTimeout: NodeJS.Timeout | null = null
    private lastRequestTime: number = 0

    constructor(
        private readonly sendRequest: () => void,
        private readonly isConnected: () => boolean,
        private readonly onFallbackTriggered: () => void,
        private readonly defaultPollIntervalMs: number,
        private readonly defaultMinPollIntervalMs: number,
        private readonly fallbackPollIntervalMs: number
    ) {}

    start() {
        this.scheduleNextPoll()
    }

    onResponseReceived() {
        this.scheduleNextPoll()
    }

    stop() {
        this.clear()
    }

    private clear() {
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout)
            this.pollingTimeout = null
        }
    }

    private scheduleNextPoll() {
        this.clear()

        if (!this.isConnected()) {
            return
        }

        const elapsed = this.lastRequestTime
            ? performance.now() - this.lastRequestTime
            : 0
        const delay = Math.max(
            this.defaultMinPollIntervalMs,
            this.defaultPollIntervalMs - elapsed
        )

        this.pollingTimeout = setTimeout(() => {
            this.sendRequestAndScheduleFallback()
        }, delay)
    }

    private scheduleFallbackPoll() {
        this.clear()

        if (!this.isConnected()) {
            return
        }

        this.pollingTimeout = setTimeout(() => {
            this.onFallbackTriggered()
            this.sendRequestAndScheduleFallback()
        }, this.fallbackPollIntervalMs)
    }

    private sendRequestAndScheduleFallback() {
        if (!this.isConnected()) {
            return
        }
        this.lastRequestTime = performance.now()
        this.sendRequest()
        this.scheduleFallbackPoll()
    }
}
