import {
  FastifyInstance,
  FastifyServerOptions,
  InjectOptions,
  LightMyRequestResponse,
} from 'fastify'

export type FastifyRestartableOptions = FastifyServerOptions & {
  port: number
  hostname?: string
  protocol?: 'http' | 'https'
  key?: string
  cert?: string
  app: (app: FastifyInstance, opts: FastifyRestartableOptions) => Promise<void>
}

export const start: (otps: FastifyRestartableOptions) => Promise<{
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
