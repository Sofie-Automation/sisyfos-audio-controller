import * as React from 'react'
import ClassNames from 'classnames'
import { connect } from 'react-redux'
import VuMeter from './VuMeter'
import { Store, compose } from 'redux'
import Nouislider from 'nouislider-react'
import '../assets/css/NoUiSlider.css'

//assets:
import '../assets/css/Channel.css'
import * as IO from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    ChannelReference,
    Fader,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    FirstInRowButtonType,
    SecondInRowButtonType,
    SecondOutRowButtonType,
    Settings,
    ThirdInRowButtonType,
    ThirdOutRowButtonType,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { withTranslation } from 'react-i18next'
import {
    MixerConnectionTypes,
    VuLabelConversionType,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getFaderLabel } from '../utils/labels'
import { Conversions } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChannelLayoutSettingsButton } from './ChannelLayoutSettingsPopup'
import LinkedIcon from '../assets/icons/link.svg'
import UnlinkedLeftIcon from '../assets/icons/link-left.svg'
import UnlinkedRightIcon from '../assets/icons/link-right.svg'
import { RootState } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

interface ChannelInjectProps {
    t: any
    fader: Fader
    settings: Settings
    channelType: number
    channelTypeIndex: number
    channelTypeColor: string
    label: string
}

interface ChannelProps {
    faderIndex: number
}

function XOR(a: any, b: any): boolean {
    return (a && !b) || (b && !a)
}

class Channel extends React.Component<
    ChannelProps & ChannelInjectProps & Store
