/* eslint-disable no-undef */

import semver from 'semver'
import { expect } from 'chai'
import WebSocketStream from '../lib'
import WebSocket from 'ws'

describe('ws-streamify', () => {
  let port = 8000
  let wss = new WebSocket.Server({ port })
  let socket0
  let socket1

  beforeEach((done) => {
    socket0 = new WebSocket('ws://localhost:' + port)
    socket0.once('open', done)
    wss.once('connection', (ws) => { socket1 = ws })
  })

  it('supports ending of stream', (done) => {
    let stream0 = new WebSocketStream(socket0)
    let stream1 = new WebSocketStream(socket1)
    stream0.end()
    stream1.resume()
    stream1.once('end', done)
  })

  it('passes data through streams', (done) => {
    let stream0 = new WebSocketStream(socket0)
    let stream1 = new WebSocketStream(socket1)
    let msg = 'hello!'
    stream0.write(msg)
    stream1.once('data', (data) => {
      expect(data.toString()).to.equal(msg)
      stream0.end()
      stream1.once('end', done)
    })
  })

  it('handles back-pressure', (done) => {
    let options = { highWaterMark: 1024 } // 1kb
    let stream0 = new WebSocketStream(socket0, options)
    let stream1 = new WebSocketStream(socket1, options)
    // let's write a big chunk
    let data = (semver.lt(process.version, '5.10.0'))
      ? new Buffer(2048) : Buffer.alloc(2048) // 2Kb
    stream0.write(data)
    stream1.once('readable', () => {
      // the stream1 read buffer is overwhelmed
      // as well as the stream0 write buffer
      expect(stream0.write('sorry, not this time')).to.equal(false)
      // however, stream1 itself still can send data
      expect(stream1.write('because I can')).to.equal(true)
      stream0.once('readable', () => {
        // so, let's flush the stream1 buffer
        stream1.resume()
        // the stream1 buffer is now empty
        // and it asks stream0 to continue sending data
        stream0.once('drain', () => {
          // stream0 has sent data from its buffer
          // and now it's actually able to send some more, yahoo!
          expect(stream0.write('now I can')).to.equal(true)
          stream0.end()
          stream1.once('end', done)
        })
      })
    })
  })

  it('merges pending buffers', (done) => {
    let stream0 = new WebSocketStream(socket0)
    let stream1 = new WebSocketStream(socket1)
    stream0.cork()
    stream0.write('hello ')
    stream0.write('world')
    stream0.uncork()
    stream1.once('data', (data) => {
      expect(data.toString()).to.equal('hello world')
      stream0.end()
      stream1.once('end', done)
    })
  })

  it('fires close event when connection closes', (done) => {
    let stream1 = new WebSocketStream(socket1)
    socket0.close()
    stream1.once('close', (code, msg) => done())
  })
})
