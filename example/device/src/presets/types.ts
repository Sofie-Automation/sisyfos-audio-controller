import { ChannelState } from '../state/types'

export interface MixerPresetFile {
    /** Optional display label inside the file */
    name?: string
    channels: ChannelState[]
}
