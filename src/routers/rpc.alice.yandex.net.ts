import { Application, Router } from 'express'

export function registerRpcAliceYandexNetRouter (app: Application): void {
  const router = Router()

  router.post('/gproxy/push_events_batch', (_, response) => {
    response.status(200).header({
      'content-type': 'application/x-protobuf'
    }).end()
  })

  app.use('/rpc.alice.yandex.net', router)
}
