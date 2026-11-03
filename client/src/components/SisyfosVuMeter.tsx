import * as React from 'react'

import '../assets/css/VuMeter.css'

const FPS_INTERVAL = 1000 / 15

export interface SisyfosMeterConfig {
    min?: number
    max?: number
    zero?: number
    test?: number
}

export interface SisyfosVuMeterProps {
    level?: number
    getLevel?: () => number
    meterConfig?: SisyfosMeterConfig
}

interface SisyfosVuMeterState {
    isVisible: boolean
}

const COLORS = {
    LOWER: 'rgb(0, 122, 37)',
    MIDDLE: 'rgb(53, 167, 0)',
    UPPER: 'rgb(206, 0, 0)',
    WINDOW_PEAK_LOW: 'rgb(16, 56, 0)',
    WINDOW_PEAK_HIGH: 'rgb(100, 100, 100)',
    TOTAL_PEAK_LOW: 'rgb(64, 64, 64)',
    TOTAL_PEAK_HIGH: 'rgb(255, 0, 0)',
}

export class SisyfosVuMeter extends React.Component<
    SisyfosVuMeterProps,
    SisyfosVuMeterState
> {
    private canvas: HTMLCanvasElement | undefined
    private canvasContext: CanvasRenderingContext2D | undefined
    private animationFrame: number | undefined
    private intersectionObserver: IntersectionObserver | null = null

    private totalHeight = 400
    private totalPeak = 0
    private windowPeak = 0
    private windowLast = 0
    private meterMax = 1
    private meterMin = 0
    private range = 1
    private meterTest = 0.75
    private meterZero = 0.75
    private readonly WINDOW = 2000

    private previousValue = -1
    private value = 0

    private lastUpdateTime = Date.now()

    constructor(props: SisyfosVuMeterProps) {
        super(props)
        this.state = {
            isVisible: false,
        }
        this.applyMeterConfig(props.meterConfig)
    }

    componentDidMount() {
        this.initIntersectionObserver()
        this.initializeCanvas()
        this.paintVuMeter()
    }

    componentDidUpdate(prevProps: SisyfosVuMeterProps) {
        if (prevProps.meterConfig !== this.props.meterConfig) {
            this.applyMeterConfig(this.props.meterConfig)
            this.initializeCanvas()
        }
    }

    componentWillUnmount() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame)
        }

        if (this.intersectionObserver && this.canvas) {
            this.intersectionObserver.unobserve(this.canvas)
            this.intersectionObserver.disconnect()
        }
    }

    shouldComponentUpdate(): boolean {
        const currentTime = Date.now()
        if (currentTime - this.lastUpdateTime < FPS_INTERVAL) {
            return false
        }
        this.lastUpdateTime = currentTime
        return true
    }

    private applyMeterConfig(meterConfig?: SisyfosMeterConfig) {
        this.meterMax = meterConfig?.max ?? 1
        this.meterMin = meterConfig?.min ?? 0
        this.range = this.meterMax - this.meterMin
        this.meterTest = meterConfig?.test ?? 0.75
        this.meterZero = meterConfig?.zero ?? 0.75
    }

    private getCurrentLevel() {
        if (this.props.getLevel) {
            return this.props.getLevel()
        }
        return this.props.level ?? 0
    }

    private initializeCanvas() {
        if (!this.canvas) return

        this.canvasContext = this.canvas.getContext('2d', {
            antialias: false,
            stencil: false,
            preserveDrawingBuffer: true,
        }) as CanvasRenderingContext2D

        this.totalHeight =
            (this.canvas.height ?? 400) / (this.meterMax - this.meterMin)
    }

    private initIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                this.setState({ isVisible: entry.isIntersecting })
            },
            {
                threshold: 0.1,
            }
        )

        if (this.canvas) {
            this.intersectionObserver.observe(this.canvas)
        }
    }

    private getTotalPeak = () => {
        if (this.value > this.totalPeak) {
            this.totalPeak = this.value
        }
        return this.totalHeight * this.totalPeak
    }

    private getWindowPeak = () => {
        if (
            this.value > this.windowPeak ||
            Date.now() - this.windowLast > this.WINDOW
        ) {
            this.windowPeak = this.value
            this.windowLast = Date.now()
        }
        return this.totalHeight * this.windowPeak
    }

    private calcLower = () => {
        return this.totalHeight * Math.min(this.value, this.meterTest)
    }

    private calcMiddle = () => {
        const val = Math.max(
            this.meterTest,
            Math.min(this.value, this.meterZero)
        )
        return this.totalHeight * (val - this.meterTest) + 1
    }

    private calcUpper = () => {
        const val = Math.max(this.meterZero, this.value)
        return this.totalHeight * (val - this.meterZero) + 1
    }

    private setRef = (el: HTMLCanvasElement) => {
        this.canvas = el
        this.initializeCanvas()
        this.paintVuMeter()
    }

    private resetTotalPeak = () => {
        this.totalPeak = 0
    }

    private paintVuMeter = () => {
        if (!this.canvas || !this.canvasContext) {
            this.animationFrame = requestAnimationFrame(this.paintVuMeter)
            return
        }

        this.value = this.getCurrentLevel()

        if (this.value === this.previousValue) {
            window.requestAnimationFrame(this.paintVuMeter)
            return
        }
        this.previousValue = this.value

        this.canvasContext.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        )

        this.canvasContext.fillStyle = COLORS.LOWER
        this.canvasContext.fillRect(
            0,
            this.totalHeight - this.calcLower(),
            this.canvas.height,
            this.calcLower()
        )

        this.canvasContext.fillStyle = COLORS.MIDDLE
        this.canvasContext.fillRect(
            0,
            this.totalHeight * (this.range - this.meterTest) -
                this.calcMiddle(),
            this.canvas.width,
            this.calcMiddle()
        )

        this.canvasContext.fillStyle = COLORS.UPPER
        this.canvasContext.fillRect(
            0,
            this.totalHeight * (this.range - this.meterZero) - this.calcUpper(),
            this.canvas.width,
            this.calcUpper()
        )

        const windowPeak = this.getWindowPeak()
        this.canvasContext.fillStyle =
            this.windowPeak < this.meterZero
                ? COLORS.WINDOW_PEAK_LOW
                : COLORS.WINDOW_PEAK_HIGH
        this.canvasContext.fillRect(
            0,
            this.totalHeight - windowPeak,
            this.canvas.width,
            2
        )

        this.canvasContext.fillStyle =
            this.totalPeak < this.meterZero
                ? COLORS.TOTAL_PEAK_LOW
                : COLORS.TOTAL_PEAK_HIGH
        this.canvasContext.fillRect(
            0,
            this.totalHeight - this.getTotalPeak(),
            this.canvas.width,
            2
        )

        window.requestAnimationFrame(this.paintVuMeter)
    }

    render() {
        return (
            <div className="vumeter-body" onClick={this.resetTotalPeak}>
                <canvas
                    className="vumeter-canvas"
                    style={{
                        height: this.totalHeight,
                        top: '10px',
                    }}
                    height={this.totalHeight}
                    width={10}
                    ref={this.setRef}
                ></canvas>
            </div>
        )
    }
}

export default SisyfosVuMeter
