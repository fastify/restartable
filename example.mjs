import { restartable } from './index.js'

async function createApp (fastify, opts) {
  const app = fastify(opts)

  app.get('/restart', async () => {
    await app.restart()
    return { status: 'ok' }
  })

  return app
}

const app = await restartable(createApp, { logger: true })
const host = await app.listen({ port: 3000 })

console.log('server listening on', host)

// call restart() if you want to restart
process.on('SIGUSR1', () => {
  console.log('Restarting the server')
  app.restart()
})

process.once('SIGINT', () => {
  console.log('Stopping the server')
  app.close()
})
