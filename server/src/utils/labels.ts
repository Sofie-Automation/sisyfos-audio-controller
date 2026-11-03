import { ChMixerConnection } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { state } from '../reducers/store'

export function getChannelLabel(
    chMixerConnection: ChMixerConnection[],
    faderIndex: number
): string | undefined {
    return chMixerConnection
        .map((conn) =>
            conn?.channel.map((ch) => ({
                assignedFader: ch?.assignedFader,
                label: ch?.label,
            }))
        )
        .reduce((a, b) => [...a, ...b], []) // flatten
        .filter((ch) => ch.label && ch.label !== '')
        .find((ch) => ch.assignedFader === faderIndex)?.label
}

export function getFaderLabel(faderIndex: number, defaultName = 'CH'): string {
    const automationLabel =
        state.faders[0].fader[faderIndex] &&
        state.faders[0].fader[faderIndex].label !== ''
            ? state.faders[0].fader[faderIndex].label
            : undefined
    const userLabel =
        state.faders[0].fader[faderIndex] &&
        state.faders[0].fader[faderIndex].userLabel !== ''
            ? state.faders[0].fader[faderIndex].userLabel
            : undefined
    const channelLabel = getChannelLabel(
        state.channels[0].chMixerConnection,
        faderIndex
    )

    switch (state.settings[0].labelType) {
        case 'automation':
            return automationLabel || defaultName + ' ' + (faderIndex + 1)
        case 'user':
            return userLabel || defaultName + ' ' + (faderIndex + 1)
        case 'channel':
            return channelLabel || defaultName + ' ' + (faderIndex + 1)
        case 'automatic':
        default:
            return (
                userLabel ||
                automationLabel ||
                channelLabel ||
                defaultName + ' ' + (faderIndex + 1)
            )
    }
}
