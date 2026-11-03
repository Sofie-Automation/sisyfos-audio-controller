import path from 'path'
import type { SisyfosHostModules } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

let cachedHost: SisyfosHostModules | undefined

export function getSisyfosHost(): SisyfosHostModules {
    if (cachedHost) {
        return cachedHost
    }

    const root = process.env.SISYFOS_ROOT ?? path.resolve(__dirname, '../..')
    const serverDist = path.join(root, 'server/dist/server/src')

    cachedHost = {
        store: require(path.join(serverDist, 'reducers/store')),
        mainClasses: require(path.join(serverDist, 'mainClasses')),
        logger: require(path.join(serverDist, 'utils/logger')).logger,
    }

    return cachedHost
}
