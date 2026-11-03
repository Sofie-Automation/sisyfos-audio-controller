export interface VuLevelMessage {
    type: 'vuLevel'
    channel: number
    level: number
    /** Sub-meter index within the channel (maps to Sisyfos `vuIndex`). Default 0. */
    vuIndex?: number
}

export interface VuMeterSimulatorOptions {
    channelCount: number
    intervalMs: number
    /** Base angular speed in radians per second. */
    speed?: number
    /** Per-channel phase offset in radians. */
    phaseStep?: number
    /** Per-channel speed multiplier added on top of base speed. */
    speedStep?: number
    /** Minimum normalized level at sine trough. */
    minLevel?: number
    /** Maximum normalized level at sine peak. */
    maxLevel?: number
    isMuted?: (channel: number) => boolean
}

export class VuMeterSimulator {
    private readonly startTime = Date.now()
    private timer: ReturnType<typeof setInterval> | null = null
    private readonly onTick: (
        listener: (message: VuLevelMessage) => void
    ) => void

    constructor(private readonly options: VuMeterSimulatorOptions) {
        this.onTick = (listener) => {
            const elapsedSeconds = (Date.now() - this.startTime) / 1000
            const speed = options.speed ?? 1.2
            const phaseStep = options.phaseStep ?? Math.PI / 4
            const speedStep = options.speedStep ?? 0.08
            const minLevel = options.minLevel ?? 0.12
            const maxLevel = options.maxLevel ?? 0.88
            const span = maxLevel - minLevel

            for (let channel = 0; channel < options.channelCount; channel++) {
                if (options.isMuted?.(channel)) {
                    listener({ type: 'vuLevel', channel, level: 0, vuIndex: 0 })
                    continue
                }

                const phase = channel * phaseStep
                const channelSpeed = speed + channel * speedStep
                const wave = Math.sin(elapsedSeconds * channelSpeed + phase)
                const level = minLevel + ((wave + 1) / 2) * span

                listener({ type: 'vuLevel', channel, level, vuIndex: 0 })
            }
        }
    }

    start(listener: (message: VuLevelMessage) => void): void {
        this.stop()
        this.timer = setInterval(() => {
            this.onTick(listener)
        }, this.options.intervalMs)
    }

    stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer)
            this.timer = null
        }
    }

    /** Compute level for a channel at an arbitrary time (for tests). */
    levelAt(channel: number, elapsedSeconds: number): number {
        const speed = this.options.speed ?? 1.2
        const phaseStep = this.options.phaseStep ?? Math.PI / 4
        const speedStep = this.options.speedStep ?? 0.08
        const minLevel = this.options.minLevel ?? 0.12
        const maxLevel = this.options.maxLevel ?? 0.88
        const span = maxLevel - minLevel

        if (this.options.isMuted?.(channel)) {
            return 0
        }

        const phase = channel * phaseStep
        const channelSpeed = speed + channel * speedStep
        const wave = Math.sin(elapsedSeconds * channelSpeed + phase)
        return minLevel + ((wave + 1) / 2) * span
    }
}
