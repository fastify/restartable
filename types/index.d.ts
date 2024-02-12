import { fastify, FastifyInstance } from "fastify";

import type {
  FastifyBaseLogger,
  FastifyHttp2Options,
  FastifyHttp2SecureOptions,
  FastifyHttpOptions,
  FastifyHttpsOptions,
  FastifyServerOptions,
  FastifyTypeProvider,
  FastifyTypeProviderDefault,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
} from "fastify";
import * as http from "http";
import * as http2 from "http2";
import * as https from "https";

export type RestartHook = (
  instance: FastifyInstance,
  restartOpts?: unknown
) => Promise<unknown>;

declare module "fastify" {
  interface FastifyInstance {
    restart: (restartOpts?: unknown) => Promise<void>;
    addPreRestartHook: (fn: RestartHook) => void;
    addOnRestartHook: (fn: RestartHook) => void;
    restarted: boolean;
    closingRestartable: boolean;
  }
}

type Fastify = typeof fastify;

export type ApplicationFactory<
  Server extends
    | RawServerBase
    | http.Server
    | https.Server
    | http2.Http2Server
    | http2.Http2SecureServer = RawServerDefault,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = (
  fastify: Fastify,
  opts: Server extends infer S
    ? S extends http2.Http2SecureServer
      ? FastifyHttp2SecureOptions<S, Logger>
      : S extends http2.Http2Server
      ? FastifyHttp2Options<S, Logger>
      : S extends https.Server
      ? FastifyHttpsOptions<S, Logger>
      : S extends http.Server
      ? FastifyHttpOptions<S, Logger>
      : FastifyServerOptions<Server>
    : FastifyServerOptions<Server>,
  restartOpts?: unknown
) => Promise<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>;

// These overloads follow the same overloads for the fastify factory

export declare function restartable<
  Server extends http2.Http2SecureServer,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
>(
  factory: ApplicationFactory<Server, Request, Reply, Logger, TypeProvider>,
  opts?: FastifyHttp2SecureOptions<Server, Logger>,
  fastify?: Fastify
): Promise<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>;

export declare function restartable<
  Server extends http2.Http2Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
>(
  factory: ApplicationFactory<Server, Request, Reply, Logger, TypeProvider>,
  opts?: FastifyHttp2Options<Server, Logger>,
  fastify?: Fastify
): Promise<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>;

export declare function restartable<
  Server extends https.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
>(
  factory: ApplicationFactory<Server, Request, Reply, Logger, TypeProvider>,
  opts?: FastifyHttpsOptions<Server, Logger>,
  fastify?: Fastify
): Promise<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>;

export declare function restartable<
  Server extends http.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
>(
  factory: ApplicationFactory<Server, Request, Reply, Logger, TypeProvider>,
  opts?: FastifyHttpOptions<Server, Logger>,
  fastify?: Fastify
): Promise<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>;
