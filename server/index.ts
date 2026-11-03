import { MainThreadHandlers } from './src/MainThreadHandler'
import { startServer } from './src/http'

declare global {
    namespace NodeJS {
        interface Global {
            mainThreadHandler: MainThreadHandlers
            navigator: any // Workaround for WebMidi
            performance: any // Workaround for WebMidi
        }
    }
}

global.mainThreadHandler = new MainThreadHandlers()
startServer()
