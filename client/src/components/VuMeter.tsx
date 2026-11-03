import * as React from 'react'
import { connect } from 'react-redux'
import { vuMeters } from '../utils/SocketClientHandlers'
import SisyfosVuMeter from './SisyfosVuMeter'

export interface VuMeterInjectedProps {
    faderIndex: number
    channel: number
}

export class VuMeter extends React.Component<VuMeterInjectedProps> {
    render() {
        return (
            <SisyfosVuMeter
                getLevel={() =>
                    vuMeters[this.props.faderIndex]?.[this.props.channel] || 0
                }
                meterConfig={window.mixerProtocol?.meter}
            />
        )
    }
}

const mapStateToProps = (state: any, props: any): VuMeterInjectedProps => {
    return {
        faderIndex: props.faderIndex,
        channel: props.channel,
    }
}

export default connect<VuMeterInjectedProps, any, any>(mapStateToProps)(VuMeter)
