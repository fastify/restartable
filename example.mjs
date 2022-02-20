import { start } from './index.js'

async function myApp (app, opts) {
  console.log('plugin loaded')

  app.get('/restart', async (req, reply) => {
    await app.restart()
    return { status: 'ok' }
  })
}

const { stop, port, restart, address } = await start({
  port: 3000,
  app: myApp
})

console.log('server listening on', address, port)

// call restart() if you want to restart
process.on('SIGUSR1', () => {
  console.log('Restarting the server')
  restart()
})

process.once('SIGINT', () => {
  console.log('Stopping the server')
  stop()
})
