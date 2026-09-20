import { startEighthWall } from './ar/eighthWall'
import { startMock } from './ar/mock'
import type { ArAdapter, TrackingState } from './ar/types'
import { createGame } from './game'
import { createJoystick } from './joystick'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const canvas = $<HTMLCanvasElement>('ar-canvas')
const splash = $('splash')
const splashStatus = $('splash-status')
const startBtn = $<HTMLButtonElement>('start-btn')
const hud = $('hud')
const hint = $('hint')
const scoreEl = $('score')
const trackingEl = $('tracking')
const win = $('win')
const scale = $<HTMLInputElement>('scale')

// ?ar=mock — режим для ПК; по умолчанию 8th Wall SLAM
const params = new URLSearchParams(location.search)
const mode = params.get('ar') ?? '8w'
// ?scale=absolute — метрический масштаб 8th Wall (1 ед. = 1 м); трекинг стартует после движения телефоном
const arScale = params.get('scale') === 'absolute' ? 'absolute' : 'responsive'

const TRACKING_TEXT: Record<TrackingState, string> = {
  initializing: 'Трекинг: запуск…',
  limited: 'Трекинг: поводите телефоном',
  normal: '',
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true
  splashStatus.textContent = 'Загрузка движка и камеры…'
  try {
    const t0 = performance.now()
    const ar: ArAdapter = mode === 'mock' ? startMock(canvas) : await startEighthWall(canvas, arScale)
    console.info(`[poc] AR (${mode}) готов за ${Math.round(performance.now() - t0)} мс`)
    await run(ar)
  } catch (e) {
    console.error(e)
    splashStatus.textContent = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
    startBtn.disabled = false
  }
})

async function run(ar: ArAdapter) {
  const stick = createJoystick($('joystick'), $('stick'))
  const game = await createGame(ar, stick, {
    onScore: (s, total) => (scoreEl.textContent = `🪙 ${s} / ${total}`),
    onWin: () => (win.hidden = false),
  })

  const showTracking = (s: TrackingState) => (trackingEl.textContent = TRACKING_TEXT[s])
  showTracking(ar.trackingState)
  ar.onTracking(showTracking)

  const askPlace = () => {
    game.unplace()
    win.hidden = true
    hint.textContent = 'Наведите на стол и тапните'
  }

  canvas.addEventListener('click', (e) => {
    if (game.placed) return
    const hit = ar.hitTestFloor(e.clientX, e.clientY)
    if (!hit) return
    game.placeAt(hit.point)
    hint.textContent = hit.kind === 'points' ? 'Поставлено по точкам поверхности' : 'Поставлено по условной плоскости'
    setTimeout(() => game.placed && (hint.textContent = ''), 2500)
  })
  const about = $<HTMLDialogElement>('about')
  $('about-btn').addEventListener('click', () => about.showModal())
  $('about-close').addEventListener('click', () => about.close())
  // В метрическом режиме персонаж ростом 1 ед. = 1 м, поэтому по умолчанию 15 см
  if (arScale === 'absolute' && mode !== 'mock') scale.value = '0.15'
  $('replace-btn').addEventListener('click', askPlace)
  $('again-btn').addEventListener('click', () => {
    win.hidden = true
    game.reset()
  })
  scale.addEventListener('input', () => game.setScale(+scale.value))
  game.setScale(+scale.value)

  splash.hidden = true
  splash.style.display = 'none'
  hud.hidden = false
  askPlace()
}
