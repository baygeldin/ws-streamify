/* eslint-disable no-undef */

import { expect } from 'chai'
import WebSocketStream from '../lib'
import WebSocket from 'ws'

describe('ws-streamify', () => {
  let port = 8000
  let wss = new WebSocket.Server({ port })
  let socket0
  let socket1

  after(() => {
    wss.close()
  })

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
    stream0.write(Buffer.alloc(2048)) // 2kb
    stream1.once('readable', () => {
      // the stream1 buffer is overwhelmed
      // and it asks stream0 to stop sending data
      // however, stream1 itself still can send data
      expect(stream1.write('because I can')).to.equal(true)
      stream0.once('readable', () => {
        // but stream0 can't since the stream1 buffer is full
        // however, it can fill its internal buffer
        expect(stream0.write(Buffer.alloc(512))).to.equal(true)
        // ...but no more than its highWaterMark
        expect(stream0.write(Buffer.alloc(1024))).to.equal(false)
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

  it('fires close event when connection closes', (done) => {
    let stream1 = new WebSocketStream(socket1)
    socket0.close()
    stream1.once('close', (code, msg) => done())
  })
})
