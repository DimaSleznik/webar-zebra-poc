import * as THREE from 'three'

export interface SurfaceHit {
  point: THREE.Vector3
  kind: 'points' | 'plane'
}

export type TrackingState = 'initializing' | 'limited' | 'normal'

/** Тонкий AR-адаптер (п. 4.1.5 общего решения): игра не знает, кто даёт камеру и трекинг. */
export interface ArAdapter {
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  trackingState: TrackingState
  /**
   * Точка поверхности под экранной точкой (px). 'points' — реальная геометрия
   * (feature points SLAM), 'plane' — запасная условная плоскость y=0. null — мимо.
   */
  hitTestFloor(clientX: number, clientY: number): SurfaceHit | null
  /** Колбэк на каждый кадр, dt в секундах. */
  onFrame(cb: (dt: number) => void): void
  onTracking(cb: (s: TrackingState) => void): void
}

const raycaster = new THREE.Raycaster()
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

export function raycastFloor(camera: THREE.Camera, clientX: number, clientY: number): SurfaceHit | null {
  const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  const point = raycaster.ray.intersectPlane(floor, new THREE.Vector3())
  return point && { point, kind: 'plane' }
}
