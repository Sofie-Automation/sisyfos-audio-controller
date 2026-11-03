// Pure helpers for the /api/settings PUT and PATCH endpoints

// Keys that would reach Object.prototype when assigned
const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype']

const isPlainObject = (value: any): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const mergeValue = (target: any, patch: any): any =>
    isPlainObject(target) && isPlainObject(patch)
        ? mergeObjects(target, patch)
        : structuredClone(patch)

const mergeObjects = (
    target: Record<string, any>,
    patch: Record<string, any>
): Record<string, any> => {
    const result = { ...target }
    for (const key of Object.keys(patch)) {
        if (UNSAFE_KEYS.includes(key)) continue
        result[key] = mergeValue(target[key], patch[key])
    }
    return result
}

/**
 * Deep-merges a patch into the current settings. Objects merge key by key,
 * mixers merge element by element, and every other array is replaced whole.
 * sisyfosVersion always keeps the current value, so migrations don't rerun.
 */
export const mergeSettings = (current: any, patch: any): any => {
    const { mixers, ...rest } = patch
    const merged = mergeObjects(current, rest)
    if (mixers !== undefined) {
        merged.mixers = Array.isArray(mixers)
            ? mixers.map((mixer: any, index: number) =>
                  mergeValue(current.mixers?.[index] ?? {}, mixer)
              )
            : mixers
    }
    merged.sisyfosVersion = current.sisyfosVersion
    return merged
}

/**
 * Builds the settings for a full replacement. Device tokens aren't readable
 * through the API, so a mixer sent without one keeps the current token at
 * the same index.
 */
export const replaceSettings = (current: any, replacement: any): any => {
    const result = mergeObjects({}, replacement)
    if (Array.isArray(result.mixers)) {
        result.mixers = result.mixers.map((mixer: any, index: number) =>
            isPlainObject(mixer) && mixer.deviceToken === undefined
                ? {
                      ...mixer,
                      deviceToken: current.mixers?.[index]?.deviceToken ?? '',
                  }
                : mixer
        )
    }
    result.sisyfosVersion = current.sisyfosVersion
    return result
}

const isInt = (value: any, min: number): boolean =>
    Number.isInteger(value) && value >= min

const NUMBER_FIELDS = ['voLevel', 'autoResetLevel', 'numberOfCustomPages']
const BOOLEAN_FIELDS = [
    'enableRemoteFader',
    'labelControlsIgnoreAutomation',
    'offtubeMode',
    'enablePages',
    'chanStripFollowsPFL',
]
const STRING_FIELDS = [
    'labelIgnorePrefix',
    'remoteFaderMidiInputPort',
    'remoteFaderMidiOutputPort',
]
const ENUM_FIELDS: Record<string, any[]> = {
    firstInRowButton: [0, 1],
    secondInRowButton: [0, 1],
    thirdInRowButton: [0, 1, 2, 3],
    secondOutRowButton: [0, 1, 2],
    thirdOutRowButton: [0, 1, 2, 3],
    pgmOnFollowsMixer: [0, 1, 2, 3],
    labelType: ['automatic', 'user', 'automation', 'channel'],
}

const validateMixer = (
    mixer: any,
    index: number,
    knownProtocols: string[]
): string[] => {
    const prefix = `mixers[${index}]`
    if (!isPlainObject(mixer)) return [`${prefix} must be an object`]
    const errors: string[] = []
    if (!knownProtocols.includes(mixer.mixerProtocol)) {
        errors.push(`${prefix}.mixerProtocol must be a known mixer protocol`)
    }
    if (
        !Array.isArray(mixer.numberOfChannelsInType) ||
        !mixer.numberOfChannelsInType.every((n: any) => isInt(n, 0))
    ) {
        errors.push(
            `${prefix}.numberOfChannelsInType must be an array of non-negative integers`
        )
    }
    for (const field of ['devicePort', 'localOscPort', 'numberOfAux']) {
        if (mixer[field] !== undefined && !isInt(mixer[field], 0)) {
            errors.push(`${prefix}.${field} must be a non-negative integer`)
        }
    }
    if (
        mixer.protocolLatency !== undefined &&
        typeof mixer.protocolLatency !== 'number'
    ) {
        errors.push(`${prefix}.protocolLatency must be a number`)
    }
    return errors
}

/**
 * Checks the fields the server depends on at startup. Unknown fields are
 * allowed. Returns a list of errors, which is empty when the settings are valid.
 */
export const validateSettings = (
    settings: any,
    knownProtocols: string[]
): string[] => {
    if (!isPlainObject(settings)) return ['settings must be an object']
    const errors: string[] = []

    if (!isInt(settings.numberOfMixers, 1)) {
        errors.push('numberOfMixers must be a positive integer')
    }
    if (!Array.isArray(settings.mixers) || settings.mixers.length === 0) {
        errors.push('mixers must be a non-empty array')
    } else {
        if (
            isInt(settings.numberOfMixers, 1) &&
            settings.mixers.length < settings.numberOfMixers
        ) {
            errors.push('mixers must have at least numberOfMixers entries')
        }
        settings.mixers.forEach((mixer: any, index: number) =>
            errors.push(...validateMixer(mixer, index, knownProtocols))
        )
    }
    if (!isInt(settings.numberOfFaders, 1)) {
        errors.push('numberOfFaders must be a positive integer')
    }
    for (const field of ['fadeTime', 'voFadeTime']) {
        if (typeof settings[field] !== 'number' || settings[field] < 0) {
            errors.push(`${field} must be a non-negative number`)
        }
    }

    for (const field of NUMBER_FIELDS) {
        if (
            settings[field] !== undefined &&
            typeof settings[field] !== 'number'
        ) {
            errors.push(`${field} must be a number`)
        }
    }
    for (const field of BOOLEAN_FIELDS) {
        if (
            settings[field] !== undefined &&
            typeof settings[field] !== 'boolean'
        ) {
            errors.push(`${field} must be a boolean`)
        }
    }
    for (const field of STRING_FIELDS) {
        if (
            settings[field] !== undefined &&
            typeof settings[field] !== 'string'
        ) {
            errors.push(`${field} must be a string`)
        }
    }
    for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
        if (
            settings[field] !== undefined &&
            !allowed.includes(settings[field])
        ) {
            errors.push(`${field} must be one of ${allowed.join(', ')}`)
        }
    }
    return errors
}
