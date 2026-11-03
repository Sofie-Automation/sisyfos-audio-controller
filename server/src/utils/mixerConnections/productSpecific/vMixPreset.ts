export interface Command {
    name: string
    value?: string
}
interface CommonPresetOptions {}
export interface InputsPreset extends CommonPresetOptions {
    inputNumbers: number[]
    /** vMix commands to execute for this input */
    commands?: Command[]
    /** whether channel matrix (and channel mixer) should be reset */
    resetChannelMatrix?: boolean
    /** whether channel gain should be set to 0 */
    resetGain?: boolean
    /**
     * Whether this input is the primary of a linkable stereo pair.
     * The secondary is implicitly the next consecutive fader.
     */
    isLinkablePrimary?: boolean
    /** Whether the LR channels of this input should be linked in Sisyfos */
    isLinked?: boolean
}
export type Preset = InputsPreset[]
