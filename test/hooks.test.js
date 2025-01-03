'use strict'

const { afterEach, test } = require('node:test')
const { restartable } = require('..')

afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10))
})

test('should trigger preRestartHook', async (t) => {
  t.plan(4)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
    await app.close()
  })

  const expectedRestartOptions = { foo: 'bar' }

  app.addPreRestartHook(async (app, restartOptions) => {
    t.assert.strictEqual(app.restarted, false)
    t.assert.deepStrictEqual(restartOptions, expectedRestartOptions)
  })

  app.addPreRestartHook(async (app, restartOptions) => {
    t.assert.strictEqual(app.restarted, false)
    t.assert.deepStrictEqual(restartOptions, expectedRestartOptions)
  })

  await app.restart(expectedRestartOptions)
})

test('should not fail preRestartHook throw an error', async (t) => {
  t.plan(3)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
    await app.close()
  })

  const expectedRestartOptions = { foo: 'bar' }

  app.addPreRestartHook(async () => {
    throw new Error('kaboom')
  })

  app.addPreRestartHook(async (app, restartOptions) => {
    t.assert.strictEqual(app.restarted, false)
    t.assert.deepStrictEqual(restartOptions, expectedRestartOptions)
  })

  await app.restart(expectedRestartOptions)

  t.assert.strictEqual(app.restarted, true)
})

test('should throw if preRestartHook is not a function', async (t) => {
  t.plan(1)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
    await app.close()
  })

  t.assert.throws(() => {
    app.addPreRestartHook('not a function')
  }, { message: 'The hook must be a function' })
})

test('should trigger onRestartHook', async (t) => {
  t.plan(4)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
    await app.close()
  })

  const expectedRestartOptions = { foo: 'bar' }

  app.addOnRestartHook(async (app, restartOptions) => {
    t.assert.strictEqual(app.restarted, true)
    t.assert.deepStrictEqual(restartOptions, expectedRestartOptions)
  })

  app.addOnRestartHook(async (app, restartOptions) => {
    t.assert.strictEqual(app.restarted, true)
    t.assert.deepStrictEqual(restartOptions, expectedRestartOptions)
  })

  await app.restart(expectedRestartOptions)
})

test('should not fail onRestartHook throw an error', async (t) => {
  t.plan(3)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
    await app.close()
  })

  const expectedRestartOptions = { foo: 'bar' }

  app.addOnRestartHook(async () => {
    throw new Error('kaboom')
  })

  app.addOnRestartHook(async (app, restartOptions) => {
    t.assert.strictEqual(app.restarted, true)
    t.assert.deepStrictEqual(restartOptions, expectedRestartOptions)
  })

  await app.restart(expectedRestartOptions)

  t.assert.strictEqual(app.restarted, true)
})

test('should throw if onRestartHook is not a function', async (t) => {
  t.plan(1)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
    await app.close()
  })

  t.assert.throws(() => {
    app.addOnRestartHook('not a function')
  }, { message: 'The hook must be a function' })
})

test('should not throw if onRestartHook is a sync function', async (t) => {
  t.plan(3)

  async function createApplication (fastify, opts) {
    return fastify(opts)
  }

  const app = await restartable(createApplication, {
    keepAliveTimeout: 1
  })

  t.after(async () => {
    await app.close()
  })

  const expectedRestartOptions = { foo: 'bar' }

  app.addOnRestartHook((app, restartOptions) => {
    t.assert.strictEqual(app.restarted, true)
    t.assert.deepStrictEqual(restartOptions, expectedRestartOptions)
  })

  await app.restart(expectedRestartOptions)

  t.assert.strictEqual(app.restarted, true)
})
