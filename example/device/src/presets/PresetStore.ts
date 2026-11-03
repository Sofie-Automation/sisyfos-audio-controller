import fs from 'fs'
import path from 'path'
import { createDefaultAuxLevels } from '../state/auxLevels'
import { createDefaultFx, FX_PARAM_COUNT } from '../state/fxParams'
import { ChannelState, ProtocolError } from '../state/types'
import { MixerPresetFile } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function clampLevel(level: number): number {
    return Math.min(1, Math.max(0, level))
}

function requireNumber(
    obj: Record<string, unknown>,
    key: string,
    label: string
): number {
    const value = obj[key]
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new ProtocolError(
            `Invalid preset: ${label}.${key} must be a number`
        )
    }
    return value
}

function requireBoolean(
    obj: Record<string, unknown>,
    key: string,
    label: string
): boolean {
    const value = obj[key]
    if (typeof value !== 'boolean') {
        throw new ProtocolError(
            `Invalid preset: ${label}.${key} must be a boolean`
        )
    }
    return value
}

function requireString(
    obj: Record<string, unknown>,
    key: string,
    label: string
): string {
    const value = obj[key]
    if (typeof value !== 'string' || !value.trim()) {
        throw new ProtocolError(
            `Invalid preset: ${label}.${key} must be a non-empty string`
        )
    }
    return value.trim()
}

function normalizeLevelArray(
    value: unknown,
    expectedLength: number,
    label: string
): number[] {
    if (!Array.isArray(value)) {
        throw new ProtocolError(`Invalid preset: ${label} must be an array`)
    }
    const normalized = value.map((entry, index) => {
        if (typeof entry !== 'number' || Number.isNaN(entry)) {
            throw new ProtocolError(
                `Invalid preset: ${label}[${index}] must be a number`
            )
        }
        return clampLevel(entry)
    })
    if (normalized.length === expectedLength) {
        return normalized
    }
    const padded = [...normalized]
    while (padded.length < expectedLength) {
        padded.push(0)
    }
    return padded.slice(0, expectedLength)
}

function parseChannelEntry(
    entry: unknown,
    fallbackIndex: number,
    auxSendCount: number
): ChannelState {
    if (!isRecord(entry)) {
        throw new ProtocolError(
            'Invalid preset: channel entry must be an object'
        )
    }

    const index =
        entry.index === undefined
            ? fallbackIndex
            : requireNumber(entry, 'index', `channels[${fallbackIndex}]`)

    const label = `channels[${index}]`

    return {
        index,
        faderLevel: clampLevel(requireNumber(entry, 'faderLevel', label)),
        inputGain: clampLevel(requireNumber(entry, 'inputGain', label)),
        inputSelector: requireNumber(entry, 'inputSelector', label),
        mute: requireBoolean(entry, 'mute', label),
        pfl: requireBoolean(entry, 'pfl', label),
        amixOn: requireBoolean(entry, 'amixOn', label),
        nextAuxLevel: clampLevel(requireNumber(entry, 'nextAuxLevel', label)),
        auxLevels: normalizeLevelArray(
            entry.auxLevels ?? createDefaultAuxLevels(auxSendCount),
            auxSendCount,
            `${label}.auxLevels`
        ),
        name: requireString(entry, 'name', label),
        fx: normalizeLevelArray(
            entry.fx ?? createDefaultFx(),
            FX_PARAM_COUNT,
            `${label}.fx`
        ),
    }
}

function parsePresetFile(
    raw: string,
    channelCount: number,
    inputSelectorCount: number,
    auxSendCount: number
): MixerPresetFile {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new ProtocolError('Invalid preset: file is not valid JSON')
    }

    if (!isRecord(parsed) || !Array.isArray(parsed.channels)) {
        throw new ProtocolError(
            'Invalid preset: expected { "channels": [...] }'
        )
    }

    const channels = parsed.channels.map((entry, arrayIndex) =>
        parseChannelEntry(entry, arrayIndex, auxSendCount)
    )

    for (const channel of channels) {
        if (!Number.isInteger(channel.index) || channel.index < 0) {
            throw new ProtocolError(
                `Invalid preset: channel index ${channel.index}`
            )
        }
        if (channel.index >= channelCount) {
            throw new ProtocolError(
                `Invalid preset: channel index ${channel.index} exceeds device channel count (${channelCount})`
            )
        }
        if (
            !Number.isInteger(channel.inputSelector) ||
            channel.inputSelector < 1 ||
            channel.inputSelector > inputSelectorCount
        ) {
            throw new ProtocolError(
                `Invalid preset: channels[${channel.index}].inputSelector out of range (1–${inputSelectorCount})`
            )
        }
    }

    return {
        name: typeof parsed.name === 'string' ? parsed.name.trim() : undefined,
        channels,
    }
}

export class PresetStore {
    constructor(
        private readonly presetDir: string,
        private readonly channelCount: number,
        private readonly inputSelectorCount: number,
        private readonly auxSendCount: number
    ) {}

    list(): string[] {
        if (!fs.existsSync(this.presetDir)) {
            return []
        }

        return fs
            .readdirSync(this.presetDir)
            .filter((name) => name.endsWith('.json'))
            .sort((a, b) => a.localeCompare(b))
    }

    resolvePresetPath(presetName: string): string {
        const trimmed = presetName.trim()
        if (!trimmed) {
            throw new ProtocolError('Missing presetName')
        }
        if (
            trimmed.includes('..') ||
            trimmed.includes('/') ||
            trimmed.includes('\\')
        ) {
            throw new ProtocolError('Invalid presetName')
        }

        const candidates = trimmed.endsWith('.json')
            ? [trimmed]
            : [trimmed, `${trimmed}.json`]

        for (const candidate of candidates) {
            const resolved = path.resolve(this.presetDir, candidate)
            if (
                !resolved.startsWith(path.resolve(this.presetDir) + path.sep) &&
                resolved !== path.resolve(this.presetDir)
            ) {
                throw new ProtocolError('Invalid presetName')
            }
            if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
                return resolved
            }
        }

        throw new ProtocolError(`Preset not found: ${presetName}`)
    }

    load(presetName: string): MixerPresetFile {
        const filePath = this.resolvePresetPath(presetName)
        const raw = fs.readFileSync(filePath, 'utf8')
        return parsePresetFile(
            raw,
            this.channelCount,
            this.inputSelectorCount,
            this.auxSendCount
        )
    }
}
