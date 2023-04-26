import { fastify, FastifyInstance, FastifyServerOptions } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    restart: (restartOpts?: unknown) => Promise<void>,
    restarted: boolean
  }
}

type Fastify = typeof fastify;

export type ApplicationFactory = (fastify: Fastify, opts: FastifyServerOptions, restartOpts?: unknown) => Promise<FastifyInstance>

export declare function restartable(factory: ApplicationFactory, opts?: FastifyServerOptions, fastify?: Fastify): Promise<FastifyInstance>
