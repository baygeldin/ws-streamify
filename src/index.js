import { Duplex } from 'stream'
import assert from 'assert'
import createDebugger from 'debug'
import codes from './codes'

const { DATA, ACK, END } = codes

let debug = createDebugger('ws-streamify')

export default class WebSocketStream extends Duplex {
  constructor (socket, options) {
    super(options)

    assert(socket, 'You must provide a socket')

    this.socket = socket
    socket.binaryType = 'arraybuffer'

    // You can provide a socket name for debugging purposes. Shh, that's a secret!
    socket._name = socket._name || Math.random().toString(36).slice(2, 7)

    // When the first message is received it becomes true
    this._started = false

    this.on('finish', () => {
      debug(`${this.socket._name}: I'm done`)
      this._send(END)
    })

    // Buffer data until connection is established
    if (socket.readyState !== socket.OPEN) this.cork()

    socket.addEventListener('open', () => {
      debug(`${this.socket._name}: okay, I'm ready`)
      this.uncork()
    })

    socket.addEventListener('close', (code, msg) => {
      debug(`${this.socket._name}: I've lost the connection`)
      this.emit('close', code, msg)
    })

    socket.addEventListener('error', (err) => {
      debug(`${this.socket._name}: uh oh, error!`)
      this.emit('error', err)
    })

    socket.addEventListener('message', (msg) => {
      let data = Buffer.from ? Buffer.from(msg.data) : new Buffer(msg.data)
      switch (data[0]) {
        case DATA:
          this._started = true
          if (!this.push(data.slice(1))) {
            // Note that this will execute after
            // all callbacks on 'readable' and 'data' events.
            debug(`${this.socket._name}: ouch, I'm full...`)
          }
          break
        case ACK:
          this._cb()
          break
        case END:
          debug(`${this.socket._name}: okay, bye`)
          this.push(null)
          break
        default:
          throw new Error('Unsupported message type')
      }
    })
  }

  _write (chunk, encoding, callback) {
    debug(`${this.socket._name}: hey, I'm sending a data`)
    this._send(DATA, chunk)
    this._cb = callback
  }

  _read (size) {
    if (this._started) {
      debug(`${this.socket._name}: go ahead, send some more`)
      this._send(ACK)
    }
  }

  _send (code, data) {
    let type = Buffer.from ? Buffer.from([code]) : new Buffer([code])
    this.socket.send(data ? Buffer.concat([type, data]) : type)
  }
}
