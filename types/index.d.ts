import { fastify, FastifyInstance, FastifyServerOptions } from 'fastify'

export type RestartHook = (instance: FastifyInstance, restartOpts?: unknown) => Promise<unknown>

declare module 'fastify' {
  interface FastifyInstance {
    restart: (restartOpts?: unknown) => Promise<void>,
    addPreRestartHook: (fn: RestartHook) => void,
    addOnRestartHook: (fn: RestartHook) => void,
    restarted: boolean
    closingRestartable: boolean
  }
}

type Fastify = typeof fastify;

export type ApplicationFactory = (fastify: Fastify, opts: FastifyServerOptions, restartOpts?: unknown) => Promise<FastifyInstance>

export declare function restartable(factory: ApplicationFactory, opts?: FastifyServerOptions, fastify?: Fastify): Promise<FastifyInstance>
