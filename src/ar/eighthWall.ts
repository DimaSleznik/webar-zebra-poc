import * as THREE from 'three'
import { raycastFloor, type ArAdapter, type TrackingState } from './types'

// XR8 — закрытый бинарь без типов
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    XR8?: any
    THREE?: typeof THREE
  }
}

const LOAD_TIMEOUT_MS = 20000

function loadEngine(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.XR8) return resolve(window.XR8)
    const timer = setTimeout(() => reject(new Error('8th Wall: таймаут загрузки движка')), LOAD_TIMEOUT_MS)
    window.addEventListener('xrloaded', () => (clearTimeout(timer), resolve(window.XR8)), { once: true })
    const s = document.createElement('script')
    s.src = `${import.meta.env.BASE_URL}xr/xr.js`
    s.async = true
    s.dataset.preloadChunks = 'slam'
    s.onerror = () => (clearTimeout(timer), reject(new Error('8th Wall: xr.js не загрузился')))
    document.head.appendChild(s)
  })
}

/** Запускать из обработчика тапа: iOS даёт запросить датчики движения только по жесту. */
export async function startEighthWall(canvas: HTMLCanvasElement): Promise<ArAdapter> {
  // XR8.Threejs.pipelineModule() берёт three из window.THREE
  window.THREE = THREE
  const XR8 = await loadEngine()

  return new Promise<ArAdapter>((resolve, reject) => {
    const frameCbs: Array<(dt: number) => void> = []
    const trackingCbs: Array<(s: TrackingState) => void> = []
    let adapter: ArAdapter | null = null
    let last = performance.now()

    const setTracking = (s: TrackingState) => {
      if (!adapter || adapter.trackingState === s) return
      adapter.trackingState = s
      trackingCbs.forEach((cb) => cb(s))
    }

    // Аналог XRExtras.FullWindowCanvas: буфер канваса = окно × dpr.
    // Движок сам замечает смену размера и шлёт onCanvasSizeChange остальным модулям.
    const fitCanvas = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const w = Math.round(innerWidth * dpr)
      const h = Math.round(innerHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    fitCanvas()
    addEventListener('resize', fitCanvas)
    addEventListener('orientationchange', () => setTimeout(fitCanvas, 300))

    XR8.XrController.configure({ scale: 'responsive' })
    XR8.addCameraPipelineModules([
      { name: 'poc-fullwindow', onStart: fitCanvas, onUpdate: fitCanvas },
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
      {
        name: 'poc-game',
        onStart: () => {
          const { scene, camera, renderer } = XR8.Threejs.xrScene()
          // Высота камеры над поверхностью в условных единицах; поверхность — y=0
          camera.position.set(0, 2, 2)
          XR8.XrController.updateCameraProjectionMatrix({
            origin: camera.position,
            facing: camera.quaternion,
          })
          adapter = {
            scene,
            camera,
            renderer,
            trackingState: 'initializing',
            hitTestFloor: (x, y) => raycastFloor(camera, x, y),
            onFrame: (cb) => frameCbs.push(cb),
            onTracking: (cb) => trackingCbs.push(cb),
          }
          resolve(adapter)
        },
        onUpdate: () => {
          const now = performance.now()
          const dt = Math.min((now - last) / 1000, 0.1)
          last = now
          frameCbs.forEach((cb) => cb(dt))
        },
        onCameraStatusChange: ({ status }: { status: string }) => {
          if (status === 'failed') reject(new Error('Нет доступа к камере'))
        },
        onException: (e: unknown) => console.error('[XR8]', e),
        listeners: [
          {
            event: 'reality.trackingstatus',
            process: ({ detail }: { detail: { status: string } }) =>
              setTracking(detail.status === 'NORMAL' ? 'normal' : 'limited'),
          },
        ],
      },
    ])

    try {
      XR8.run({ canvas, allowedDevices: XR8.XrConfig.device().MOBILE })
    } catch (e) {
      reject(e)
    }
  })
}
