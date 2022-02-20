'use strict'

const http = require('http')
const https = require('https')
const { once } = require('events')
const { FST_RST_UNKNOWN_PROTOCOL } = require('./errors')

module.exports = function buildServer ({ protocol = 'http', port, hostname = '127.0.0.1', key, cert }) {
  let server

  switch (protocol) {
    case 'http':
      server = http.createServer()
      break
    case 'https':
      server = https.createServer({ key, cert })
      break
    default:
      throw new FST_RST_UNKNOWN_PROTOCOL(protocol)
  }

  return {
    server,
    protocol,
    get address () {
      return server.address().address
    },
    get port () {
      return server.address().port
    },
    async listen () {
      server.listen(port, hostname)
      await once(server, 'listening')
      return server.address()
    },
    async close () {
      server.close()
      await once(server, 'close')
    }
  }
}
