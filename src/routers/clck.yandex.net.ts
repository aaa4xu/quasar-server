import { Application, Router } from 'express'

export function registerClckYandexNetRouter (app: Application): void {
  const router = Router()

  router.post('/quasar_metrics/write/batch', (_, response) => {
    response.status(500).end()
  })

  router.post('/quasar_metrics/write/json/batch', (_, response) => {
    response.status(500).end()
  })

  router.post('/quasar/write/json/batch', (_, response) => {
    response.status(500).end()
  })

  router.get('/generate_204', (_, response) => {
    response.status(204).end()
  })

  router.get('/gen_204', (_, response) => {
    response.status(204).end()
  })

  app.use('/clck.yandex.net', router)
}
