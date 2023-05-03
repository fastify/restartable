'use strict'

const defaultFastify = require('fastify')
const getServerInstance = require('./lib/server')

const closeCounter = Symbol('closeCounter')

async function restartable (factory, opts, fastify = defaultFastify) {
  const proxy = { then: undefined }

  let app = await factory((opts) => createApplication(opts, false), opts)
  const server = wrapServer(app.server)

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

    Object.setPrototypeOf(proxy, newApp)
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

    let createServerCounter = 0
    function serverFactory (handler, options) {
      // this cause an uncaughtException because of the bug in Fastify
      // see: https://github.com/fastify/fastify/issues/4730
      // istanbul ignore next
      if (++createServerCounter > 1) {
        throw new Error(
          'Cannot create multiple server bindings for a restartable application. ' +
          'Please specify an IP address as a host parameter to the fastify.listen()'
        )
      }

      if (isRestarted) {
        newHandler = handler
        return server
      }
      return getServerInstance(options, handler)
    }

    const app = fastify({ ...newOpts, serverFactory })

    if (!isRestarted) {
      Object.setPrototypeOf(proxy, app)
    }

    app.decorate('restart', debounceRestart)
    app.decorate('restarted', {
      getter: () => isRestarted
    })
    app.decorate('persistentRef', {
      getter: () => proxy
    })

    app.addHook('preClose', async () => {
      server[closeCounter]++
    })

    return app
  }

  async function closeApplication (app) {
    server[closeCounter]--
    await app.close()
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
  server.close = (cb) => server[closeCounter] > 0 ? _close(cb) : cb()

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
