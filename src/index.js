import { Duplex } from 'stream'
import assert from 'assert'
import createDebugger from 'debug'
import semver from 'semver'
import codes from './codes'

const { DATA, ACK, END } = codes

const OLD_BUFFER = !global.window && semver.lt(process.version, '6.0.0')

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

    socket.onopen = () => {
      debug(`${this.socket._name}: okay, I'm ready`)
      this.uncork()
    }

    socket.onclose = (code, msg) => {
      debug(`${this.socket._name}: I've lost the connection`)
      this.emit('close', code, msg)
    }

    socket.onerror = (err) => {
      debug(`${this.socket._name}: uh oh, error!`)
      this.emit('error', err)
    }

    socket.onmessage = (msg) => {
      let data = OLD_BUFFER
        ? new Buffer(new Uint8Array(msg.data)) : Buffer.from(msg.data)
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
    }
  }

  _writev (chunks, callback) {
    debug(`${this.socket._name}: hey, I'm sending you all buffered data`)
    let chunk = chunks.reduce((prev, next) => 
      let arr = []
      if (prev) arr.push(prev.chunk)
      if (next) arr.push(next.chunk)

      Buffer.concat(arr)

    )
    this._send(DATA, chunk)
    this._cb = callback
  }

  _write (chunk, encoding, callback) {
    debug(`${this.socket._name}: hey, I'm sending you data`)
    this._send(DATA, chunk)
    this._cb = callback
  }

  _read (size) {
    // Let's not send the first ACK, since it's redundant
    if (this._started) {
      debug(`${this.socket._name}: go ahead, send some more`)
      this._send(ACK)
    }
  }

  _send (code, data) {
    let type = OLD_BUFFER
      ? new Buffer(new Uint8Array([code])) : Buffer.from([code])
    this.socket.send(data ? Buffer.concat([type, data]) : type)
  }
}
