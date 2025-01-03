'use strict'

const { join } = require('node:path')
const { once } = require('node:events')
const { readFile } = require('node:fs/promises')
const http2 = require('node:http2')

const { afterEach, test } = require('node:test')
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

afterEach(async () => {
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.assert.strictEqual(host, `http://127.0.0.1:${COMMON_PORT}`)
  t.assert.strictEqual(app.addresses()[0].address, '127.0.0.1')
  t.assert.strictEqual(app.addresses()[0].port, COMMON_PORT)

  t.assert.strictEqual(app.restarted, false)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
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
      t.assert.strictEqual(app.closingRestartable, closingRestartable)
      t.assert.ok('onClose hook called')
    })

    return app
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.assert.strictEqual(host, `http://127.0.0.1:${COMMON_PORT}`)
  t.assert.strictEqual(app.addresses()[0].address, '127.0.0.1')
  t.assert.strictEqual(app.addresses()[0].port, COMMON_PORT)

  t.assert.strictEqual(app.restarted, false)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.assert.strictEqual(host, `https://127.0.0.1:${COMMON_PORT}`)
  t.assert.strictEqual(app.addresses()[0].address, '127.0.0.1')
  t.assert.strictEqual(app.addresses()[0].port, COMMON_PORT)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.assert.strictEqual(host, `http://127.0.0.1:${COMMON_PORT}`)
  t.assert.strictEqual(app.addresses()[0].address, '127.0.0.1')
  t.assert.strictEqual(app.addresses()[0].port, COMMON_PORT)

  const client = http2.connect(host)

  t.after(() => {
    client.close()
  })

  {
    const req = client.request({ ':path': '/' })
    req.setEncoding('utf8')

    let data = ''
    req.on('data', (chunk) => { data += chunk })
    await once(req, 'end')
    req.end()

    t.assert.deepStrictEqual(JSON.parse(data), { hello: 'world' })
  }

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)

  {
    const req = client.request({ ':path': '/' })
    req.setEncoding('utf8')

    let data = ''
    req.on('data', (chunk) => { data += chunk })
    await once(req, 'end')
    req.end()

    t.assert.deepStrictEqual(JSON.parse(data), { hello: 'world' })
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: COMMON_PORT })
  t.assert.strictEqual(host, `https://127.0.0.1:${COMMON_PORT}`)
  t.assert.strictEqual(app.addresses()[0].address, '127.0.0.1')
  t.assert.strictEqual(app.addresses()[0].port, COMMON_PORT)

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

  {
    const res = await request(`${host}/restart`)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  t.assert.deepStrictEqual(app.restarted, true)

  {
    const res = await request(`${host}/restart`)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
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
  t.assert.deepStrictEqual(app.server.listening, false)

  {
    const res = await app.inject('/restart')
    t.assert.deepStrictEqual(res.json(), { hello: 'world' })
  }

  t.assert.deepStrictEqual(app.restarted, true)
  t.assert.deepStrictEqual(app.server.listening, false)

  {
    const res = await app.inject('/restart')
    t.assert.deepStrictEqual(res.json(), { hello: 'world' })
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

  {
    const [{ level, msg }] = await once(stream, 'data')
    t.assert.strictEqual(level, 30)
    t.assert.strictEqual(msg, `Server listening at ${host}`)
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
    t.assert.deepStrictEqual(opts, expected)

    const newOpts = expectedOpts[restartCounter]
    const app = fastify(newOpts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, opts1)

  t.after(async () => {
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
    t.assert.deepStrictEqual(restartOpts, expected)

    const app = fastify(opts)

    app.get('/', async () => {
      return { hello: 'world' }
    })

    return app
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
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

  t.after(async () => {
    process.removeListener('warning', onWarning)
  })

  const app = await restartable(createApplication)

  t.after(async () => {
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

  t.assert.deepStrictEqual(app.restarted, false)

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  await t.assert.rejects(app.restart())

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  await app.restart()

  const res = await request(host, { method: 'GET' })
  t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })
  t.assert.strictEqual(app.restarted, false)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }
})

test('should not set the server handler before application is ready', async (t) => {
  let restartCounter = 0

  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    if (app.restarted) {
      const res = await request(host)
      t.assert.deepStrictEqual(await res.body.json(), { version: 1 })
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

  t.after(async () => {
    await app.close()
  })

  const host = await app.listen({ host: '127.0.0.1', port: 0 })

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { version: 1 })
  }

  await app.restart()
  t.assert.deepStrictEqual(app.restarted, true)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { version: 2 })
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

  t.after(async () => {
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

  t.assert.deepStrictEqual(app.restarted, true)
  t.assert.deepStrictEqual(startCounter, 2)

  {
    const res = await request(host)
    t.assert.deepStrictEqual(await res.body.json(), { hello: 'world' })
  }
})

test('should contain a persistentRef property', async (t) => {
  let firstPersistentRef = null

  async function createApplication (fastify, opts) {
    const app = fastify(opts)

    if (app.restarted) {
      t.assert.strictEqual(app.persistentRef, proxy)
    } else {
      firstPersistentRef = app.persistentRef
    }

    return app
  }

  const proxy = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.assert.strictEqual(firstPersistentRef, proxy)

  t.after(async () => {
    await proxy.close()
  })

  await proxy.listen({ host: '127.0.0.1', port: 0 })

  t.assert.strictEqual(proxy.persistentRef, proxy)

  await proxy.restart()

  t.assert.strictEqual(proxy.persistentRef, proxy)
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

  t.assert.ok(app.server.listening)

  app.server.on('close', () => {
    t.assert.ok('server close event emitted')
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

  t.assert.ok(app.server.listening)

  app.restart()
  await new Promise((resolve) => setTimeout(resolve, 500))
  await app.close()

  t.assert.ok(!app.server.listening)
})

test('should restart an app before listening', async (t) => {
  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  await app.restart()
  t.assert.ok(app.restarted)

  await app.listen({ host: '127.0.0.1', port: 0 })
  t.assert.ok(app.server.listening)

  await app.close()
  t.assert.ok(!app.server.listening)
})
