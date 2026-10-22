import { Application, Router } from 'express'

export function registerStartupMobileYandexNetRouter (app: Application): void {
  const router = Router()

  router.get('/analytics/startup', (_, response) => {
    response.status(500).end()
  })

  app.use('/startup.mobile.yandex.net', router)
}
