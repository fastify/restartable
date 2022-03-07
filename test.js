'use strict'

const { test } = require('tap')
const { start } = require('.')
const { request, setGlobalDispatcher, Agent } = require('undici')
const path = require('path')
const { readFile } = require('fs').promises

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10,
  tls: {
    rejectUnauthorized: false
  }
}))

test('restart fastify', async ({ pass, teardown, plan, same, equal }) => {
  plan(9)

  const _opts = {
    port: 0,
    app: myApp
  }

  async function myApp (app, opts) {
    pass('application loaded')
    equal(opts, _opts)
    app.get('/', async (req, reply) => {
      return { hello: 'world' }
    })
  }

  const server = await start(_opts)
  const { stop, restart, listen } = server
  teardown(stop)

  const { port, address } = await listen()

  equal(address, '127.0.0.1')
  equal(port, server.port)
  equal(address, server.address)

  {
    const res = await request(`http://localhost:${port}`)
    same(await res.body.json(), { hello: 'world' })
  }

  await restart()

  {
    const res = await request(`http://localhost:${port}`)
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
    const res = await request(`https://localhost:${port}`)
    same(await res.body.json(), { hello: 'world' })
  }

  await restart()

  {
    const res = await request(`https://localhost:${port}`)
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
    const res = await request(`http://localhost:${port}/restart`)
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
