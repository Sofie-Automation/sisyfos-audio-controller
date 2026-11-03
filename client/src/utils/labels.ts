import defaultStoreRedux, {
    ReduxStore,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import type { Store } from 'redux'

let activeStore: Store = defaultStoreRedux

export function setActiveSisyfosStore(store?: Store) {
    activeStore = store ?? defaultStoreRedux
}

export function getSisyfosReduxState(): ReduxStore {
    return activeStore.getState() as ReduxStore
}

export function getChannelLabel(
    state: ReduxStore,
    faderIndex: number
): string | undefined {
    let label = state.channels[0].chMixerConnection
        .flatMap((conn) =>
            conn.channel.map((ch) => ({
                assignedFader: ch.assignedFader,
                label: ch.label,
            }))
        )
        .filter((ch) => ch.label && ch.label !== '')
        .find((ch) => ch.assignedFader === faderIndex)?.label
    if (
        state.settings[0].labelControlsIgnoreAutomation &&
        label?.startsWith(state.settings[0].labelIgnorePrefix)
    ) {
        label = label.slice(state.settings[0].labelIgnorePrefix.length)
    }
    return label
}

export function getFaderLabel(faderIndex: number, defaultName = 'CH'): string {
    const state = getSisyfosReduxState()
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
    const channelLabel = getChannelLabel(state, faderIndex)

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
