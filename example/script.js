/* global WebSocket */

import WebSocketStream from '../lib'

window.localStorage.setItem('debug', 'ws-streamify')

window.onload = () => {
  let socket = new WebSocket('ws://localhost:8000')
  socket._name = 'browser'
  let stream = new WebSocketStream(socket, { highWaterMark: 1024 })

  window.onclick = () => {
    let chunk = stream.read(1024).toString()
    document.body.appendChild(document.createTextNode(chunk))
  }
}
