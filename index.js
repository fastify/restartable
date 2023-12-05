'use strict'

const defaultFastify = require('fastify')
const getServerInstance = require('./lib/server')

const closingServer = Symbol('closingServer')

async function restartable (factory, opts, fastify = defaultFastify) {
  const proxy = { then: undefined }

  let app = await factory((opts) => createApplication(opts, false), opts)
  const server = wrapServer(app.server)

  let newHandler = null

  const preRestartHooks = []
  const onRestartHooks = []

  async function restart (restartOptions) {
    const requestListeners = server.listeners('request')
    const clientErrorListeners = server.listeners('clientError')

    await executeHooks(preRestartHooks, app, restartOptions)

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

    executeHooks(onRestartHooks, newApp, restartOptions)
  }

  let debounce = null
  // TODO: think about queueing restarts with different options
  async function debounceRestart (...args) {
    if (debounce === null) {
      debounce = restart(...args).finally(() => { debounce = null })
    }
    return debounce
  }

  let serverCloseCounter = 0
  let closingRestartable = false

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

    app.decorate('addPreRestartHook', (hook) => {
      if (typeof hook !== 'function') {
        throw new TypeError('The hook must be a function')
      }
      preRestartHooks.push(hook)
    })

    app.decorate('addOnRestartHook', (hook) => {
      if (typeof hook !== 'function') {
        throw new TypeError('The hook must be a function')
      }
      onRestartHooks.push(hook)
    })

    app.decorate('restarted', {
      getter: () => isRestarted
    })
    app.decorate('persistentRef', {
      getter: () => proxy
    })
    app.decorate('closingRestartable', {
      getter: () => closingRestartable
    })

    app.addHook('preClose', async () => {
      if (++serverCloseCounter > 0) {
        closingRestartable = true
        server[closingServer] = true
      }
    })

    return app
  }

  async function closeApplication (app) {
    serverCloseCounter--
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

  server[closingServer] = false

  const _close = server.close.bind(server)
  server.close = (cb) => server[closingServer] ? _close(cb) : cb()

  // istanbul ignore next
  // closeAllConnections was added in Nodejs v18.2.0
  if (server.closeAllConnections) {
    const _closeAllConnections = server.closeAllConnections.bind(server)
    server.closeAllConnections = () => server[closingServer] && _closeAllConnections()
  }

  // istanbul ignore next
  // closeIdleConnections was added in Nodejs v18.2.0
  if (server.closeIdleConnections) {
    const _closeIdleConnections = server.closeIdleConnections.bind(server)
    server.closeIdleConnections = () => server[closingServer] && _closeIdleConnections()
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

async function executeHooks (hooks, app, opts) {
  for (const hook of hooks) {
    await hook(app, opts)?.catch((error) => app.log.error(error))
  }
}

module.exports = restartable
module.exports.default = restartable
module.exports.restartable = restartable
