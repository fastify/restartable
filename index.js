'use strict'

const Fastify = require('fastify')
const buildServer = require('./lib/server')

async function start (opts) {
  const serverWrapper = buildServer(opts)

  const res = {
    app: await (spinUpFastify(opts, serverWrapper, restart).ready()),
    restart,
    get address () {
      return serverWrapper.address
    },
    get port () {
      return serverWrapper.port
    },
    stop
  }

  res.app.server.on('request', res.app.server.handler)
  await serverWrapper.listen()

  return res

  async function restart () {
    const old = res.app
    const oldHandler = serverWrapper.server.handler
    const newApp = spinUpFastify(opts, serverWrapper, restart)
    await newApp.ready()
    old.server.removeListener('request', oldHandler)
    newApp.server.on('request', newApp.server.handler)
    res.app = newApp
    await old.close()
  }

  async function stop () {
    await Promise.all([
      serverWrapper.close(),
      res.app.close()
    ])
  }
}

function spinUpFastify (opts, serverWrapper, restart) {
  const server = serverWrapper.server
  const _opts = Object.assign({}, opts)
  _opts.serverFactory = function (handler) {
    server.handler = handler
    return server
  }
  const app = Fastify(_opts)

  app.decorate('restart', restart)

  app.register(opts.app)

  return app
}

module.exports = {
  start
}
