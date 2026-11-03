import * as React from 'react'
import { connect } from 'react-redux'

import '../assets/css/MicTally.css'
import { Store } from 'redux'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Channels } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Settings } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getFaderLabel } from '../utils/labels'

import {
    SOCKET_TOGGLE_PGM,
    SOCKET_TOGGLE_VO,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

interface MicTallyInjectProps {
    channels: Channels
    faders: Fader[]
    settings: Settings
}

interface MicTallyState {
    toggleTargetIndex: number | null
}

class MicTally extends React.Component<
    MicTallyInjectProps & Store,
    MicTallyState
> {
    constructor(props: any) {
        super(props)
        this.props.settings.showMonitorOptions = -1
        this.state = {
            toggleTargetIndex: null,
        }
    }

    componentWillMount() {
        document.body.classList.add('v-mic-tally')
    }

    componentWillUnmount() {
        document.body.classList.remove('v-mic-tally')
    }

    preToggleFader(index: number) {
        const fader = this.props.faders[index]
        if (!fader || fader.muteOn) {
            return
        }
        this.setState({ toggleTargetIndex: index })
    }
    clearToggleFaderIndex() {
        this.setState({ toggleTargetIndex: null })
    }

    toggleFader(index: number) {
        const fader = this.props.faders[index]
        const faderLabel = getFaderLabel(index)

        if (fader.muteOn) {
            return
        }

        if (fader.voOn) {
            window.socketIoClient.emit(SOCKET_TOGGLE_VO, index)
        } else {
            window.socketIoClient.emit(SOCKET_TOGGLE_PGM, index)
        }
        this.clearToggleFaderIndex()
    }

    faderIsOn(index: number) {
        const fader = this.props.faders[index]
        return Boolean(fader && (fader.pgmOn || fader.voOn) && !fader.muteOn)
    }

    render() {
        const hasToggleTargetIndex = this.state.toggleTargetIndex !== null
        return (
            <div className="mic-tally-view">
                <ul
                    className={`mic-tally-list${!hasToggleTargetIndex ? ' active' : ''}`}
                >
                    {this.props.faders.map((fader, index) => {
                        if (!fader.showInMiniMonitor) {
                            return
                        }
                        const isOn = this.faderIsOn(index)
                        return (
                            <li className="c-mic-tally" key={index}>
                                <div
                                    onClick={() => this.preToggleFader(index)}
                                    className={`c-mic-tally__status${isOn ? ' on' : ''}${fader.muteOn ? ' muted' : ''}`}
                                >
                                    <div className="c-mic-tally__status__content">
                                        {isOn ? 'ON' : 'OFF'}
                                    </div>
                                </div>
                                <span className={`c-mic-tally__label`}>
                                    {getFaderLabel(index)}
                                </span>
                            </li>
                        )
                    })}
                </ul>
                <div
                    className={`c-mic-tally__toggle-prompt${hasToggleTargetIndex ? ' active' : ''}`}
                >
                    <div className="c-mic-tally__toggle-prompt__content">
                        <p>
                            Are you sure you want to turn '
                            {getFaderLabel(this.state.toggleTargetIndex)}'{' '}
                            {this.faderIsOn(this.state.toggleTargetIndex)
                                ? 'OFF'
                                : 'ON'}
                            ?
                        </p>
                        <div className="c-mic-tally__toggle-prompt__actions">
                            <button
                                className="apply"
                                onClick={() =>
                                    this.toggleFader(
                                        this.state.toggleTargetIndex
                                    )
                                }
                            >
                                Turn{' '}
                                {this.faderIsOn(this.state.toggleTargetIndex)
                                    ? 'OFF'
                                    : 'ON'}
                            </button>
                            <button
                                className="cancel"
                                onClick={() => this.clearToggleFaderIndex()}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

const mapStateToProps = (state: any): MicTallyInjectProps => {
    return {
        channels: state.channels[0].chMixerConnection[0].channel,
        faders: state.faders[0].fader,
        settings: state.settings[0],
    }
}

export default connect<MicTallyInjectProps, any, any>(mapStateToProps)(MicTally)
