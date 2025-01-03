'use strict'

const http = require('node:http')
const https = require('node:https')

const { FST_ERR_HTTP2_INVALID_VERSION } = require('fastify').errorCodes

function getServerInstance (options, httpHandler) {
  let server = null
  if (options.http2) {
    if (options.https) {
      server = http2().createSecureServer(options.https, httpHandler)
    } else {
      server = http2().createServer(httpHandler)
    }
    server.on('session', sessionTimeout(options.http2SessionTimeout))
  } else {
    // this is http1
    if (options.https) {
      server = https.createServer(options.https, httpHandler)
    } else {
      server = http.createServer(options.http, httpHandler)
    }
    server.keepAliveTimeout = options.keepAliveTimeout
    server.requestTimeout = options.requestTimeout
    // we treat zero as null
    // and null is the default setting from nodejs
    // so we do not pass the option to server
    if (options.maxRequestsPerSocket > 0) {
      server.maxRequestsPerSocket = options.maxRequestsPerSocket
    }
  }
  return server
}

function http2 () {
  try {
    return require('node:http2')
  } /* c8 ignore start */ catch {
    throw new FST_ERR_HTTP2_INVALID_VERSION()
  } /* c8 ignore end */
}

function sessionTimeout (timeout) {
  return function (session) {
    session.setTimeout(timeout, close)
  }
}

function close () {
  this.close()
}

module.exports = getServerInstance
