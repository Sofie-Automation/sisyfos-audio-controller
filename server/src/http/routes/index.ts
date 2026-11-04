import express from 'express'
import { errorHandler } from '../asyncHandler'
import { mixerPresetsRouter } from './mixerPresets'
import { pagesRouter } from './pages'
import { settingsRouter } from './settings'
import { snapshotRouter, snapshotsRouter } from './snapshots'

export const apiRouter = express.Router()

apiRouter.use('/mixer-preset', mixerPresetsRouter)
apiRouter.use('/pages', pagesRouter)
apiRouter.use('/settings', settingsRouter)
apiRouter.use('/snapshot', snapshotRouter)
apiRouter.use('/snapshots', snapshotsRouter)

// Must stay last so it catches errors from every router above
apiRouter.use(errorHandler)
