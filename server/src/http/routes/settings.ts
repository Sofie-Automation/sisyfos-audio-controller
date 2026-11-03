import express from 'express'
import { state } from '../../reducers/store'
import { mixerProtocolList } from '../../mainClasses'
import {
    mergeSettings,
    replaceSettings,
    validateSettings,
} from '../../utils/settingsPatch'
import { asyncHandler, HttpError } from '../asyncHandler'

export const settingsRouter = express.Router()

const knownProtocols = mixerProtocolList.map((protocol) => protocol.value)

// Settings saved with ?restart=false only take effect after a restart, so
// later changes must build on them rather than on the running state
let pendingSettings: any = null

settingsRouter.get('/', (_req, res) => {
    const settings = state.settings[0]
    res.json({
        ...settings,
        // Device tokens are credentials and must not be readable over the API
        mixers: settings.mixers.map(({ deviceToken, ...mixer }) => mixer),
    })
})

const saveHandler = (
    build: (current: any, body: any) => any
): express.RequestHandler =>
    asyncHandler(async (req, res) => {
        if (
            typeof req.body !== 'object' ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            throw new HttpError(400, 'settings must be a JSON object')
        }
        const restart = req.query.restart !== 'false'
        const settings = build(pendingSettings ?? state.settings[0], req.body)
        const errors = validateSettings(settings, knownProtocols)
        if (errors.length > 0) {
            throw new HttpError(400, errors.join('\n'))
        }
        await global.mainThreadHandler.applySettings(settings, {
            restart: false,
        })
        pendingSettings = settings
        if (restart) {
            // Reply before exiting so the caller gets the response
            res.on('finish', () => process.exit(0))
        }
        res.status(200).send('OK')
    })

settingsRouter.put(
    '/',
    express.json({ limit: '1mb' }),
    saveHandler(replaceSettings)
)

settingsRouter.patch(
    '/',
    express.json({ limit: '1mb' }),
    saveHandler(mergeSettings)
)
