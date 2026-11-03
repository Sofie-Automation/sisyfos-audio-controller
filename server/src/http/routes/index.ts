import express from 'express'
import { errorHandler } from '../asyncHandler'
import { mixerPresetsRouter } from './mixerPresets'
import { pagesRouter } from './pages'

export const apiRouter = express.Router()

apiRouter.use('/mixer-preset', mixerPresetsRouter)
apiRouter.use('/pages', pagesRouter)

// Must stay last so it catches errors from every router above
apiRouter.use(errorHandler)
