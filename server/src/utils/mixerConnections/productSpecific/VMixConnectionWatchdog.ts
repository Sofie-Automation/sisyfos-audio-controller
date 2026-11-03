export class VMixConnectionWatchdog {
    private watchdogTimeout: NodeJS.Timeout | null = null

    constructor(
        private readonly onTimeout: () => void,
        private readonly timeoutMs: number
    ) {}

    start() {
        this.stop()
        this.watchdogTimeout = setTimeout(() => {
            this.onTimeout()
        }, this.timeoutMs)
    }

    stop() {
        if (this.watchdogTimeout) {
            clearTimeout(this.watchdogTimeout)
            this.watchdogTimeout = null
        }
    }
}
