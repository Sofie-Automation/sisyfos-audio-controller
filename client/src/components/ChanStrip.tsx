import React from 'react'
import ReactSlider from 'react-slider'

import '../assets/css/ChanStrip.css'
import { Store } from 'redux'
import { connect } from 'react-redux'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    SOCKET_SET_FX,
    SOCKET_SET_AUX_LEVEL,
    SOCKET_SET_INPUT_GAIN,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import ReductionMeter from './ReductionMeter'
import { FxParam } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getFaderLabel } from '../utils/labels'
import { InputSelector } from './InputSelector'

interface ChanStripInjectProps {
    label: string
    selectedProtocol: string
    numberOfChannelsInType: Array<number>
    channel: Array<any>
    fader: Array<Fader>
    auxSendIndex: number
    offtubeMode: boolean
}

interface ChanStripProps {
    faderIndex: number
}

// Constants for Delay buttons:
const DEL_VALUES = [10, 1, -1, -10]

class ChanStrip extends React.PureComponent<
    ChanStripProps & ChanStripInjectProps & Store
> {
    constructor(props: any) {
        super(props)
    }

    handleShowChStripFull() {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP_FULL,
            channel: this.props.faderIndex,
        })
    }
    handleClose = () => {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP,
            channel: -1,
        })
    }
    handleInputGain(event: any) {
        window.socketIoClient.emit(SOCKET_SET_INPUT_GAIN, {
            faderIndex: this.props.faderIndex,
            level: parseFloat(event),
        })
    }

    changeDelay(currentValue: number, addValue: number) {
        window.socketIoClient.emit(SOCKET_SET_FX, {
            fxParam: FxParam.DelayTime,
            faderIndex: this.props.faderIndex,
            level: currentValue + addValue,
        })
    }

    handleFx(fxParam: FxParam, event: any) {
        window.socketIoClient.emit(SOCKET_SET_FX, {
            fxParam: fxParam,
            faderIndex: this.props.faderIndex,
            level: parseFloat(event),
        })
    }

    handleMonitorLevel(event: any, channelIndex: number) {
        window.socketIoClient.emit(SOCKET_SET_AUX_LEVEL, {
            channel: channelIndex,
            auxIndex: this.props.auxSendIndex,
            level: parseFloat(event),
        })
    }

    inputGain() {
        let maxLabel: number =
            window.mixerProtocol.channelTypes[0].fromMixer
                .CHANNEL_INPUT_GAIN?.[0].maxLabel ?? 1
        let minLabel =
            window.mixerProtocol.channelTypes[0].fromMixer
                .CHANNEL_INPUT_GAIN?.[0].minLabel ?? 0
        return (
            <div className="parameter-text">
                Gain
                <div className="parameter-mini-text">{maxLabel + ' dB'}</div>
                {window.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_GAIN ? (
                    <ReactSlider
                        className="chan-strip-fader"
                        thumbClassName="chan-strip-thumb"
                        orientation="vertical"
                        invert
                        min={0}
                        max={1}
                        step={0.01}
                        value={
                            this.props.fader[this.props.faderIndex].inputGain
                        }
                        onChange={(event: any) => {
                            this.handleInputGain(event)
                        }}
                    />
                ) : null}
                <div className="parameter-mini-text">{minLabel + ' dB'}</div>
            </div>
        )
    }

    gainReduction() {
        return (
            <div className="parameter-text">
                Redution
                <ReductionMeter faderIndex={this.props.faderIndex} />
            </div>
        )
    }
    delay() {
        return (
            <React.Fragment>
                {this.fxParamFader(FxParam.DelayTime)}
                <div className="delayButtons">
                    {DEL_VALUES.map((value: number, index: number) => {
                        return (
                            <button
                                key={index}
                                className="delayTime"
                                onClick={() => {
                                    this.changeDelay(
                                        this.props.fader[this.props.faderIndex][
                                            FxParam.DelayTime
                                        ]?.[0] || 0,
                                        value / 500
                                    )
                                }}
                            >
                                {value > 0 ? '+' : ''}
                                {value}ms
                            </button>
                        )
                    })}
                </div>
            </React.Fragment>
        )
    }

    fxParamFader(fxParam: FxParam) {
        let maxLabel: number =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .maxLabel ?? 1
        let minLabel =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .minLabel ?? 0
        let valueLabel =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .valueLabel ?? ''
        let valueAsLabels =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .valueAsLabels
        return (
            <div className="parameter-text">
                {window.mixerProtocol.channelTypes[0].fromMixer[fxParam][0]
                    .label ?? ''}
                <div className="parameter-mini-text">
                    {!valueAsLabels
                        ? maxLabel + valueLabel
                        : valueAsLabels[valueAsLabels.length - 1] + valueLabel}
                </div>
                <ReactSlider
                    className="chan-strip-fader"
                    thumbClassName="chan-strip-thumb"
                    orientation="vertical"
                    invert
                    min={0}
                    max={1}
                    step={0.001}
                    value={
                        this.props.fader[this.props.faderIndex][fxParam]?.[0] ??
                        0
                    }
                    renderThumb={(props: any, state: any) => (
                        <div {...props}>
                            {!valueAsLabels
                                ? Math.round(
                                      (maxLabel - minLabel) *
                                          parseFloat(state.valueNow) +
                                          minLabel
                                  )
                                : valueAsLabels[
                                      Math.round(
                                          parseFloat(state.valueNow) *
                                              (maxLabel - minLabel)
                                      )
                                  ]}
                            {valueLabel}
                        </div>
                    )}
                    onChange={(event: any) => {
                        this.handleFx(fxParam, event)
                    }}
                />
                <div className="parameter-mini-text">
                    {!valueAsLabels
                        ? minLabel + valueLabel
                        : valueAsLabels[0] + valueLabel}
                </div>
            </div>
        )
    }

    monitor(channelIndex: number) {
        let faderIndex = this.props.channel[channelIndex].assignedFader
        if (faderIndex === -1) return null
        let monitorName = getFaderLabel(faderIndex, 'Fader')
        return (
            <li key={channelIndex}>
                {monitorName}
                <ReactSlider
                    className="chan-strip-fader"
                    thumbClassName="chan-strip-thumb"
                    orientation="vertical"
                    invert
                    min={0}
                    max={1}
                    step={0.01}
                    value={
                        this.props.channel[channelIndex].auxLevel[
                            this.props.auxSendIndex
                        ]
                    }
                    onChange={(event: any) => {
                        this.handleMonitorLevel(event, channelIndex)
                    }}
                />
                <p className="zero-monitor">_______</p>
            </li>
        )
    }

    parameters() {
        if (this.props.offtubeMode) {
            const hasInput =
                window.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_GAIN ||
                window.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_SELECTOR
            const hasGainTrim =
                window.mixerProtocol.channelTypes[0].toMixer[FxParam.GainTrim]
            const hasComp =
                window.mixerProtocol.channelTypes[0].toMixer[
                    FxParam.CompThrs
                ] ||
                window.mixerProtocol.channelTypes[0].toMixer[FxParam.CompRatio]
            const hasDelay =
                window.mixerProtocol.channelTypes[0].toMixer[FxParam.DelayTime]
            const hasEq =
                window.mixerProtocol.channelTypes[0].toMixer[
                    FxParam.EqGain01
                ] ||
                window.mixerProtocol.channelTypes[0].toMixer[
                    FxParam.EqGain02
                ] ||
                window.mixerProtocol.channelTypes[0].toMixer[
                    FxParam.EqGain03
                ] ||
                window.mixerProtocol.channelTypes[0].toMixer[FxParam.EqGain04]
            const hasMonitorSends = this.props.channel.find(
                (ch: any) => ch.auxLevel[this.props.auxSendIndex] >= 0
            )
            return (
                <div className="parameters">
                    <div className="horizontal">
                        {hasInput && (
                            <div className="item">
                                <div className="title">INPUT</div>
                                <div className="content">
                                    <InputSelector
                                        fader={
                                            this.props.fader[
                                                this.props.faderIndex
                                            ]
                                        }
                                        faderIndex={this.props.faderIndex}
                                    />
                                    {this.inputGain()}
                                </div>
                            </div>
                        )}
                        {hasGainTrim && (
                            <div className="item">
                                <div className="title">INPUT</div>
                                <div className="content">
                                    {this.fxParamFader(FxParam.GainTrim)}
                                </div>
                            </div>
                        )}
                        {hasComp && (
                            <div className="item">
                                <div className="title">COMPRESSOR</div>
                                <div className="content">
                                    {this.fxParamFader(FxParam.CompThrs)}
                                    <p className="zero-comp">______</p>
                                    {this.fxParamFader(FxParam.CompRatio)}
                                    <p className="zero-comp">______</p>
                                    {this.gainReduction()}
                                </div>
                            </div>
                        )}
                        {hasDelay && (
                            <div className="item">
                                <div className="title">DELAY</div>
                                <div className="content">{this.delay()}</div>
                            </div>
                        )}
                    </div>

                    {hasEq && (
                        <React.Fragment>
                            <hr />
                            <div className="horizontal">
                                <div className="item">
                                    <div className="title">EQUALIZER</div>
                                    <div className="content">
                                        <div className="eq-group">
                                            {window.mixerProtocol
                                                .channelTypes[0].toMixer[
                                                FxParam.EqGain01
                                            ] ? (
                                                <React.Fragment>
                                                    {this.fxParamFader(
                                                        FxParam.EqGain01
                                                    )}
                                                    <p className="zero-eq">
                                                        _______
                                                    </p>
                                                </React.Fragment>
                                            ) : null}
                                            {window.mixerProtocol
                                                .channelTypes[0].toMixer[
                                                FxParam.EqGain02
                                            ] ? (
                                                <React.Fragment>
                                                    {this.fxParamFader(
                                                        FxParam.EqGain02
                                                    )}
                                                    <p className="zero-eq">
                                                        _______
                                                    </p>
                                                </React.Fragment>
                                            ) : null}
                                            {window.mixerProtocol
                                                .channelTypes[0].toMixer[
                                                FxParam.EqGain03
                                            ] ? (
                                                <React.Fragment>
                                                    {this.fxParamFader(
                                                        FxParam.EqGain03
                                                    )}
                                                    <p className="zero-eq">
                                                        _______
                                                    </p>
                                                </React.Fragment>
                                            ) : null}
                                            {window.mixerProtocol
                                                .channelTypes[0].toMixer[
                                                FxParam.EqGain04
                                            ] ? (
                                                <React.Fragment>
                                                    {this.fxParamFader(
                                                        FxParam.EqGain04
                                                    )}
                                                    <p className="zero-eq">
                                                        _______
                                                    </p>
                                                </React.Fragment>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    )}

                    {hasMonitorSends && (
                        <React.Fragment>
                            <hr />
                            <div className="group-text">
                                {this.props.label}
                                {' - MONITOR MIX MINUS'}
                            </div>
                            <ul className="monitor-sends">
                                {this.props.channel.map(
                                    (ch: any, index: number) => {
                                        if (
                                            ch.auxLevel[
                                                this.props.auxSendIndex
                                            ] >= 0
                                        ) {
                                            return this.monitor(index)
                                        }
                                    }
                                )}
                            </ul>
                        </React.Fragment>
                    )}
                </div>
            )
        } else {
            return null
        }
    }

    render() {
        if (this.props.faderIndex >= 0) {
            return (
                <div className="chan-strip-body">
                    <div className="header">
                        {this.props.label}
                        <button
                            className="close"
                            onClick={() => this.handleClose()}
                        >
                            X
                        </button>
                        <button
                            className="button"
                            onClick={() => this.handleShowChStripFull()}
                        >
                            Full Ch.Strip
                        </button>
                    </div>
                    <hr />
                    {this.parameters()}
                </div>
            )
        } else {
            return <div className="chan-strip-body"></div>
        }
    }
}

const mapStateToProps = (state: any, props: any): ChanStripInjectProps => {
    let inject: ChanStripInjectProps = {
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

export default connect<any, ChanStripInjectProps>(mapStateToProps)(
    ChanStrip
) as any
