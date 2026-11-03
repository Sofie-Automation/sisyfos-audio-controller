'use strict'
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.getSisyfosHost = getSisyfosHost
const path_1 = __importDefault(require('path'))
let cachedHost
function getSisyfosHost() {
    if (cachedHost) {
        return cachedHost
    }
    const root =
        process.env.SISYFOS_ROOT ?? path_1.default.resolve(__dirname, '../..')
    const serverDist = path_1.default.join(root, 'server/dist/server/src')
    cachedHost = {
        store: require(path_1.default.join(serverDist, 'reducers/store')),
        mainClasses: require(path_1.default.join(serverDist, 'mainClasses')),
        logger: require(path_1.default.join(serverDist, 'utils/logger')).logger,
    }
    return cachedHost
}
