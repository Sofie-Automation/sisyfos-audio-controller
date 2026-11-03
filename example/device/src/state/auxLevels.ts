export function createDefaultAuxLevels(count: number): number[] {
    return Array.from({ length: count }, () => 0)
}

export function isValidAuxIndex(index: number, auxSendCount: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < auxSendCount
}
