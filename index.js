'use strict'

const Fastify = require('fastify')
const buildServer = require('./lib/server')

async function start (opts) {
  const serverWrapper = buildServer(opts)

  let listening = false
  let stopped = false
  let handler

  const res = {
    app: await (spinUpFastify(opts, serverWrapper, restart, true).ready()),
    restart,
    get address () {
      if (!listening) {
        throw new Error('Server is not listening')
      }
      return serverWrapper.address
    },
    get port () {
      if (!listening) {
        throw new Error('Server is not listening')
      }
      return serverWrapper.port
    },
    inject (...args) {
      return res.app.inject(...args)
    },
    async listen () {
      await serverWrapper.listen()
      listening = true
      res.app.log.info({ url: `${opts.protocol || 'http'}://${serverWrapper.address}:${serverWrapper.port}` }, 'server listening')
      return {
        address: serverWrapper.address,
        port: serverWrapper.port
      }
    },
    stop
  }

  res.app.server.on('request', handler)

  return res

  async function restart (_opts = opts) {
    const old = res.app
    const oldHandler = handler
    const clientErrorListeners = old.server.listeners('clientError')
    const newApp = spinUpFastify(_opts, serverWrapper, restart)
    try {
      await newApp.ready()
      old.server.removeListener('request', oldHandler)
      old.server.removeListener('request', oldHandler)
      newApp.server.on('request', handler)
      for (const listener of clientErrorListeners) {
        old.server.removeListener('clientError', listener)
      }
      res.app = newApp

      await old.close()
    } catch (err) {
      const listenersNow = newApp.server.listeners('clientError')
      handler = oldHandler
      for (const listener of listenersNow) {
        if (clientErrorListeners.indexOf(listener) === -1) {
          old.server.removeListener('clientError', listener)
        }
      }
      await newApp.close()
      throw err
    }
  }

  async function stop () {
    if (stopped) {
      return
    }
    stopped = true
    const toClose = []
    if (listening) {
      toClose.push(serverWrapper.close())
    }
    toClose.push(res.app.close())
    await Promise.all(toClose)
    res.app.log.info('server stopped')
  }

  function spinUpFastify (opts, serverWrapper, restart, isStart = false) {
    const server = serverWrapper.server
    const _opts = Object.assign({}, opts)
    _opts.serverFactory = function (_handler) {
      handler = _handler
      return server
    }
    const app = Fastify(_opts)

    app.decorate('restart', restart)
    app.decorate('restarted', !isStart)
    app.register(opts.app, opts)

    return app
  }
}

module.exports = {
  start
}
