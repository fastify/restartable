'use strict'

const defaultFastify = require('fastify')
const createMutableProxy = require('./lib/mutable-proxy')

const closeCounter = Symbol('closeCounter')

async function restartable (factory, opts, fastify = defaultFastify) {
  let app = await factory((opts) => createApplication(opts, false), opts)
  const server = wrapServer(app.server)

  const { proxy, changeTarget } = createMutableProxy(app, {
    get (target, prop) {
      if (prop === 'then') {
        return undefined
      }
      return target[prop]
    }
  })

  let newHandler = null

  async function restart (restartOptions) {
    const requestListeners = server.listeners('request')
    const clientErrorListeners = server.listeners('clientError')

    let newApp = null
    try {
      newApp = await factory(createApplication, opts, restartOptions)
      if (server.listening) {
        const { port, address } = server.address()
        await newApp.listen({ port, host: address })
      } else {
        await newApp.ready()
      }
    } catch (error) {
      restoreClientErrorListeners(server, clientErrorListeners)

      // In case if fastify.listen() would throw an error
      // istanbul ignore next
      if (newApp !== null) {
        await closeApplication(newApp)
      }
      throw error
    }

    server.on('request', newHandler)

    removeRequestListeners(server, requestListeners)
    removeClientErrorListeners(server, clientErrorListeners)

    changeTarget(newApp)
    await closeApplication(app)

    app = newApp
  }

  let debounce = null
  // TODO: think about queueing restarts with different options
  async function debounceRestart (...args) {
    if (debounce === null) {
      debounce = restart(...args).finally(() => { debounce = null })
    }
    return debounce
  }

  function createApplication (newOpts, isRestarted = true) {
    opts = newOpts

    const serverFactory = (handler) => {
      newHandler = handler
      return server
    }

    const app = isRestarted
      ? fastify({ ...newOpts, serverFactory })
      : fastify(newOpts)

    app.decorate('restart', debounceRestart)
    app.decorate('restarted', isRestarted)

    return app
  }

  async function closeApplication (app) {
    server[closeCounter]--
    try {
      await app.close()
    } finally {
      server[closeCounter]++
    }
  }

  return proxy
}

function wrapServer (server) {
  const _listen = server.listen.bind(server)

  server.listen = (...args) => {
    const cb = args[args.length - 1]
    return server.listening ? cb() : _listen(...args)
  }

  server[closeCounter] = 0

  const _close = server.close.bind(server)
  server.close = (cb) => server[closeCounter] >= 0 ? _close(cb) : cb()

  // istanbul ignore next
  // closeAllConnections was added in Nodejs v18.2.0
  if (server.closeAllConnections) {
    const _closeAllConnections = server.closeAllConnections.bind(server)
    server.closeAllConnections = () => server[closeCounter] >= 0 && _closeAllConnections()
  }

  // istanbul ignore next
  // closeIdleConnections was added in Nodejs v18.2.0
  if (server.closeIdleConnections) {
    const _closeIdleConnections = server.closeIdleConnections.bind(server)
    server.closeIdleConnections = () => server[closeCounter] >= 0 && _closeIdleConnections()
  }

  return server
}

function removeRequestListeners (server, listeners) {
  for (const listener of listeners) {
    server.removeListener('request', listener)
  }
}

function removeClientErrorListeners (server, listeners) {
  for (const listener of listeners) {
    server.removeListener('clientError', listener)
  }
}

function restoreClientErrorListeners (server, oldListeners) {
  // Creating a new Fastify apps adds one clientError listener
  // Let's remove all the new ones
  const listeners = server.listeners('clientError')
  for (const listener of listeners) {
    if (!oldListeners.includes(listener)) {
      server.removeListener('clientError', listener)
    }
  }
}

module.exports = restartable
module.exports.default = restartable
module.exports.restartable = restartable
