declare module 'osc' {
    import { EventEmitter } from 'events'
    import * as dgram from 'dgram'

    interface TimeTag {
        raw: number[]
        native: number
    }

    interface OSCMessage {
        address: string
        args: any[]
    }

    type OSCMessageOrBundle = OSCMessage | OSCBundle

    interface OSCBundle {
        timeTag: TimeTag
        packets: OSCMessageOrBundle[]
    }

    type OSCData = any

    interface Colour {
        r: number
        g: number
        b: number
        a: number
    }

    interface OSCPort extends EventEmitter {
        on(event: 'ready', handler: () => void): this
        on(
            event: 'message',
            handler: (
                message: OSCMessage,
                timeTag: TimeTag | undefined,
                info: any
            ) => void
        ): this
        on(
            event: 'bundle',
            handler: (bundle: OSCBundle, timeTag: TimeTag, info: any) => void
        ): this
        on(
            event: 'osc',
            handler: (packet: OSCMessageOrBundle, info: any) => void
        ): this
        on(event: 'raw', handler: (data: Uint8Array, info: any) => void): this
        on(event: 'error', handler: (error: Error) => void): this
        send(packet: OSCMessage | OSCBundle): void
    }

    interface UDPPortOptions {
        localPort: number
        localAddress: string
        remotePort?: number
        remoteAddress?: string
        broadcast?: boolean
        multicastTTL?: number
        multicastMembership?: string[]
        socket?: dgram.Socket
        metadata?: boolean
    }
    class UDPPort extends EventEmitter implements OSCPort {
        constructor(options: UDPPortOptions)
        on(event: 'ready', handler: () => void): this
        on(
            event: 'message',
            handler: (
                message: OSCMessage,
                timeTag: TimeTag | undefined,
                info: any
            ) => void
        ): this
        on(
            event: 'bundle',
            handler: (bundle: OSCBundle, timeTag: TimeTag, info: any) => void
        ): this
        on(
            event: 'osc',
            handler: (packet: OSCMessage | OSCBundle, info: any) => void
        ): this
        on(event: 'raw', handler: (data: Uint8Array, info: any) => void): this
        on(event: 'error', handler: (error: Error) => void): this
        send(packet: OSCMessage | OSCBundle): void
        open(): void
    }
}
