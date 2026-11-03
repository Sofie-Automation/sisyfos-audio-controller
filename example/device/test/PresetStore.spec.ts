import fs from 'fs'
import os from 'os'
import path from 'path'
import { PresetStore } from '../src/presets/PresetStore'
import { ProtocolError } from '../src/state/types'

const defaultChannel = {
    faderLevel: 0.5,
    inputGain: 0.6,
    inputSelector: 2,
    mute: true,
    pfl: true,
    amixOn: true,
    nextAuxLevel: 0.2,
    auxLevels: [0.1, 0.2, 0.3, 0.4],
    name: 'Preset CH1',
    fx: Array.from({ length: 22 }, () => 0),
}

describe('PresetStore', () => {
    let tempDir: string
    let store: PresetStore

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-presets-'))
        store = new PresetStore(tempDir, 8, 4, 4)
        fs.writeFileSync(
            path.join(tempDir, 'test-preset.json'),
            JSON.stringify({
                name: 'Test',
                channels: [{ index: 0, ...defaultChannel }],
            })
        )
    })

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('lists json presets in the directory', () => {
        expect(store.list()).toEqual(['test-preset.json'])
    })

    it('loads a preset by filename', () => {
        const preset = store.load('test-preset.json')

        expect(preset.name).toBe('Test')
        expect(preset.channels).toHaveLength(1)
        expect(preset.channels[0].name).toBe('Preset CH1')
        expect(preset.channels[0].mute).toBe(true)
    })

    it('loads a preset without the .json extension', () => {
        const preset = store.load('test-preset')

        expect(preset.channels[0].faderLevel).toBe(0.5)
    })

    it('throws when preset file is missing', () => {
        expect(() => store.load('missing.json')).toThrow(ProtocolError)
    })

    it('rejects path traversal in preset names', () => {
        expect(() => store.load('../secret.json')).toThrow(ProtocolError)
    })
})