> {
    faderIndex: number

    private _domRef: React.RefObject<HTMLDivElement> = React.createRef()

    constructor(props: any) {
        super(props)
        this.faderIndex = this.props.faderIndex
    }

    public shouldComponentUpdate(nextProps: ChannelInjectProps): boolean {
        return !!(
            nextProps.channelTypeIndex !== this.props.channelTypeIndex ||
            nextProps.fader.pgmOn != this.props.fader.pgmOn ||
            nextProps.fader.voOn != this.props.fader.voOn ||
            nextProps.fader.pstOn != this.props.fader.pstOn ||
            nextProps.fader.pflOn != this.props.fader.pflOn ||
            nextProps.fader.muteOn != this.props.fader.muteOn ||
            nextProps.fader.slowFadeOn != this.props.fader.slowFadeOn ||
            nextProps.fader.ignoreAutomation !=
                this.props.fader.ignoreAutomation ||
            nextProps.fader.showChannel != this.props.fader.showChannel ||
            nextProps.fader.disabled !== this.props.fader.disabled ||
            nextProps.fader.faderLevel != this.props.fader.faderLevel ||
            nextProps.label != this.props.label ||
            nextProps.settings.mixers[0].mixerProtocol !=
                this.props.settings.mixers[0].mixerProtocol ||
            nextProps.settings.secondOutRowButton !=
                this.props.settings.secondOutRowButton ||
            nextProps.settings.thirdOutRowButton !=
                this.props.settings.thirdOutRowButton ||
            nextProps.settings.showChanStrip !=
                this.props.settings.showChanStrip ||
            nextProps.fader.amixOn != this.props.fader.amixOn ||
            nextProps.fader.assignedChannels !=
                this.props.fader.assignedChannels ||
            XOR(nextProps.fader.capabilities, this.props.fader.capabilities) ||
            XOR(
                nextProps.fader.capabilities?.hasAMix,
                this.props.fader.capabilities?.hasAMix
            ) ||
            XOR(
                nextProps.fader.capabilities?.isLinkablePrimary,
                this.props.fader.capabilities?.isLinkablePrimary
            ) ||
            XOR(
                nextProps.fader.capabilities?.isLinkableSecondary,
                this.props.fader.capabilities?.isLinkableSecondary
            ) ||
            XOR(nextProps.fader.isLinked, this.props.fader.isLinked)
        )
    }

    componentDidUpdate() {
        // scroll into view if we are now the chan strip
        if (this.props.settings.showChanStrip === this.faderIndex) {
            this._domRef.current?.scrollIntoView()
        }
    }

    handlePgm() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_PGM, this.faderIndex)
    }

    handleVo() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_VO, this.faderIndex)
    }

    handleSlowFade() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_SLOW_FADE, this.faderIndex)
    }

    handlePst() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_PST, this.faderIndex)
    }

    handlePfl() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_PFL, this.faderIndex)
        if (
            this.props.settings.chanStripFollowsPFL &&
            !this.props.fader.pflOn &&
            this.props.settings.showChanStrip !== this.faderIndex
        ) {
            this.handleShowChanStrip()
        }
    }

    handleMute() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_MUTE, this.faderIndex)
    }

    handleAmix() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_AMIX, this.faderIndex)
    }

    handleIgnore() {
        window.socketIoClient.emit(IO.SOCKET_TOGGLE_IGNORE, this.faderIndex)
    }

    handleLevel(event: any) {
        const level = parseFloat(event)
        window.socketIoClient?.beginFaderDrag?.(this.faderIndex)
        window.socketIoClient?.applyFaderDragLevel?.(this.faderIndex, level)
        window.socketIoClient.emit(IO.SOCKET_SET_FADERLEVEL, {
            faderIndex: this.faderIndex,
            level,
        })
    }

    handleDragStart() {
        window.socketIoClient?.beginFaderDrag?.(this.faderIndex)
    }

    handleDragEnd(event: any) {
        const level = parseFloat(event)
        window.socketIoClient?.applyFaderDragLevel?.(this.faderIndex, level)
        window.socketIoClient?.endFaderDrag?.(this.faderIndex)
    }

    handleZeroLevel() {
        window.socketIoClient.emit(IO.SOCKET_SET_FADERLEVEL, {
            faderIndex: this.faderIndex,
            level: window.mixerProtocol.meter.zero,
        })
    }

    handleShowChanStrip() {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_CHAN_STRIP,
            channel: this.faderIndex,
        })
    }

    handleVuMeter() {
        if (
            window.mixerProtocol.protocol === MixerConnectionTypes.CasparCG ||
            (window.mixerProtocol.protocol === MixerConnectionTypes.vMix &&
                !this.props.fader.capabilities?.isLinkablePrimary &&
                !this.props.fader.capabilities?.isLinkableSecondary)
        ) {
            return (
                <React.Fragment>
                    {!window.location.search.includes('vu=0') &&
                        window.mixerProtocol.channelTypes[0].fromMixer.CHANNEL_VU?.map(
                            (_, i) => (
                                <VuMeter
                                    faderIndex={this.faderIndex}
                                    channel={i}
                                    key={i}
                                />
                            )
                        )}{' '}
                </React.Fragment>
            )
        } else {
            let assignedChannels: ChannelReference[] = this.props.fader
                .assignedChannels || [{ mixerIndex: 0, channelIndex: 0 }]
            return (
                <React.Fragment>
                    {!window.location.search.includes('vu=0') &&
                        assignedChannels?.map(
                            (assigned: ChannelReference, index) => (
                                <VuMeter
                                    faderIndex={this.faderIndex}
                                    channel={index}
                                    key={index}
                                />
                            )
                        )}{' '}
                </React.Fragment>
            )
        }
    }

    fader() {
        const showFormat = !!window.mixerProtocol.vuLabelConversionType
        const values = (showFormat && window.mixerProtocol.vuLabelValues) || [
            0.75,
        ]
        let format = {
            to: (f: number) => 0,
            from: (d: number) => 0,
        }
        if (showFormat) {
            if (
                window.mixerProtocol.vuLabelConversionType ===
                VuLabelConversionType.Linear
            ) {
                const range = window.mixerProtocol.fader
                format = {
                    to: (f: number) => {
                        if (!range) return f
                        return (range.max - range.min) * f + range.max
                    },
                    from: (d: number) => {
                        if (!range) return d
                        return (d - range.min) / (range.max - range.min)
                    },
                }
            } else if (
                Conversions[
                    window.mixerProtocol
                        .vuLabelConversionType as keyof typeof Conversions
                ]
            ) {
                format = Conversions[VuLabelConversionType.Decibel]
            }
        }
        return (
            <Nouislider
                className={ClassNames({
                    'channel-volume-fader': true,
                    'noUi-vertical': true,
                })}
                orientation="vertical"
                direction="rtl"
                animate={false}
                range={{ min: 0, max: 1 }}
                start={[this.props.fader.faderLevel]}
                step={0.01}
                connect
                onStart={() => {
                    this.handleDragStart()
                }}
                onSlide={(event: any) => {
                    this.handleLevel(event)
                }}
                onEnd={(event: any) => {
                    this.handleDragEnd(event)
                }}
                pips={{
                    mode: 'values',
                    values,
                    format,
                    filter: (v: number) => {
                        if (values.includes(v)) {
                            if (v === 0.75) {
                                return 1 // large
                            } else {
                                return 2 // small
                            }
                        } else {
                            return -1 // no pip
                        }
                    },
                }}
            />
        )
    }

    zeroButton = () => {
        return (
            <button
                className={ClassNames('channel-zero-button', {
                    on: this.props.fader.pgmOn,
                    mute: this.props.fader.muteOn,
                })}
                onDoubleClick={(event) => {
                    event.preventDefault()
                    this.handleZeroLevel()
                }}
            >
                {this.props.label}
            </button>
        )
    }

    pgmButton = () => {
        return (
            <button
                className={ClassNames('channel-pgm-button', {
                    on: this.props.fader.pgmOn,
                    mute: this.props.fader.muteOn,
                })}
                onClick={(event) => {
                    event.preventDefault()
                    this.handlePgm()
                }}
                onTouchEnd={(event) => {
                    event.preventDefault()
                    this.handlePgm()
                }}
            >
                {this.props.label}
            </button>
        )
    }

    voButton = () => {
        return (
            <button
                className={ClassNames('channel-vo-button', {
                    on: this.props.fader.voOn,
                    mute: this.props.fader.muteOn,
                })}
                onClick={(event) => {
                    event.preventDefault()
                    this.handleVo()
                }}
                onTouchEnd={(event) => {
                    event.preventDefault()
                    this.handleVo()
                }}
            >
                {this.props.t('VO')}
            </button>
        )
    }

    slowButton = () => {
        return (
            <button
                className={ClassNames('channel-vo-button', {
                    on: this.props.fader.slowFadeOn,
                    mute: this.props.fader.muteOn,
                })}
                onClick={(event) => {
                    event.preventDefault()
                    this.handleSlowFade()
                }}
                onTouchEnd={(event) => {
                    event.preventDefault()
                    this.handleSlowFade()
                }}
            >
                {this.props.t('SLOW FADE')}
            </button>
        )
    }

    cueNextButton = () => {
        return (
            <button
                className={ClassNames('channel-pst-button', {
                    on: this.props.fader.pstOn,
                    vo: this.props.fader.pstVoOn,
                })}
                onClick={(event) => {
                    this.handlePst()
                }}
                onTouchEnd={(event) => {
                    event.preventDefault()
                    this.handlePst()
                }}
            >
                <React.Fragment>{this.props.t('CUE NEXT')}</React.Fragment>
            </button>
        )
    }

    pstButton = () => {
        return (
            <button
                className={ClassNames('channel-pst-button', {
                    on: this.props.fader.pstOn,
                    vo: this.props.fader.pstVoOn,
                })}
                onClick={(event) => {
                    this.handlePst()
                }}
                onTouchEnd={(event) => {
                    event.preventDefault()
                    this.handlePst()
                }}
            >
                <React.Fragment>{this.props.t('PST')}</React.Fragment>
            </button>
        )
    }

    pflButton = () => {
        return (
            <button
                className={ClassNames('channel-pst-button', {
                    on: this.props.fader.pflOn,
                })}
                onClick={(event) => {
                    this.handlePfl()
                }}
                onTouchEnd={(event) => {
                    event.preventDefault()
                    this.handlePfl()
                }}
            >
                {this.props.t('PFL')}
            </button>
        )
    }

    chanStripButton = () => {
        const isActive = this.props.settings.showChanStrip === this.faderIndex
        //style for if active or the color from the multiple channeltype e.g. groups or master
        const styleBackground = {
            backgroundColor: isActive ? '#2f475b' : this.props.channelTypeColor,
        }

        return (
            <button
                className="channel-strip-button"
                style={styleBackground}
                onClick={(event) => {
                    this.handleShowChanStrip()
                }}
            >
                {this.props.label}
            </button>
        )
    }

    ignoreButton = () => {
        if (
            this.props.settings.firstInRowButton !==
            FirstInRowButtonType.AUTO_MANUAL
        )
            return null
        return (
            <button
                className={ClassNames('channel-ignore-button', {
                    on: this.props.fader.ignoreAutomation,
                })}
                onClick={(event) => {
                    event.preventDefault()
                    this.handleIgnore()
                }}
                onTouchEnd={(event) => {
                    event.preventDefault()
                    this.handleIgnore()
                }}
            >
                {this.props.fader.ignoreAutomation ? 'MANUAL' : 'AUTO'}
            </button>
        )
    }

    muteButton = () => {
        if (
            this.props.settings.secondInRowButton !== SecondInRowButtonType.MUTE
        ) {
            return null
        }
        return (
            window.mixerProtocol.channelTypes[0].toMixer.CHANNEL_MUTE_ON && (
                <button
                    className={ClassNames('channel-mute-button', {
                        on: this.props.fader.muteOn,
                    })}
                    onClick={(event) => {
                        event.preventDefault()
                        this.handleMute()
                    }}
                    onTouchEnd={(event) => {
                        event.preventDefault()
                        this.handleMute()
                    }}
                >
                    MUTE
                </button>
            )
        )
    }

    amixButton = () => {
        if (this.props.settings.thirdInRowButton !== ThirdInRowButtonType.AMIX)
            return null
        return (
            window.mixerProtocol.channelTypes[0].toMixer.CHANNEL_AMIX && (
                <button
                    className={ClassNames('channel-amix-button', {
                        on: this.props.fader.amixOn,
                        disabled:
                            this.props.fader.capabilities &&
                            !this.props.fader.capabilities.hasAMix,
                    })}
                    onClick={(event) => {
                        event.preventDefault()
                        this.handleAmix()
                    }}
                    onTouchEnd={(event) => {
                        event.preventDefault()
                        this.handleAmix()
                    }}
                >
                    AMix
                </button>
            )
        )
    }

    channelOptions = () => {
        if (
            this.props.settings.thirdInRowButton !==
                ThirdInRowButtonType.LINK_CHANNELS &&
            this.props.settings.thirdInRowButton !==
                ThirdInRowButtonType.CHANNEL_OPTIONS
        )
            return null
        return (
            <div className="channel-layout">
                {!this.props.fader.capabilities?.isLinkableSecondary && (
                    <ChannelLayoutSettingsButton
                        fader={this.props.fader}
                        faderIndex={this.props.faderIndex}
                    />
                )}

                <div className="channel-stereo-link-button">
                    {this.props.fader.capabilities?.isLinkablePrimary &&
                        ((this.props.fader.isLinked && <LinkedIcon />) || (
                            <UnlinkedLeftIcon />
                        ))}
                    {this.props.fader.capabilities?.isLinkableSecondary &&
                        !this.props.fader.isLinked && <UnlinkedRightIcon />}
                </div>
            </div>
        )
    }

    shouldHideChannel = () => {
        return (
            this.props.fader.showChannel === false ||
            (this.props.fader.isLinked &&
                this.props.fader.capabilities.isLinkableSecondary)
        )
    }

    render() {
        return this.shouldHideChannel() ? null : (
            <div
                className={ClassNames('channel-body', {
                    'with-pfl':
                        this.props.settings.thirdOutRowButton ===
                        ThirdOutRowButtonType.PFL,
                    'pgm-on': this.props.fader.pgmOn,
                    'vo-on': this.props.fader.voOn,
                    'mute-on': this.props.fader.muteOn,
                    'ignore-on': this.props.fader.ignoreAutomation,
                    'not-found': this.props.fader.disabled,
                })}
                ref={this._domRef}
            >
                <div className="channel-props">
                    {this.ignoreButton()}
                    {this.muteButton()}
                    {this.amixButton()}
                    {this.channelOptions()}
                </div>
                <div className="fader">
                    {this.handleVuMeter()}
                    {this.fader()}
                    {this.zeroButton()}
                </div>
                <div className="out-control">
                    {this.pgmButton()}

                    {(() => {
                        switch (this.props.settings.secondOutRowButton) {
                            case SecondOutRowButtonType.VO:
                                return this.voButton()
                            case SecondOutRowButtonType.SLOW_FADE:
                                return this.slowButton()
                            default:
                                return null
                        }
                    })()}
                    <br />
                </div>
                <div className="channel-control">
                    {this.chanStripButton()}
                    {(() => {
                        switch (this.props.settings.thirdOutRowButton) {
                            case ThirdOutRowButtonType.CUE_NEXT:
                                return this.cueNextButton()
                            case ThirdOutRowButtonType.PFL:
                                return this.pflButton()
                            case ThirdOutRowButtonType.PST:
                                return this.pstButton()
                            default:
                                return null
                        }
                    })()}
                </div>
            </div>
        )
    }
}

const mapStateToProps = (state: RootState, props: any): ChannelInjectProps => {
    const firstAssingedIndex =
        state.faders[0].fader[props.faderIndex].assignedChannels[0]

    const firstAssingedChannel =
        firstAssingedIndex &&
        state.channels[0].chMixerConnection[firstAssingedIndex?.mixerIndex]
            .channel[firstAssingedIndex?.channelIndex]
    return {
        t: props.t,
        fader: state.faders[0].fader[props.faderIndex],
        settings: state.settings[0],
        channelType: firstAssingedChannel?.channelType || 0, // If no channels assigned, use first channel type
        channelTypeIndex: firstAssingedChannel?.channelTypeIndex || 0,
        channelTypeColor:
            window.mixerProtocolPresets[
                state.settings[0].mixers[0].mixerProtocol
            ].channelTypes[firstAssingedChannel?.channelType || 0]
                ?.channelTypeColor,
        label: getFaderLabel(props.faderIndex),
    }
}

export default compose(
    connect<any, ChannelInjectProps, any>(mapStateToProps),
    withTranslation()
)(Channel) as any
