import classNames from 'classnames'
import { SOCKET_SET_INPUT_SELECTOR } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import React from 'react'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export function InputSelectorButton({
    index,
    handleInputSelect,
    activeInputSelector,
}: {
    index: number
    handleInputSelect: (input: number) => void
    activeInputSelector: number
}) {
    const isActive = activeInputSelector === index + 1
    return (
        <button
            className={classNames('input-select', {
                active: isActive,
            })}
            onClick={() => handleInputSelect(index + 1)}
        >
            {window.mixerProtocol.channelTypes[0].toMixer.CHANNEL_INPUT_SELECTOR
                ? window.mixerProtocol.channelTypes[0].toMixer
                      .CHANNEL_INPUT_SELECTOR[index].label
                : null}
        </button>
    )
}

export function InputSelector({
    faderIndex,
    fader,
}: {
    faderIndex: number
    fader: Fader
}) {
    const handleInputSelect = (selected: number) => {
        window.socketIoClient.emit(SOCKET_SET_INPUT_SELECTOR, {
            faderIndex: faderIndex,
            selected: selected,
        })
    }
    return (
        <div
            className={classNames('input-buttons', {
                disabled:
                    fader.capabilities && !fader.capabilities.hasInputSelector,
            })}
        >
            {window.mixerProtocol.channelTypes[0].toMixer
                .CHANNEL_INPUT_SELECTOR ? (
                <React.Fragment>
                    {window.mixerProtocol.channelTypes[0].toMixer.CHANNEL_INPUT_SELECTOR.map(
                        (none: any, index: number) => (
                            <InputSelectorButton
                                activeInputSelector={fader.inputSelector}
                                handleInputSelect={handleInputSelect}
                                index={index}
                                key={index}
                            />
                        )
                    )}
                </React.Fragment>
            ) : null}
        </div>
    )
}
