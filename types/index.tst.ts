import { fastify, type FastifyInstance, type FastifyServerOptions } from 'fastify'
import { restartable, type ApplicationFactory } from './index'
import type { Http2Server } from 'node:http2'
import { expect } from 'tstyche'

type Fastify = typeof fastify

async function createApplication (
  fastify: Fastify,
  opts: FastifyServerOptions,
  restartOpts?: unknown
): Promise<FastifyInstance> {
  const app = fastify(opts)

  expect(app).type.toBeAssignableTo<FastifyInstance>()
  expect(restartOpts).type.toBeAssignableTo<unknown>()

  expect(app.restarted).type.toBe<boolean>()
  expect(app.restart).type.toBe<(restartOpts?: unknown) => Promise<void>>()

  return app
}

expect(createApplication).type.toBeAssignableTo<ApplicationFactory>();

(async () => {
  {
    const app = await restartable(createApplication)
    expect(app).type.toBe<FastifyInstance>()
    expect(app.restarted).type.toBe<boolean>()
    expect(app.closingRestartable).type.toBe<boolean>()
    expect(app.restart).type.toBe<(restartOpts?: unknown) => Promise<void>>()
  }

  {
    const app = await restartable(createApplication, { logger: true })
    expect(app).type.toBe<FastifyInstance>()
    expect(app.restarted).type.toBe<boolean>()
    expect(app.closingRestartable).type.toBe<boolean>()
    expect(app.restart).type.toBe<(restartOpts?: unknown) => Promise<void>>()
  }

  {
    const app = await restartable(createApplication, { logger: true }, fastify)
    expect(app).type.toBe<FastifyInstance>()
    expect(app.restarted).type.toBe<boolean>()
    expect(app.closingRestartable).type.toBe<boolean>()
    expect(app.restart).type.toBe<(restartOpts?: unknown) => Promise<void>>()
  }

  {
    const app = await restartable(
      async (factory, opts) => await factory(opts),
      { http2: true },
      fastify
    )
    expect(app).type.toBe<FastifyInstance<Http2Server>>()
    expect(app.restarted).type.toBe<boolean>()
    expect(app.closingRestartable).type.toBe<boolean>()
    expect(app.restart).type.toBe<(restartOpts?: unknown) => Promise<void>>()
  }

  {
    const app = await restartable(createApplication, { logger: true }, fastify)
    expect(
      app.addPreRestartHook(async (_instance: FastifyInstance, _restartOpts: unknown) => {})
    ).type.toBe<void>()

    expect(
      app.addOnRestartHook(async (_instance: FastifyInstance, _restartOpts: unknown) => {})
    ).type.toBe<void>()
  }
})()
