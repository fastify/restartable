import { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { expectAssignable, expectType, expectError } from 'tsd'
import { FastifyRestartableOptions, start } from '..'

const myApp = async (app: FastifyInstance, opts: FastifyRestartableOptions) => {
  app.get('/', async () => {
    expectType<() => Promise<void>>(app.restart)
    return { hello: 'world' }
  })
}

const _badProtocol = {
  port: 4001,
  app: myApp,
  protocol: 'ftp',
}
expectError(start(_badProtocol))

const _missingAppOpt = {
  port: 4001,
}
expectError(start(_missingAppOpt))

const _opts = {
  port: 4001,
  app: myApp,
  ignoreTrailingSlash: true,
}

expectAssignable<FastifyRestartableOptions>(_opts)

const restartable = await start(_opts)

expectType<string>(restartable.address)
expectType<number>(restartable.port)
expectType<FastifyInstance>(restartable.app)
expectType<Promise<void>>(restartable.restart())
expectType<Promise<LightMyRequestResponse>>(restartable.inject('/'))
expectType<Promise<{ address: string; port: number }>>(restartable.listen())
expectType<Promise<void>>(restartable.stop())
