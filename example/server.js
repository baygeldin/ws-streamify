import path from 'path'
import http from 'http'
import fs from 'fs'
import WebSocket from 'ws'
import WebSocketStream from '../lib'

let server = http.createServer((req, res) => {
  fs.createReadStream(path.join(__dirname,
    req.url === '/bundle.js' ? 'bundle.js' : 'index.html'))
  .pipe(res)
}).listen(8000)

console.log('Server listening on port 8000')

let wss = WebSocket.Server({ server })
wss.on('connection', (ws) => {
  ws._name = 'server'
  let stream = new WebSocketStream(ws, { highWaterMark: 1024 })
  fs.createReadStream(path.join(__dirname, 'lorem.txt'),
    { highWaterMark: 2048 })
  .pipe(stream)
})
