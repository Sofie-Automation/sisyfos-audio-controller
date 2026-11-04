// Type-only import: importing SettingsStorage at runtime pulls in the store
import type { ShotStorage } from './SettingsStorage'

const isObject = (value: any): boolean =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

// Only checks what loading relies on. Field values are not checked, so
// snapshots saved before new fader or channel fields were added still load.
export const isValidSnapshot = (snapshot: any): snapshot is ShotStorage =>
    isObject(snapshot) &&
    Array.isArray(snapshot.faderState?.fader) &&
    snapshot.faderState.fader.every(isObject) &&
    Array.isArray(snapshot.channelState?.chMixerConnection) &&
    snapshot.channelState.chMixerConnection.every(
        (mixer: any) =>
            isObject(mixer) &&
            Array.isArray(mixer.channel) &&
            mixer.channel.every(
                (channel: any) =>
                    isObject(channel) &&
                    typeof channel.channelType === 'number'
            )
    )
