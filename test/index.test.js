'use strict'

const { join } = require('path')
const { once } = require('events')
const { readFile } = require('fs/promises')
const http2 = require('http2')

const t = require('tap')
const split = require('split2')
const { request, setGlobalDispatcher, Agent } = require('undici')

const { restartable } = require('..')

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 1,
  keepAliveMaxTimeout: 1,
  tls: {
    rejectUnauthorized: false
  }
}))

const COMMON_PORT = 4242

const test = t.test
t.jobs = 1
t.afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10))
})

test('should create and restart fastify app', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.equal(host, `http://127.0.0.1:${COMMON_PORT}`)
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, COMMON_PORT)

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
  t.plan(15)

  let closingRestartable = false

  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    let closeCounter = 0
    app.addHook('onClose', async () => {
      if (++closeCounter > 1) {
        t.fail('onClose hook called more than once')
      }
      t.equal(app.closingRestartable, closingRestartable)
      t.pass('onClose hook called')
    })

    return app
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.equal(host, `http://127.0.0.1:${COMMON_PORT}`)
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, COMMON_PORT)

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

  closingRestartable = true
  await app.close()
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
    https: {
      key: await readFile(join(__dirname, 'fixtures', 'key.pem')),
      cert: await readFile(join(__dirname, 'fixtures', 'cert.pem'))
    },
    keepAliveTimeout: 1,
    maxRequestsPerSocket: 42
  }
  const app = await restartable(createApplication, opts)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.equal(host, `https://127.0.0.1:${COMMON_PORT}`)
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, COMMON_PORT)

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

test('should create and restart fastify http2 app', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const opts = {
    http2: true,
    http2SessionTimeout: 1000,
    keepAliveTimeout: 1
  }
  const app = await restartable(createApplication, opts)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.equal(host, `http://127.0.0.1:${COMMON_PORT}`)
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, COMMON_PORT)

  const client = http2.connect(host)

  t.teardown(() => {
    client.close()
  })

  {
    const req = client.request({ ':path': '/' })
    req.setEncoding('utf8')

    let data = ''
    req.on('data', (chunk) => { data += chunk })
    await once(req, 'end')
    req.end()

    t.same(JSON.parse(data), { hello: 'world' })
  }

  await app.restart()
  t.same(app.restarted, true)

  {
    const req = client.request({ ':path': '/' })
    req.setEncoding('utf8')

    let data = ''
    req.on('data', (chunk) => { data += chunk })
    await once(req, 'end')
    req.end()

    t.same(JSON.parse(data), { hello: 'world' })
  }
})

test('should create and restart fastify https2 app', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const opts = {
    http2: true,
    https: {
      key: await readFile(join(__dirname, 'fixtures', 'key.pem')),
      cert: await readFile(join(__dirname, 'fixtures', 'cert.pem'))
    },
    keepAliveTimeout: 1
  }
  const app = await restartable(createApplication, opts)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.equal(host, `https://127.0.0.1:${COMMON_PORT}`)
  t.equal(app.addresses()[0].address, '127.0.0.1')
  t.equal(app.addresses()[0].port, COMMON_PORT)

  await app.restart()
  t.same(app.restarted, true)
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

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

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

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })
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
    logger: { stream },
    keepAliveTimeout: 1
  }

  const app = await restartable(createApplication, opts)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

  {
    const [{ level, msg }] = await once(stream, 'data')
    t.equal(level, 30)
    t.equal(msg, `Server listening at ${host}`)
  }
})

test('should save new default options after restart', async (t) => {
  const opts1 = {
    keepAliveTimeout: 1,
    requestTimeout: 1000
  }
  const opts2 = {
    keepAliveTimeout: 1,
    requestTimeout: 2000
  }

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

  const app = await restartable(createApplication, opts1)

  t.teardown(async () => {
    await app.close()
  })

  await app.listen({ host: '127.0.0.1', port: 0 })
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

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.teardown(async () => {
    await app.close()
  })

  await app.listen({ host: '127.0.0.1', port: 0 })
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

  const app = await restartable(createApplication)

  t.teardown(async () => {
    await app.close()
  })

  await app.listen({ host: '127.0.0.1', port: 0 })

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

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.same(app.restarted, false)

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

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

  const app = await restartable(createApplication, {
    forceCloseConnections: true,
    keepAliveTimeout: 1
  })

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })
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

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

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

test('should not restart an application multiple times simultaneously', async (t) => {
  let startCounter = 0

  async function createApplication (fastify, opts) {
    startCounter++

    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    await new Promise((resolve) => setTimeout(resolve, 500))
    return app
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.teardown(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

  await Promise.all([
    app.restart(),
    app.restart(),
    app.restart(),
    app.restart(),
    app.restart()
  ])

  t.same(app.restarted, true)
  t.same(startCounter, 2)

  {
    const res = await request(host)
    t.same(await res.body.json(), { hello: 'world' })
  }
})

test('should contain a persistentRef property', async (t) => {
  let firstPersistentRef = null

  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    if (app.restarted) {
      t.equal(app.persistentRef, proxy)
    } else {
      firstPersistentRef = app.persistentRef
    }

    return app
  }

  const proxy = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.equal(firstPersistentRef, proxy)

  t.teardown(async () => {
    await proxy.close()
  })

  await proxy.listen({ host: '127.0.0.1', port: 0 })

  t.equal(proxy.persistentRef, proxy)

  await proxy.restart()

  t.equal(proxy.persistentRef, proxy)
})

test('server close event should be emitted only when after closing server', async (t) => {
  t.plan(2)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })
  await app.listen({ host: '127.0.0.1', port: 0 })

  t.ok(app.server.listening)

  app.server.on('close', () => {
    t.pass('server close event emitted')
  })

  await app.restart()
  await app.restart()
  await app.restart()
  await app.restart()
  await app.restart()

  await app.close()
})

test('should close application during the restart', async (t) => {
  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    app.addHook('onClose', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    })

    return app
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })
  await app.listen({ host: '127.0.0.1', port: 0 })

  t.ok(app.server.listening)

  app.restart()
  await new Promise((resolve) => setTimeout(resolve, 500))
  await app.close()

  t.ok(!app.server.listening)
})

test('should restart an app before listening', async (t) => {
  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  await app.restart()
  t.ok(app.restarted)

  await app.listen({ host: '127.0.0.1', port: 0 })
  t.ok(app.server.listening)

  await app.close()
  t.ok(!app.server.listening)
})
