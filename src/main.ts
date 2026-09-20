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
const mode = new URLSearchParams(location.search).get('ar') ?? '8w'

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
    const ar: ArAdapter = mode === 'mock' ? startMock(canvas) : await startEighthWall(canvas)
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
    const p = ar.hitTestFloor(e.clientX, e.clientY)
    if (!p) return
    game.placeAt(p)
    hint.textContent = ''
  })
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
