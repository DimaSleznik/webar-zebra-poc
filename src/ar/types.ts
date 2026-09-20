import * as THREE from 'three'

export type TrackingState = 'initializing' | 'limited' | 'normal'

/** Тонкий AR-адаптер (п. 4.1.5 общего решения): игра не знает, кто даёт камеру и трекинг. */
export interface ArAdapter {
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  trackingState: TrackingState
  /** Реальные точки поверхности (feature points SLAM) под экранной точкой (px). Пусто — точек нет. */
  hitTestPoints(clientX: number, clientY: number): THREE.Vector3[]
  /** Диагностика PoC: какие типы hit-test реально отдаёт движок в центре экрана. */
  probeHitTypes?(): string
  /** Колбэк на каждый кадр, dt в секундах. */
  onFrame(cb: (dt: number) => void): void
  onTracking(cb: (s: TrackingState) => void): void
}

const raycaster = new THREE.Raycaster()
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

export function raycastFloor(camera: THREE.Camera, clientX: number, clientY: number): THREE.Vector3 | null {
  const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  return raycaster.ray.intersectPlane(floor, new THREE.Vector3())
}
