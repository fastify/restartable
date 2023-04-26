'use strict'

const { join } = require('path')
const { once } = require('events')
const { readFile } = require('fs/promises')

const split = require('split2')
const { test } = require('tap')
const { request, setGlobalDispatcher, Agent } = require('undici')

const { restartable } = require('..')
const fastify = require('fastify')

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
  tls: {
    rejectUnauthorized: false
  }
}))

test('should create and restart fastify app', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, {})

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 5843 })
  t.equal(host, 'http://127.0.0.1:5843')
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, 5843)

  t.equal(app.restarted, false)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.same(app.restarted, true)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }
})

test('should create and restart fastify app twice', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, {})

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 5844 })
  t.equal(host, 'http://127.0.0.1:5844')
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, 5844)

  t.equal(app.restarted, false)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.same(app.restarted, true)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.same(app.restarted, true)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }
})

test('should create and restart fastify https app', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const opts = {
    key: await readFile(join(__dirname, 'fixtures', 'key.pem')),
    cert: await readFile(join(__dirname, 'fixtures', 'cert.pem'))
  }
  const app = await restartable(createApplication, fastify, opts)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 5844 })
  t.equal(host, 'http://127.0.0.1:5844')
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, 5844)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.same(app.restarted, true)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }
})

test('should restart an app from a route handler', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/restart', async () => {
      await app.restart()
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, {})

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ port: 0 })

  {
    const res = await request(`${host}/restart`)
    t.same(await res.body.json(), { hello: 'world' })
  }

  t.same(app.restarted, true)

  {
    const res = await request(`${host}/restart`)
    t.same(await res.body.json(), { hello: 'world' })
  }
})

test('should restart an app from inject call', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/restart', async () => {
      await app.restart()
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, {})
  t.same(app.server.listening, false)

  {
    const res = await app.inject('/restart')
    t.same(res.json(), { hello: 'world' })
  }

  t.same(app.restarted, true)
  t.same(app.server.listening, false)

  {
    const res = await app.inject('/restart')
    t.same(res.json(), { hello: 'world' })
  }
})

test('logger', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const stream = split(JSON.parse)
  const opts = {
    logger: { stream }
  }

  const app = await restartable(createApplication, fastify, opts)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ port: 0 })

  {
    const [{ level, msg }] = await once(stream, 'data')
    t.equal(level, 30)
    t.equal(msg, `Server listening at ${host}`)
  }
})

test('should save new default options after restart', async (t) => {
  const opts1 = { requestTimeout: 1000 }
  const opts2 = { requestTimeout: 2000 }

  let restartCounter = 0
  const expectedOpts = [opts1, opts2]

  async function createApplication (fastify, opts) {
    const expected = expectedOpts[restartCounter++]
    t.same(opts, expected)

    const newOpts = expectedOpts[restartCounter]
    const app = fastify(newOpts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, opts1)

  t.teardown(async () => {
    await app.close()
  })

  await app.listen({ port: 0 })
  await app.restart()
})

test('should send a restart options', async (t) => {
  const restartOpts1 = undefined
  const restartOpts2 = { foo: 'bar' }

  let restartCounter = 0
  const expectedOpts = [restartOpts1, restartOpts2]

  async function createApplication (fastify, opts, restartOpts) {
    const expected = expectedOpts[restartCounter++]
    t.same(restartOpts, expected)

    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, {})

  t.teardown(async () => {
    await app.close()
  })

  await app.listen({ port: 0 })
  await app.restart(restartOpts2)
})

test('no warnings', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const onWarning = (warning) => {
    t.fail(warning.message)
  }

  process.on('warning', onWarning)

  t.teardown(async () => {
    process.removeListener('warning', onWarning)
  })

  const app = await restartable(createApplication, fastify)

  t.teardown(async () => {
    await app.close()
  })

  await app.listen({ port: 0 })

  for (let i = 0; i < 11; i++) {
    await app.restart()
  }
})

test('should not restart fastify after a failed start', async (t) => {
  let count = 0

  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.register(async function () {
      if (count++ % 2) {
        throw new Error('kaboom')
      }
    })

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, {})

  t.same(app.restarted, false)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ port: 0 })

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }

  await t.rejects(app.restart())

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }

  await app.restart()

  const res = await request(host, { method: 'GET' })
  t.same(await res.body.json(), { hello: 'world' })
})

test('should create and restart fastify app with forceCloseConnections', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, fastify, {
    forceCloseConnections: true
  })

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 5843 })
  t.equal(host, 'http://127.0.0.1:5843')
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, 5843)

  t.equal(app.restarted, false)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.same(app.restarted, true)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }
})

test('should not set the server handler before application is ready', async (t) => {
  let restartCounter = 0

  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    if (app.restarted) {
      const res = await request(host)
      t.same(await res.body.json(), { version: 1 })
    }

    app.get('/', async () => {
      return { version: restartCounter }
    })

    restartCounter++
    return app
  }

  const app = await restartable(createApplication, fastify, {})

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ port: 0 })

  {
    const res = await request(host)
    t.same(await res.body.json(), { version: 1 })
  }

  await app.restart()
  t.same(app.restarted, true)

  {
    const res = await request(host)
    t.same(await res.body.json(), { version: 2 })
  }
})
