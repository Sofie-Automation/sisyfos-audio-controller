import express from 'express'
import { getSnapShotList } from '../../utils/SettingsStorage'

export const snapshotsRouter = express.Router()

snapshotsRouter.get('/', (_req, res) => {
    res.json(getSnapShotList())
})
