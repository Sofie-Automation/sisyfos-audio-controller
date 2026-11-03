import express from 'express'
import { state } from '../../reducers/store'

export const settingsRouter = express.Router()

settingsRouter.get('/', (_req, res) => {
    const settings = state.settings[0]
    res.json({
        ...settings,
        // Device tokens are credentials and must not be readable over the API
        mixers: settings.mixers.map(({ deviceToken, ...mixer }) => mixer),
    })
})
