# @fastify/restartable

Restart Fastify without losing a request.

This module is useful if you want to compose the
fastify routes dynamically or you need some remote
config. In case of a change, you can restart Fastify.

## Install

```bash
npm i @fastify/restartable
```

## Usage

```js
import { start } from '@fastify/restartable'

async function myApp (app, opts) {
  // opts are the options passed to start()
  console.log('plugin loaded', opts)

  app.get('/restart', async (req, reply) => {
    await app.restart()
    return { status: 'ok' }
  })
}

const { stop, restart, listen, inject } = await start({
  protocol: 'http', // or 'https'
  // key: ...,
  // cert: ...,
  // add all other options that you would pass to fastify
  hostname: '127.0.0.1',
  port: 3000,
  app: myApp
})

const { address, port } = await listen()

console.log('server listening on', address, port)
// call restart() if you want to restart
// call restart(newOpts) if you want to restart Fastify with new options
// you can't change all the protocol details.

// call inject() to inject a request, see Fastify docs
```

## License

MIT
