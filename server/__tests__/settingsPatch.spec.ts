import {
    mergeSettings,
    replaceSettings,
    validateSettings,
} from '../src/utils/settingsPatch'
import { defaultSettingsReducerState } from '../../shared/src/reducers/settingsReducer'

const knownProtocols = ['sslSystemT', 'genericMidi']

const current = () => ({
    ...structuredClone(defaultSettingsReducerState[0]),
    sisyfosVersion: '4.7.0',
    mixers: [
        {
            ...structuredClone(defaultSettingsReducerState[0].mixers[0]),
            deviceToken: 'secret-0',
        },
        {
            ...structuredClone(defaultSettingsReducerState[0].mixers[0]),
            deviceToken: 'secret-1',
            deviceIp: '10.0.0.2',
        },
    ],
    numberOfMixers: 2,
})

describe('mergeSettings', () => {
    it('merges top-level fields and keeps the rest', () => {
        const merged = mergeSettings(current(), { fadeTime: 500 })
        expect(merged.fadeTime).toBe(500)
        expect(merged.voFadeTime).toBe(current().voFadeTime)
    })

    it('merges mixers element by element', () => {
        const merged = mergeSettings(current(), {
            mixers: [{}, { deviceIp: '10.0.0.3' }],
        })
        expect(merged.mixers[0]).toEqual(current().mixers[0])
        expect(merged.mixers[1].deviceIp).toBe('10.0.0.3')
        expect(merged.mixers[1].deviceToken).toBe('secret-1')
    })

    it('drops mixers beyond the patched array', () => {
        const merged = mergeSettings(current(), { mixers: [{}] })
        expect(merged.mixers).toHaveLength(1)
    })

    it('replaces other arrays whole', () => {
        const merged = mergeSettings(current(), {
            mixers: [{ numberOfChannelsInType: [4, 2] }],
        })
        expect(merged.mixers[0].numberOfChannelsInType).toEqual([4, 2])
    })

    it('deep-merges nested objects', () => {
        const merged = mergeSettings(current(), { currentPage: { start: 8 } })
        expect(merged.currentPage).toEqual({ type: 0, start: 8 })
    })

    it('keeps sisyfosVersion', () => {
        const merged = mergeSettings(current(), { sisyfosVersion: '1.0.0' })
        expect(merged.sisyfosVersion).toBe('4.7.0')
    })

    it('ignores prototype keys', () => {
        const merged = mergeSettings(
            current(),
            JSON.parse('{"__proto__": {"polluted": true}}')
        )
        expect(merged.polluted).toBeUndefined()
        expect(({} as any).polluted).toBeUndefined()
    })

    it('does not mutate the current settings', () => {
        const settings = current()
        mergeSettings(settings, { fadeTime: 1, mixers: [{ deviceIp: 'x' }] })
        expect(settings).toEqual(current())
    })
})

describe('replaceSettings', () => {
    it('keeps current device tokens for mixers sent without one', () => {
        const { mixers, ...rest } = current()
        const result = replaceSettings(current(), {
            ...rest,
            mixers: mixers.map(({ deviceToken, ...mixer }) => mixer),
        })
        expect(result.mixers.map((m: any) => m.deviceToken)).toEqual([
            'secret-0',
            'secret-1',
        ])
    })

    it('uses a sent device token', () => {
        const result = replaceSettings(current(), {
            ...current(),
            mixers: [{ ...current().mixers[0], deviceToken: 'new' }],
        })
        expect(result.mixers[0].deviceToken).toBe('new')
    })

    it('does not keep fields missing from the replacement', () => {
        const { voLevel, ...rest } = current()
        expect(replaceSettings(current(), rest).voLevel).toBeUndefined()
    })

    it('keeps sisyfosVersion', () => {
        const result = replaceSettings(current(), {
            ...current(),
            sisyfosVersion: undefined,
        })
        expect(result.sisyfosVersion).toBe('4.7.0')
    })
})

describe('validateSettings', () => {
    it('accepts valid settings', () => {
        expect(validateSettings(current(), knownProtocols)).toEqual([])
    })

    it('requires the fields the server depends on', () => {
        expect(validateSettings({}, knownProtocols)).toEqual([
            'numberOfMixers must be a positive integer',
            'mixers must be a non-empty array',
            'numberOfFaders must be a positive integer',
            'fadeTime must be a non-negative number',
            'voFadeTime must be a non-negative number',
        ])
    })

    it('rejects fewer mixers than numberOfMixers', () => {
        expect(
            validateSettings({ ...current(), numberOfMixers: 3 }, knownProtocols)
        ).toContain('mixers must have at least numberOfMixers entries')
    })

    it('rejects an unknown mixer protocol', () => {
        const settings = current()
        settings.mixers[1].mixerProtocol = 'nope'
        expect(validateSettings(settings, knownProtocols)).toEqual([
            'mixers[1].mixerProtocol must be a known mixer protocol',
        ])
    })

    it('rejects wrongly typed optional fields', () => {
        expect(
            validateSettings(
                { ...current(), offtubeMode: 'yes', labelType: 'x' },
                knownProtocols
            )
        ).toEqual([
            'offtubeMode must be a boolean',
            'labelType must be one of automatic, user, automation, channel',
        ])
    })

    it('allows unknown fields', () => {
        expect(
            validateSettings({ ...current(), extra: 1 }, knownProtocols)
        ).toEqual([])
    })
})
