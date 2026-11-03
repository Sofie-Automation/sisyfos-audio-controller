import * as React from 'react'
import { connect } from 'react-redux'

import '../assets/css/MiniChannels.css'
import { Store } from 'redux'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Channels as ChannelsInterface } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Settings } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import MiniChannel from './MiniChannel'
import MiniChanStrip from './MiniChanStrip'

interface ChannelsInjectProps {
    channels: ChannelsInterface
    faders: Fader[]
    settings: Settings
}

class Channels extends React.Component<ChannelsInjectProps & Store> {
    constructor(props: any) {
        super(props)
        this.props.settings.showMonitorOptions = -1
    }

    public shouldComponentUpdate(nextProps: ChannelsInjectProps): boolean {
        return (
            this.props.settings.showOptions !==
                nextProps.settings.showOptions ||
            this.props.settings.showChanStrip !==
                nextProps.settings.showChanStrip ||
            this.props.settings.showMonitorOptions !==
                nextProps.settings.showMonitorOptions ||
            this.props.settings.mixers[0].mixerOnline !==
                nextProps.settings.mixers[0].mixerOnline ||
            this.props.faders.length !== nextProps.faders.length
        )
    }

    render() {
        return (
            <div className="mini-channels-body">
                {this.props.faders.map((fader: Fader, index: number) => {
                    return fader.showInMiniMonitor ? (
                        <MiniChannel faderIndex={index} key={index} />
                    ) : null
                })}
                {this.props.settings.showChanStrip >= 0 ? (
                    <div className="openChanStrip">
                        <MiniChanStrip
                            faderIndex={this.props.settings.showChanStrip}
                        />
                    </div>
                ) : (
                    <div className="closedChanStrip">
                        <MiniChanStrip
                            faderIndex={this.props.settings.showChanStrip}
                        />
                    </div>
                )}
            </div>
        )
    }
}

const mapStateToProps = (state: any): ChannelsInjectProps => {
    return {
        channels: state.channels[0].chMixerConnection[0].channel,
        faders: state.faders[0].fader,
        settings: state.settings[0],
    }
}

export default connect<ChannelsInjectProps, any, any>(mapStateToProps)(Channels)
