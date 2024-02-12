import { fastify, FastifyInstance, FastifyServerOptions } from "fastify";
import { expectAssignable, expectType } from "tsd";
import { restartable, ApplicationFactory } from "./index";
import type { Http2Server } from "http2";

type Fastify = typeof fastify;

async function createApplication(
  fastify: Fastify,
  opts: FastifyServerOptions,
  restartOpts?: unknown
): Promise<FastifyInstance> {
  const app = fastify(opts);

  expectAssignable<FastifyInstance>(app);
  expectAssignable<unknown>(restartOpts);

  expectType<boolean>(app.restarted);
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart);

  return app;
}

// This currently fails with:
// --------------------------
// Parameter type ApplicationFactory is not identical to argument type
// (fastify: typeof import("/Users/denchen/git/restartable/node_modules/fastify/fastify.d.ts"),
// opts: FastifyServerOptions, restartOpts?: unknown)
// => Promise<FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<...>,
// FastifyBaseLogger, FastifyTypeProviderDefault>>
// expectType<ApplicationFactory>(createApplication);

{
  const app = await restartable(createApplication);
  expectType<FastifyInstance>(app);
  expectType<boolean>(app.restarted);
  expectType<boolean>(app.closingRestartable);
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart);
}

{
  const app = await restartable(createApplication, { logger: true });
  expectType<FastifyInstance>(app);
  expectType<boolean>(app.restarted);
  expectType<boolean>(app.closingRestartable);
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart);
}

{
  const app = await restartable(createApplication, { logger: true }, fastify);
  expectType<FastifyInstance>(app);
  expectType<boolean>(app.restarted);
  expectType<boolean>(app.closingRestartable);
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart);
}

{
  const app = await restartable(
    async (factory, opts) => await factory(opts),
    { http2: true },
    fastify
  );
  expectType<FastifyInstance<Http2Server>>(app);
  expectType<boolean>(app.restarted);
  expectType<boolean>(app.closingRestartable);
  expectType<(restartOpts?: unknown) => Promise<void>>(app.restart);
}

{
  const app = await restartable(createApplication, { logger: true }, fastify);
  app.addPreRestartHook(
    async (instance: FastifyInstance, restartOpts: unknown) => {}
  );
  app.addOnRestartHook(
    async (instance: FastifyInstance, restartOpts: unknown) => {}
  );
}
