import React from 'react'
import ReactSlider from 'react-slider'

import '../assets/css/ChanStripFull.css'
import { Store } from 'redux'
import { connect } from 'react-redux'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    SOCKET_SET_FX,
    SOCKET_SET_AUX_LEVEL,
    SOCKET_SET_INPUT_GAIN,
    SOCKET_SET_INPUT_SELECTOR,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import ReductionMeter from './ReductionMeter'
import { FxParam } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Channel } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getFaderLabel } from '../utils/labels'
import ChanStripEq from './ChanStripEq'
import { InputSelector } from './InputSelector'

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

// Constants for Delay buttons:
const DEL_VALUES = [10, 1, -1, -10]

class ChanStripFull extends React.PureComponent<
    ChanStripFullProps & ChanStripFullInjectProps & Store
> {
    constructor(props: any) {
        super(props)
    }

    handleClose = () => {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP_FULL,
            channel: -1,
        })
    }
    handleInputSelect(selected: number) {
        window.socketIoClient.emit(SOCKET_SET_INPUT_SELECTOR, {
            faderIndex: this.props.faderIndex,
            selected: selected,
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
            <div className="chstrip-full-parameter-text">
                Gain
                <div className="chstrip-full-mini-text">{maxLabel + ' dB'}</div>
                {window.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_GAIN ? (
                    <ReactSlider
                        className="chstrip-full-fader"
                        thumbClassName="chstrip-full-thumb"
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
                <div className="chstrip-full-mini-text">{minLabel + ' dB'}</div>
            </div>
        )
    }

    gainReduction() {
        return (
            <div className="chstrip-full-parameter-reduction">
                Redution
                <ReductionMeter faderIndex={this.props.faderIndex} />
            </div>
        )
    }
    delay() {
        return (
            <React.Fragment>
                {this.fxParamFader(FxParam.DelayTime)}
                <div className="chstrip-full-delay-buttons">
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
        if (!this.doesParamExists(fxParam)) {
            return
        }
        let maxLabel: number =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam][0]
                .maxLabel ?? 1
        let minLabel =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam][0]
                .minLabel ?? 0
        let valueLabel =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .valueLabel ?? ''
        let valueAsLabels =
            window.mixerProtocol.channelTypes[0].fromMixer[fxParam]?.[0]
                .valueAsLabels
        return (
            <div className="chstrip-full-parameter-text">
                {window.mixerProtocol.channelTypes[0].fromMixer[fxParam][0]
                    .label ?? ''}
                <div className="chstrip-full-mini-text">
                    {!valueAsLabels
                        ? maxLabel + valueLabel
                        : valueAsLabels[valueAsLabels.length - 1] + valueLabel}
                </div>
                <ReactSlider
                    className="chstrip-full-fader"
                    thumbClassName="chstrip-full-thumb"
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
                <div className="chstrip-full-mini-text">
                    {!valueAsLabels
                        ? minLabel + valueLabel
                        : valueAsLabels[0] + valueLabel}
                </div>
            </div>
        )
    }

    fxParamButton(fxParam: FxParam) {
        if (!this.doesParamExists(fxParam)) {
            return
        }
        let value = this.props.fader[this.props.faderIndex][fxParam]?.[0]
        return (
            <div className="chstrip-full-parameter-text">
                <div className="parameter-button-text">
                    {window.mixerProtocol.channelTypes[0].fromMixer[fxParam][0]
                        .label ?? ''}
                </div>
                <button
                    className="parameter-button"
                    onClick={(event: any) => {
                        this.handleFx(
                            fxParam,
                            this.props.fader[this.props.faderIndex][
                                fxParam
                            ]?.[0]
                                ? 0
                                : 1
                        )
                    }}
                >
                    {value ? 'ON' : 'OFF'}
                </button>
            </div>
        )
    }

    monitor(channelIndex: number) {
        let faderIndex = this.props.channel[channelIndex].assignedFader
        if (faderIndex === -1) return null
        let monitorName = getFaderLabel(faderIndex, 'Fader')
        return (
            <li className="chstrip-full-monitor-text" key={channelIndex}>
                {monitorName}
                <div className="chstrip-full-mini-text">&nbsp;</div>
                <ReactSlider
                    className="chstrip-full-fader"
                    thumbClassName="chstrip-full-thumb"
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
                <p className="chstrip-full-zero-monitor">_______</p>
            </li>
        )
    }

    doesParamExists(fxParam: FxParam): boolean {
        return !!window.mixerProtocol.channelTypes[0].fromMixer[fxParam]
    }

    parameters() {
        if (this.props.offtubeMode) {
            const hasInput =
                window.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_GAIN ||
                window.mixerProtocol.channelTypes[0].toMixer
                    .CHANNEL_INPUT_SELECTOR
            return (
                <div className="chstrip-full-parameters">
                    {hasInput && (
                        <div className="chstrip-full-content-group">
                            <div className="title">INPUT</div>
                            <div className="chstrip-full-content">
                                <InputSelector
                                    fader={
                                        this.props.fader[this.props.faderIndex]
                                    }
                                    faderIndex={this.props.faderIndex}
                                />
                                {this.inputGain()}
                            </div>
                        </div>
                    )}
                    {this.doesParamExists(FxParam.GainTrim) ? (
                        <div className="chstrip-full-content-group">
                            <div className="title">INPUT</div>
                            <div className="chstrip-full-content">
                                {this.fxParamFader(FxParam.GainTrim)}
                            </div>
                        </div>
                    ) : (
                        <div />
                    )}
                    {this.doesParamExists(FxParam.CompThrs) ? (
                        <div className="chstrip-full-content-group">
                            <div className="title">COMPRESSOR</div>
                            <div className="chstrip-full-content">
                                {this.fxParamButton(FxParam.CompOnOff)}
                                {this.fxParamFader(FxParam.CompThrs)}
                                <p className="chstrip-full-zero-comp">______</p>
                                {this.fxParamFader(FxParam.CompRatio)}
                                <p className="chstrip-full-zero-comp">______</p>
                                {this.gainReduction()}
                                {this.fxParamFader(FxParam.CompMakeUp)}
                                <p className="chstrip-full-zero-comp">______</p>
                                {this.fxParamFader(FxParam.CompAttack)}
                                <p className="chstrip-full-zero-comp">______</p>
                                {this.fxParamFader(FxParam.CompHold)}
                                <p className="chstrip-full-zero-comp">______</p>
                                {this.fxParamFader(FxParam.CompRelease)}
                                <p className="chstrip-full-zero-comp">______</p>
                            </div>
                        </div>
                    ) : (
                        <div />
                    )}
                    {this.doesParamExists(FxParam.DelayTime) ? (
                        <div className="chstrip-full-content-group">
                            <div className="title">DELAY</div>
                            <div className="chstrip-full-content">
                                {this.delay()}
                            </div>
                        </div>
                    ) : (
                        <div className="noDelayButtons"></div>
                    )}
                    <div className="chstrip-full-content-group">
                        <div className="title">
                            {this.props.label}
                            {' - MONITOR MIX MINUS'}
                        </div>
                        <div className="chstrip-full-content">
                            <ul className="chstrip-full-monitor-sends">
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
                        </div>
                    </div>
                </div>
            )
        } else {
            return null
        }
    }

    eq() {
        return (
            <React.Fragment>
                {this.doesParamExists(FxParam.EqGain01) ? (
                    <div className="chstrip-full-eq-window">
                        <ChanStripEq faderIndex={this.props.faderIndex} />
                    </div>
                ) : (
                    <div />
                )}
            </React.Fragment>
        )
    }
    render() {
        if (this.props.faderIndex >= 0) {
            return (
                <div className="chstrip-full-body">
                    <div className="ch-strip-full-header">
                        {this.props.label}
                        <button
                            className="close"
                            onClick={() => this.handleClose()}
                        >
                            X
                        </button>
                    </div>
                    <hr />
                    {this.parameters()}
                    <hr />
                    {this.eq()}
                </div>
            )
        } else {
            return <div className="chstrip-full-body"></div>
        }
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
    ChanStripFull
) as any
