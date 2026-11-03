import React from 'react'
import ReactSlider from 'react-slider'

import '../assets/css/MiniChanStrip.css'
import { Store } from 'redux'
import { connect } from 'react-redux'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SOCKET_SET_AUX_LEVEL } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getFaderLabel } from '../utils/labels'

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

class MiniChanStrip extends React.PureComponent<
    ChanStripProps & ChanStripInjectProps & Store
> {
    constructor(props: any) {
        super(props)
    }

    handleMonitorLevel(event: any, channelIndex: number) {
        window.socketIoClient.emit(SOCKET_SET_AUX_LEVEL, {
            channel: channelIndex,
            auxIndex: this.props.auxSendIndex,
            level: parseFloat(event),
        })
    }

    monitor(channelIndex: number) {
        let faderIndex = this.props.channel[channelIndex].assignedFader
        if (faderIndex === -1) return null
        let monitorName = getFaderLabel(faderIndex, 'Fader')
        return (
            <li key={channelIndex}>
                {monitorName}
                <ReactSlider
                    className="monitor-chan-strip-fader"
                    thumbClassName="monitor-chan-strip-thumb"
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
        return (
            <div className="parameters">
                <div className="group-text">
                    {this.props.label || 'FADER ' + (this.props.faderIndex + 1)}
                    {' - MONITOR MIX MINUS'}
                </div>
                <ul className="monitor-sends">
                    {this.props.channel.map((ch: any, index: number) => {
                        if (ch.auxLevel[this.props.auxSendIndex] >= 0) {
                            return this.monitor(index)
                        }
                    })}
                </ul>
            </div>
        )
    }

    render() {
        if (this.props.faderIndex >= 0) {
            return (
                <div className="monitor-chan-strip-body">
                    {this.props.offtubeMode ? this.parameters() : null}
                </div>
            )
        } else {
            return <div className="monitor-chan-strip-body"></div>
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
            label: getFaderLabel(props.faderIndex),
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
    MiniChanStrip
) as any
