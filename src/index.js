import { Duplex } from 'stream'
import assert from 'assert'
import createDebugger from 'debug'
import codes from './codes'

const { DATA, RESUME, PAUSE, END } = codes

let debug = createDebugger('ws-streamify')

export default class WebSocketStream extends Duplex {
  constructor (socket, options) {
    super(options)

    assert(socket, 'You must provide a socket')

    this.socket = socket
    socket.binaryType = 'arraybuffer'

    // You can provide a socket name for debugging purposes. Shh, that's a secret!
    socket._name = socket._name || Math.random().toString(36).slice(2, 7)
    //
    // Whether we asked the other socket to hold on or not.
    this._paused = false

    this.on('finish', () => {
      // Ending of stream should be asynchronous
      // so that it won't go before writing
      setTimeout(() => {
        debug(`${this.socket._name}: I'm done!`)
        socket.send(Buffer.from([END]))
      }, 0)
    })

    // Buffer data until connection is established
    if (socket.readyState !== socket.OPEN) this.cork()

    socket.addEventListener('open', () => {
      debug(`${this.socket._name}: okay, I'm ready!`)
      this.uncork()
    })

    socket.addEventListener('close', (code, msg) => {
      debug(`${this.socket._name}: I've lost the connection!`)
      this.emit('close', code, msg)
    })

    socket.addEventListener('error', (err) => {
      debug(`${this.socket._name}: uh oh, error!`)
      this.emit('error', err)
    })

    socket.addEventListener('message', (msg) => {
      let data = Buffer.from(msg.data)
      switch (data[0]) {
        case DATA:
          if (!this.push(data.slice(1))) {
            // This will execute after all callbacks
            // on 'readable' and 'data' events.
            debug(`${this.socket._name}: stop it!`)
            socket.send(Buffer.from([PAUSE]))
            this._paused = true
          } else {
            debug(`${this.socket._name}: nice data, thx!`)
          }
          break
        case RESUME:
          debug(`${this.socket._name}: resume? okay!`)
          this.uncork()
          break
        case PAUSE:
          debug(`${this.socket._name}: stop? fine!`)
          this.cork()
          break
        case END:
          debug(`${this.socket._name}: bye!`)
          this.push(null)
          break
        default:
          throw new Error('Unsupported message type')
      }
    })
  }

  _write (chunk, encoding, callback) {
    // Write should be asynchronous in order to let
    // flow-control messages to pass when they need to.
    setTimeout(() => {
      debug(`${this.socket._name}: hey, I'm sending data!`)
      this.socket.send(Buffer.concat([Buffer.from([DATA]), chunk]))
      callback()
    }, 0)
  }

  _read (size) {
    // We don't want to send RESUME every time node
    // wants to read another chunk.
    if (this._paused) {
      debug(`${this.socket._name}: go ahead!`)
      this.socket.send(Buffer.from([RESUME]))
      this._paused = false
    }
  }
}
