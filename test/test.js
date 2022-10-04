'use strict'

const { test } = require('tap')
const { start } = require('..')
const { request, setGlobalDispatcher, Agent } = require('undici')
const path = require('path')
const { readFile } = require('fs').promises
const split = require('split2')
const { once } = require('events')

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
  tls: {
    rejectUnauthorized: false
  }
}))

test('restart fastify', async ({ pass, teardown, plan, same, equal }) => {
  plan(11)

  const _opts = {
    port: 0,
    app: myApp
  }

  async function myApp (app, opts) {
    pass('application loaded')
    equal(opts, _opts)
    app.get('/', async () => {
      return { hello: 'world' }
    })
  }

  const server = await start(_opts)

  same(server.app.restarted, false)

  const { stop, restart, listen } = server
  teardown(stop)

  const { port, address } = await listen()

  equal(address, '127.0.0.1')
  equal(port, server.port)
  equal(address, server.address)

  {
    const res = await request(`http://127.0.0.1:${port}`)
    same(await res.body.json(), { hello: 'world' })
  }

  await restart()
  same(server.app.restarted, true)

  {
    const res = await request(`http://127.0.0.1:${port}`)
    same(await res.body.json(), { hello: 'world' })
  }
})

test('https', async ({ pass, teardown, plan, same, equal }) => {
  plan(5)

  async function myApp (app, opts) {
    pass('application loaded')
    app.get('/', async (req, reply) => {
      return { hello: 'world' }
    })
  }

  const { listen, stop, restart } = await start({
    port: 0,
    protocol: 'https',
    key: await readFile(path.join(__dirname, 'fixtures', 'key.pem')),
    cert: await readFile(path.join(__dirname, 'fixtures', 'cert.pem')),
    app: myApp
  })
  teardown(stop)

  const { address, port } = await listen()

  equal(address, '127.0.0.1')

  {
    const res = await request(`https://127.0.0.1:${port}`)
    same(await res.body.json(), { hello: 'world' })
  }

  await restart()

  {
    const res = await request(`https://127.0.0.1:${port}`)
    same(await res.body.json(), { hello: 'world' })
  }
})

test('wrong protocol', async function (t) {
  await t.rejects(() => {
    return start({
      port: 0,
      protocol: 'foobar',
      app: () => {}
    })
  }, /Unknown Protocol foobar/)
})

test('restart from a route', async ({ pass, teardown, plan, same, equal }) => {
  plan(3)

  async function myApp (app, opts) {
    pass('application loaded')
    app.get('/restart', async (req, reply) => {
      await app.restart()
      return { hello: 'world' }
    })
  }

  const { stop, listen } = await start({
    port: 0,
    app: myApp
  })
  teardown(stop)

  const { port } = await listen()

  {
    const res = await request(`http://127.0.0.1:${port}/restart`)
    same(await res.body.json(), { hello: 'world' })
  }
})

test('inject', async ({ pass, teardown, plan, same, equal }) => {
  plan(3)

  async function myApp (app, opts) {
    pass('application loaded')
    app.get('/restart', async (req, reply) => {
      await app.restart()
      return { hello: 'world' }
    })
  }

  const { stop, inject } = await start({
    port: 0,
    app: myApp
  })
  teardown(stop)

  {
    const res = await inject('/restart')
    same(res.json(), { hello: 'world' })
  }
})

test('not listening', async function (t) {
  const res = await start({
    app: async () => {}
  })

  t.throws(() => res.address, /not listening/)
  t.throws(() => res.port, /not listening/)
})

test('logger', async ({ pass, teardown, equal }) => {
  const stream = split(JSON.parse)

  const _opts = {
    port: 0,
    app: myApp,
    logger: {
      stream
    }
  }

  async function myApp (app, opts) {
    pass('application loaded')
    equal(opts, _opts)
    app.get('/', async () => {
      return { hello: 'world' }
    })
  }

  const server = await start(_opts)
  const { stop, listen } = server
  teardown(stop)

  const { port, address } = await listen()

  {
    const [{ level, msg, url }] = await once(stream, 'data')
    equal(level, 30)
    equal(url, `http://${address}:${port}`)
    equal(msg, 'server listening')
  }

  await stop()

  {
    const [{ level, msg }] = await once(stream, 'data')
    equal(level, 30)
    equal(msg, 'server stopped')
  }
})

test('change opts', async ({ teardown, plan, equal }) => {
  plan(2)

  const _opts = {
    port: 0,
    app: myApp
  }

  const expected = [undefined, 'bar']

  async function myApp (_, opts) {
    equal(opts.foo, expected.shift())
  }

  const server = await start(_opts)
  const { stop, restart, listen } = server
  teardown(stop)

  await listen()

  await restart({
    foo: 'bar',
    app: myApp
  })
})

test('no warnings', async ({ pass, teardown, plan, same, equal, fail }) => {
  plan(12)

  const _opts = {
    port: 0,
    app: myApp
  }

  async function myApp (app, opts) {
    pass('application loaded')
  }

  const onWarning = (warning) => {
    fail(warning.message)
  }

  process.on('warning', onWarning)
  teardown(() => {
    process.removeListener('warning', onWarning)
  })

  const server = await start(_opts)
  const { stop, restart, listen } = server
  teardown(stop)

  await listen()

  for (let i = 0; i < 11; i++) {
    await restart()
  }
})
