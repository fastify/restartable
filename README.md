# @fastify/restartable

Restart Fastify without losing a request.

## Install

```bash
npm i @fastify/restartable
```

## Usage

```js
import { start } from '@fastify/restartable'

async function myApp (app, opts) {
  console.log('plugin loaded')

  app.get('/restart', async (req, reply) => {
    await app.restart()
    return { status: 'ok' }
  })
}

const { stop, port, restart, address } = await start({
  protocol: 'http', // or 'https'
  // key: ...,
  // cert: ...,
  // add all other options that you would pass to fastify
  host: '127.0.0.1',
  port: 3000,
  app: myApp
})

console.log('server listening on', address, port)
// call restart() if you want to restart
```

## License

MIT
