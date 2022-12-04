import {
  FastifyInstance,
  FastifyServerOptions,
  InjectOptions,
  LightMyRequestResponse,
} from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    restart: () => Promise<void>
  }
}

type FastifyRestartable = (opts: start.FastifyRestartableOptions) => Promise<{
  app: FastifyInstance
  address: string
  port: number
  restart: () => Promise<void>
  listen: () => Promise<{
    address: string
    port: number
  }>
  stop: () => Promise<void>
  inject: (opts: InjectOptions | string) => Promise<LightMyRequestResponse>
}>

declare namespace start {
  export type FastifyRestartableOptions = FastifyServerOptions & {
    port: number
    hostname?: string
    protocol?: 'http' | 'https'
    key?: string
    cert?: string
    app: (app: FastifyInstance, opts: FastifyRestartableOptions) => Promise<void>
  }
  
  export const start: FastifyRestartable
  export { start as default }
}

declare function start(...params: Parameters<FastifyRestartable>): ReturnType<FastifyRestartable>
export = start
