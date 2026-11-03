import React from 'react'
import Draggable from 'react-draggable'
import ReactSlider from 'react-slider'

import '../assets/css/ChanStripEq.css'
import { Store } from 'redux'
import { connect } from 'react-redux'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Channel } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SOCKET_SET_FX } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FxParam } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getFaderLabel } from '../utils/labels'

interface ChanStripFullInjectProps {
    label: string
    selectedProtocol: string
    numberOfChannelsInType: Array<number>
    channel: Channel[]
    fader: Fader[]
    auxSendIndex: number
    offtubeMode: boolean
}

interface ChanStripFullProps {
    faderIndex: number
}

enum EqColors {
    'rgb(93, 184, 180)',
    'rgb(53, 112, 127)',
    'rgb(217, 21, 133)',
    'rgb(229, 159, 34)',
}

interface FreqLabels {
    label: string
    posY: number
}
const EQ_FREQ_LABELS: FreqLabels[] = [
    {
        label: '50',
        posY: 340,
    },
    {
        label: '100',
        posY: 525,
    },
    {
        label: '250',
        posY: 780,
    },
    {
        label: '500',
        posY: 950,
    },
    {
        label: '1k',
        posY: 1135,
    },
    {
        label: '2k',
        posY: 1350,
    },
    {
        label: '5k',
        posY: 1575,
    },
    {
        label: '10k',
        posY: 1755,
    },
    {
        label: '20k',
        posY: 1950,
    },
]

// Constant for calculation Eq dot positions:
const EQ_MIN_HZ = 20
const EQ_MAX_HZ = 20000
const EQ_X_SIZE = 0.66
const EQ_X_OFFSET = 0.18
const EQ_Y_SIZE = 0.25
const EQ_Y_OFFSET = 0.55

class ChanStripEq extends React.PureComponent<
    ChanStripFullProps & ChanStripFullInjectProps & Store
