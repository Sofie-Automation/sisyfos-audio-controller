export interface ChannelMatrixResolution {
    /**
     * The 1-based vMix audio channel numbers to set to 100 via SetVolumeChannelMixer.
     * All other channels (up to 8) are set to 0.
     *
     *   - Linked L or R: single element — mono channel on a specific bus.
     *   - Unlinked linkable: single element — LR preset routes that one channel to both buses.
     *   - Non-linkable: [leftInput, rightInput] — two physical channels, preset routes each to its own bus.
     */
    activeChannels: number[]
    /** The AudioChannelMatrixApplyPreset name to send to vMix. */
    preset: string
}

/**
 * Pure function that resolves which vMix audio channels to activate and which
 * AudioChannelMatrixApplyPreset to send.
 *
 * The preset routes physical audio channels to output buses:
 *   'L'   → ch N to Left (linked primary — mono input)
 *   'R'   → ch M to Right (linked secondary — mono input)
 *   'LR'  → ch N to both Left and Right buses (unlinked linkable — mono to both)
 *   '{N}L'→ ch N to Left, remaining channels to Right (non-linkable — stereo, two channels)
 *
 * SetVolumeChannelMixer activates the correct physical channels at 100 and
 * silences all others. Unlinked inputs (stereo) activate both leftInput and
 * rightInput. Linked inputs (mono within the pair) activate only one channel.
 *
 * @param leftInput         1-based audio channel index for the left/primary signal
 * @param rightInput        1-based audio channel index for the right/secondary signal
 * @param linkedPreset      'L' = primary of a linked pair, 'R' = secondary; undefined = unlinked
 * @param isSecondary       true when this is an unlinked secondary (isLinkableSecondary) fader
 * @param isLinkable        true when this fader has isLinkablePrimary or isLinkableSecondary capability
 * @param lrPresetName      override for the LR preset name (defaults to 'LR')
 * @param prefix            mix-minus preset prefix (e.g. 'EXT', 'RTN')
 * @param returnFeedNumber  positive number to use with prefix (0 = no prefix applied)
 */
export function resolveChannelMatrixPreset({
    leftInput,
    rightInput,
    linkedPreset,
    isSecondary = false,
    isLinkable = false,
    lrPresetName,
    prefix,
    returnFeedNumber = 0,
}: {
    leftInput: number
    rightInput: number
    linkedPreset?: 'L' | 'R'
    isSecondary?: boolean
    isLinkable?: boolean
    lrPresetName?: string
    prefix?: string
    returnFeedNumber?: number
}): ChannelMatrixResolution {
    // Linked (L or R): one channel, routed to one bus.
    // Unlinked linkable: one channel, LR preset routes it to both buses — secondary uses rightInput.
    // Non-linkable: two channels — each routed to its own bus by the {N}L preset.
    let activeChannels: number[]
    if (linkedPreset !== undefined) {
        activeChannels = [linkedPreset === 'R' ? rightInput : leftInput]
    } else if (isLinkable || isSecondary) {
        activeChannels = [isSecondary ? rightInput : leftInput]
    } else {
        activeChannels = [leftInput, rightInput]
    }

    const applyPrefix = (name: string): string =>
        returnFeedNumber > 0 && prefix
            ? `${prefix}${returnFeedNumber}_${name}`
            : name

    let preset: string
    if (linkedPreset !== undefined) {
        // Linked: 'L' for primary half, 'R' for secondary half
        preset = applyPrefix(linkedPreset)
    } else if (isLinkable || isSecondary) {
        // Unlinked linkable: LR routes leftInput→Left, rightInput→Right
        preset = applyPrefix(lrPresetName ?? 'LR')
    } else {
        // Non-linkable stereo: '{N}L' routes ch N to Left, the rest to Right
        preset = applyPrefix(`${leftInput}L`)
    }

    return { activeChannels, preset }
}

/**
 * Returns the SetVolumeChannelMixer values to send for channels 1–totalChannels.
 * Active channels get 100; every other channel gets 0.
 *
 * For linked (mono) inputs pass a single-element array.
 * For unlinked (stereo) inputs pass [leftInput, rightInput].
 */
export function buildChannelMixerVolumes(
    activeChannels: number[],
    totalChannels = 8
): Record<number, number> {
    const volumes: Record<number, number> = {}
    for (let i = 1; i <= totalChannels; i++) {
        volumes[i] = activeChannels.includes(i) ? 100 : 0
    }
    return volumes
}
