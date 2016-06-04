# ws-streamify [![Build Status](https://travis-ci.org/baygeldin/ws-streamify.svg?branch=master)](https://travis-ci.org/baygeldin/ws-streamify)


Utility to pipe Node.js streams over WebSockets in a native way.

## Motivation
WebSockets is a messenging protocol built over TCP. It's very simple and very good but it has one shortcoming — it does not handle the back-pressure, meaning that you can send massive amounts of data and never know that the other side is running out of memory or having problems consuming so much data. TCP does handle the back-pressure itself, so why just not use it instead of WebSockets? Because TCP channels are not supported in browsers. Another reason to use it is, for example, if you want to bypass a firewall. Fortunately, Node.js already has an awesome solution to handle back-pressure — streams. So, this is a natural solution for JavaScript. In addition you receive a handy stream interface in the browser. So, it's almost like a `net.Socket` in your browser :)

![Yo Dawg I heard you like TCP, so we put a TCP in yo TCP so you can stream while u stream](http://i.imgur.com/MYetOWa.jpg)

## Install
```
$ npm install ws-streamify
```
It has support for Node.js >= 0.12. Almost zero dependencies (for browsers, however, it requires polyfills for some Node.js core libraries which is not a problem with webpack of browserify).

## Usage
```javascript
// socket is a W3C compliant WebSocket object
// options is a common options object for Node.js streams
new WebSocketStream(socket, options)
```

```javascript
// server.js

import WebSocket from 'ws'
import WebSocketStream from 'ws-streamify'

WebSocket.Server({ port: 8000 }).on('connection', (ws) => {
  let stream = new WebSocketStream(ws, { highWaterMark: 1024 })
  fs.createReadStream(path.join(__dirname, 'lorem.txt')).pipe(stream)
})
```

```javascript
// client.js

import WebSocketStream from 'ws-streamify'

let socket = new WebSocket('ws://localhost:8000')
let stream = new WebSocketStream(socket, { highWaterMark: 1024 })
```

## Running tests
```
$ npm install
$ npm test
```

## Running example
```
$ npm install
$ npm start
```
It will start a server on localhost with a simple example page. You can click on it and it will read text from the stream and print it. In the terminal and browser consoles flow control messages will appear. Also, check `Network -> ws://localhost:8000/ -> Frames` in the Chrome DevTools.
