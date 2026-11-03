import React from 'react'
import { Provider as LegacyReduxProvider } from 'react-redux'
import { useSocketConnection } from '../../client/src/hooks/useSocketConnection'
import ContextProvider from '../../client/src/components/ContextProvider'
import OrgChannels from '../../client/src/components/Channels'
import SisyfosVuMeter from '../../client/src/components/SisyfosVuMeter'
import upstreamI18n from '../../client/src/utils/i18n'
import { vuMeters } from '../../client/src/utils/SocketClientHandlers'
import legacyStore from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export { I18nextProvider } from 'react-i18next'
export { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export { PageType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export { createEnhancedReducer } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export function Channels({ page }: { page?: string }) {
    return <OrgChannels page={page} />
}

export {
    ContextProvider,
    LegacyReduxProvider,
    legacyStore,
    SisyfosVuMeter,
    upstreamI18n,
    useSocketConnection,
    vuMeters,
}

export type {
    RootState as SisyfosState,
    RootAction as SisyfosAction,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type {
    Faders,
    Fader,
    VuMeters,
    ChannelReference,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type {
    Channels as ChannelsState,
    Channel,
    ChMixerConnection,
    NumberOfChannels,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type { Settings } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type { ReduxStore as LegacyReduxStore } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type { Channels as LegacyChannels } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type { Faders as LegacyFaders } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type { CustomPages as LegacyCustomPages } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
export type { SisyfosMeterConfig } from '../../client/src/components/SisyfosVuMeter'
