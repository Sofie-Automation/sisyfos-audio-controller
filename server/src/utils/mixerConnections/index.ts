export type { MixerConnection } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

/**
 * For two consecutive channels, if one is linkable as PRIMARY and the other as SECONDARY,
 * they can be rearranged across faders, to either be controlled with a single fader,
 * or two independent faders
 */
export enum LinkableMode {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
}