> {
    canvas: HTMLCanvasElement | undefined

    constructor(props: any) {
        super(props)
    }

    shouldComponentUpdate(
        nextProps: ChanStripFullInjectProps & ChanStripFullProps
    ): boolean {
        if (nextProps.faderIndex > -1) {
            return true
        } else {
            return false
        }
    }

    handleFx(fxParam: FxParam, level: any) {
        if (level < 0) {
            level = 0
        }
        if (level > 1) {
            level = 1
        }
        //        window.storeRedux.dispatch(storeFaderFx(fxParam, this.props.faderIndex, parseFloat(level)))
        window.socketIoClient.emit(SOCKET_SET_FX, {
            fxParam: fxParam,
            faderIndex: this.props.faderIndex,
            level: parseFloat(level),
        })
    }

    handleDragCaptureEq(
        key: number,
        totalWidth: number,
        totalHeight: number,
        event: any
    ) {
        let eqFreqKey =
            FxParam[
                String(FxParam[key]).replace(
                    'EqGain',
                    'EqFreq'
                ) as keyof typeof FxParam
            ]
        let eventX = event.clientX ?? event.touches[0].clientX
        let eventY = event.clientY ?? event.touches[0].clientY
        this.handleFx(eqFreqKey, this.freqPositionToValue(eventX, totalWidth))
        this.handleFx(key, this.gainPositionToValue(eventY, totalHeight))
    }

    valueToFreqPosition(value: number, totalWidth: number) {
        return value * totalWidth * EQ_X_SIZE
    }
    freqPositionToValue(position: number, totalWidth: number) {
        return (position - totalWidth * EQ_X_OFFSET) / (totalWidth * EQ_X_SIZE)
    }

    valueToGainPosition(value: number, totalHeight: number) {
        return totalHeight * EQ_Y_SIZE - value * (totalHeight * EQ_Y_SIZE)
    }
    gainPositionToValue(position: number, totalHeight: number) {
        return (
            (totalHeight * EQ_Y_SIZE - (position - totalHeight * EQ_Y_OFFSET)) /
            (totalHeight * EQ_Y_SIZE)
        )
    }

    logOscToLinFreq(value: number) {
        return Math.round(
            Math.pow(
                10,
                value * (Math.log10(EQ_MAX_HZ) - Math.log10(EQ_MIN_HZ)) +
                    Math.log10(EQ_MIN_HZ)
            )
        )
    }

    setRef = (el: HTMLCanvasElement) => {
        this.canvas = el
        this.paintEqBackground()
    }

    paintEqBackground() {
        if (!this.canvas) {
            return
        }
        this.canvas.width = 2000
        this.canvas.height = 600
        const context = this.canvas.getContext('2d', {
            antialias: false,
            stencil: false,
            preserveDrawingBuffer: true,
        }) as CanvasRenderingContext2D

        if (!context) return

        // Fill background color:

        context.rect(70, 0, this.canvas.width, this.canvas.height)
        context.fillStyle = '#2a42274d'
        context.fill()
        // Draw X-Y axis:
        context.beginPath()
        context.strokeStyle = 'white'
        context.moveTo(70, 0)
        context.lineTo(70, this.canvas.height)
        context.stroke()
        // Draw zero gain line:
        context.beginPath()
        context.strokeStyle = 'rgba(128, 128, 128, 0.244) 10px'
        context.moveTo(70, this.canvas.height / 2)
        context.lineTo(this.canvas.width, this.canvas.height / 2)
        context.stroke()
        // Freq on zero gain line:
        context.beginPath()
        EQ_FREQ_LABELS.forEach((freq: FreqLabels) => {
            context.font = '30px Ariel'
            context.strokeStyle = 'white'
            context.strokeText(
                freq.label,
                freq.posY,
                this.canvas.height / 2 + 30
            )
        })
        // Freq on zero gain line:
        context.strokeText(
            String(
                window.mixerProtocol.channelTypes[0].fromMixer[
                    FxParam.EqGain01
                ]?.[0].maxLabel
            ) + ' dB',
            1,
            20
        )
        context.strokeText('0 dB', 1, this.canvas.height / 2 + 20)
        context.strokeText(
            String(
                window.mixerProtocol.channelTypes[0].fromMixer[
                    FxParam.EqGain01
                ]?.[0].maxLabel
            ) + ' dB',
            1,
            this.canvas.height
        )
        context.stroke()
    }

    eqGraphics() {
        return (
            <div className="eq-window">
                {Object.keys(FxParam)
                    .filter((fxKey: number | string) => {
                        return String(fxKey).includes('EqGain')
                    })
                    .map((keyName: string) => {
                        let fxKey = keyName as keyof typeof FxParam
                        let eqFreqKey =
                            FxParam[
                                fxKey.replace(
                                    'EqGain',
                                    'EqFreq'
                                ) as keyof typeof FxParam
                            ]
                        return (
                            <Draggable
                                position={{
                                    x: this.valueToFreqPosition(
                                        this.props.fader[this.props.faderIndex][
                                            eqFreqKey
                                        ]?.[0],
                                        window.innerWidth
                                    ),
                                    y: this.valueToGainPosition(
                                        this.props.fader[this.props.faderIndex][
                                            FxParam[fxKey]
                                        ]?.[0],
                                        window.innerHeight
                                    ),
                                }}
                                grid={[20, 20]}
                                scale={100}
                                onDrag={(event) =>
                                    this.handleDragCaptureEq(
                                        FxParam[fxKey],
                                        window.innerWidth,
                                        window.innerHeight,
                                        event
                                    )
                                }
                            >
                                <div
                                    className="dot"
                                    style={{
                                        color: String(EqColors[FxParam[fxKey]]),
                                    }}
                                >
                                    O
                                </div>
                            </Draggable>
                        )
                    })}
            </div>
        )
    }

    eqText() {
        return (
            <div className="eq-text">
                {Object.keys(FxParam)
                    .filter((fxKey: number | string) => {
                        return String(fxKey).includes('EqGain')
                    })
                    .map((keyName: string, index: number) => {
                        let fxKey = keyName as keyof typeof FxParam
                        let eqFreqKey =
                            FxParam[
                                fxKey.replace(
                                    'EqGain',
                                    'EqFreq'
                                ) as keyof typeof FxParam
                            ]
                        let eqQKey =
                            FxParam[
                                fxKey.replace(
                                    'EqGain',
                                    'EqQ'
                                ) as keyof typeof FxParam
                            ]
                        let maxGain: number =
                            window.mixerProtocol.channelTypes[0].fromMixer[
                                FxParam[fxKey]
                            ]?.[0].maxLabel ?? 1
                        let minGain =
                            window.mixerProtocol.channelTypes[0].fromMixer[
                                FxParam[fxKey]
                            ]?.[0].minLabel ?? 0

                        return (
                            <div
                                className="eq-text-parameters"
                                key={index}
                                style={{
                                    color: EqColors[FxParam[fxKey]],
                                }}
                            >
                                <br />
                                {'  Gain : '}
                                {Math.round(
                                    10 *
                                        ((maxGain - minGain) *
                                            (this.props.fader[
                                                this.props.faderIndex
                                            ][FxParam[fxKey]]?.[0] ?? 0) +
                                            minGain)
                                ) / 10}
                                {'  Freq :'}
                                {this.logOscToLinFreq(
                                    this.props.fader[this.props.faderIndex][
                                        eqFreqKey
                                    ]?.[0] ?? 0
                                )}
                                {this.qFader(eqQKey)}
                            </div>
                        )
                    })}
            </div>
        )
    }

    qFader(fxParam: FxParam) {
        let maxLabel: number =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .maxLabel ?? 1
        let minLabel =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .minLabel ?? 0
        let valueLabel =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .valueLabel ?? ''
        return (
            <div className="chstrip-full-parameter-text">
                <div className="chstrip-full-mini-text">
                    {Math.round(
                        ((maxLabel - minLabel) *
                            (1 -
                                Math.pow(
                                    1 -
                                        this.props.fader[this.props.faderIndex][
                                            fxParam
                                        ]?.[0],
                                    3
                                )) +
                            minLabel) *
                            10
                    ) / 10}
                    {valueLabel}
                </div>
                <ReactSlider
                    className="chstrip-q"
                    thumbClassName="chstrip-q-thumb"
                    orientation="horisontal"
                    min={0}
                    max={1}
                    invert="true"
                    step={0.01}
                    value={
                        this.props.fader[this.props.faderIndex][fxParam]?.[0]
                    }
                    renderThumb={(props: any, state: any) => (
                        <div {...props}>
                            {Math.round(
                                ((maxLabel - minLabel) *
                                    (1 -
                                        Math.pow(
                                            1 - parseFloat(state.valueNow),
                                            3
                                        )) +
                                    minLabel) *
                                    10
                            ) / 10}
                            {valueLabel}
                        </div>
                    )}
                    onChange={(event: any) => {
                        this.handleFx(fxParam, event)
                    }}
                />
            </div>
        )
    }

    render() {
        return (
            <div className="eq-full">
                <canvas className="eq-canvas" ref={this.setRef}></canvas>
                <div className="title">EQUALIZER</div>
                {this.eqGraphics()}
                {this.eqText()}
            </div>
        )
    }
}

const mapStateToProps = (state: any, props: any): ChanStripFullInjectProps => {
    let inject: ChanStripFullInjectProps = {
        label: '',
        selectedProtocol: state.settings[0].mixers[0].mixerProtocol,
        numberOfChannelsInType:
            state.settings[0].mixers[0].numberOfChannelsInType,
        channel: state.channels[0].chMixerConnection[0].channel,
        fader: state.faders[0].fader,
        auxSendIndex: -1,
        offtubeMode: state.settings[0].offtubeMode,
    }
    if (props.faderIndex >= 0) {
        inject = {
            label: getFaderLabel(props.faderIndex, 'FADER'),
            selectedProtocol: state.settings[0].mixers[0].mixerProtocol,
            numberOfChannelsInType:
                state.settings[0].mixers[0].numberOfChannelsInType,
            channel: state.channels[0].chMixerConnection[0].channel,
            fader: state.faders[0].fader,
            auxSendIndex: state.faders[0].fader[props.faderIndex].monitor - 1,
            offtubeMode: state.settings[0].offtubeMode,
        }
    }
    return inject
}

export default connect<any, ChanStripFullInjectProps>(mapStateToProps)(
    ChanStripEq
) as any
