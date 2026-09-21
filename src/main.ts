import { startEighthWall } from './ar/eighthWall'
import { startMock } from './ar/mock'
import type { ArAdapter, TrackingState } from './ar/types'
import { createGame } from './game'
import { createJoystick } from './joystick'
import { createSurfaceReticle } from './surface'

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
  try {
    // iOS: датчики запрашиваем сами и первым же вызовом, пока жив жест тапа.
    // Иначе 8th Wall после загрузки покажет свой английский промпт «AR requires access…».
    const dme = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
    if (mode !== 'mock' && typeof dme?.requestPermission === 'function') {
      if ((await dme.requestPermission()) !== 'granted') {
        throw new Error('нет доступа к датчикам движения. Разрешите его и обновите страницу')
      }
    }
    splashStatus.textContent = 'Загрузка движка и камеры…'
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

  const surface = createSurfaceReticle(ar)
  const askPlace = () => {
    game.unplace()
    win.hidden = true
    surface.setActive(true)
  }
  // Пока персонаж не поставлен, подсказка показывает, найдена ли реальная поверхность
  let probeFrame = 0
  ar.onFrame(() => {
    if (game.placed) return
    if (ar.probeHitTypes && probeFrame++ % 30 === 0) trackingEl.textContent = ar.probeHitTypes()
    hint.textContent =
      surface.kind === 'points'
        ? `Поверхность найдена (точек: ${surface.samples}) — тапните`
        : 'Поводите телефоном над столом…'
  })

  canvas.addEventListener('click', () => {
    if (game.placed) return
    const p = surface.point
    if (!p) return
    console.info(`[poc] размещение: ${surface.kind}, выборка ${surface.samples}, y=${p.y.toFixed(3)}`)
    game.placeAt(p)
    surface.setActive(false)
    hint.textContent = surface.kind === 'points' ? '' : 'Поставлено без точек поверхности — высота может не совпасть'
    setTimeout(() => game.placed && (hint.textContent = ''), 3000)
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
  const applyScale = () => {
    game.setScale(+scale.value)
    surface.setRadius(+scale.value * 0.5)
  }
  scale.addEventListener('input', applyScale)
  applyScale()

  splash.hidden = true
  splash.style.display = 'none'
  hud.hidden = false
  askPlace()
}
