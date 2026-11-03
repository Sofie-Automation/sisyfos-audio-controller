import path from 'path'

export interface AppConfig {
    httpPort: number
    wsPort: number
    channelCount: number
    inputSelectorCount: number
    auxSendCount: number
    presetDir: string
    vuIntervalMs: number
    vuEnabled: boolean
}

function parseIntEnv(name: string, defaultValue: number, min = 1): number {
    const raw = process.env[name]
    if (raw === undefined || raw === '') {
        return defaultValue
    }
    const value = Number.parseInt(raw, 10)
    if (Number.isNaN(value) || value < min) {
        throw new Error(`Invalid ${name}: ${raw}`)
    }
    return value
}

function parseBoolEnv(name: string, defaultValue: boolean): boolean {
    const raw = process.env[name]
    if (raw === undefined || raw === '') {
        return defaultValue
    }
    if (raw === '1' || raw.toLowerCase() === 'true') {
        return true
    }
    if (raw === '0' || raw.toLowerCase() === 'false') {
        return false
    }
    throw new Error(`Invalid ${name}: ${raw}`)
}

export function loadConfig(): AppConfig {
    return {
        httpPort: parseIntEnv('HTTP_PORT', 8081),
        wsPort: parseIntEnv('WS_PORT', 8082),
        channelCount: parseIntEnv('MOCK_CHANNELS', 8),
        inputSelectorCount: parseIntEnv('MOCK_INPUT_SELECTORS', 4),
        auxSendCount: parseIntEnv('MOCK_AUX_SENDS', 4),
        presetDir:
            process.env.MOCK_PRESET_DIR?.trim() ||
            path.join(process.cwd(), 'storage'),
        vuIntervalMs: parseIntEnv('MOCK_VU_INTERVAL_MS', 50, 16),
        vuEnabled: parseBoolEnv('MOCK_VU_ENABLED', true),
    }
}
