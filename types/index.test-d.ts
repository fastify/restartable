import { fastify, FastifyInstance, FastifyServerOptions } from 'fastify'
import { expectAssignable, expectType } from 'tsd'
import { restartable, ApplicationFactory } from './index'

type Fastify = typeof fastify

async function createApplication (
  fastify: Fastify,
  opts: FastifyServerOptions,
  restartOpts?: unknown
): Promise<FastifyInstance> {
  const app = fastify(opts)

  expectAssignable<FastifyInstance>(app)
  expectAssignable<unknown>(restartOpts)

  expectType<boolean>(app.restarted)
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart)

  return app
}

expectType<ApplicationFactory>(createApplication)

{
  const app = await restartable(createApplication)
  expectType<FastifyInstance>(app)
  expectType<boolean>(app.restarted)
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart)
}

{
  const app = await restartable(createApplication, { logger: true })
  expectType<FastifyInstance>(app)
  expectType<boolean>(app.restarted)
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart)
}

{
  const app = await restartable(createApplication, { logger: true }, fastify)
  expectType<FastifyInstance>(app)
  expectType<boolean>(app.restarted)
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart)
}

{
  const app = await restartable(createApplication, { logger: true }, fastify)
  app.addPreRestartHook(async (instance: FastifyInstance, restartOpts: unknown) => {})
  app.addOnRestartHook(async (instance: FastifyInstance, restartOpts: unknown) => {})
}
